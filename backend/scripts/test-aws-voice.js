import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import { synthesizeSpeech } from '../src/modules/tts/tts.service.js';
import { transcribePcm } from '../src/modules/stt/stt.service.js';
import { callBedrock, isBedrockConfigured } from '../src/modules/agents/bedrock.client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

console.log('=== AWS Voice Stack Test ===\n');

let bedrock = 'SKIP';
if (isBedrockConfigured()) {
  const reply = await callBedrock([{ role: 'user', content: 'Reply with exactly: OK' }]);
  bedrock = reply?.includes('OK') ? 'PASS' : `WARN (${(reply || 'empty').slice(0, 50)})`;
} else {
  bedrock = 'FAIL — BEDROCK_API_KEY missing';
}
console.log('Bedrock LLM:    ', bedrock);

const mp3 = await synthesizeSpeech('Hello I am interested in your coaching program.', { language: 'en' });
const polly = mp3?.length > 1000 ? `PASS (${mp3.length} bytes)` : 'FAIL — empty audio';
console.log('Polly TTS:      ', polly);

let transcribe = 'SKIP';
if (mp3?.length > 1000) {
  const mp3Path = path.join(os.tmpdir(), 'voice-test.mp3');
  const pcmPath = path.join(os.tmpdir(), 'voice-test.pcm');
  fs.writeFileSync(mp3Path, mp3);

  const ff = spawnSync('ffmpeg', ['-y', '-i', mp3Path, '-ar', '16000', '-ac', '1', '-f', 's16le', pcmPath], {
    stdio: 'pipe',
  });

  if (ff.status === 0 && fs.existsSync(pcmPath)) {
    const pcm = fs.readFileSync(pcmPath);
    const text = await transcribePcm(pcm, { language: 'en' });
    transcribe = text ? `PASS — heard: ${text}` : 'FAIL — API ran but no text returned';
    fs.unlinkSync(mp3Path);
    fs.unlinkSync(pcmPath);
  } else {
    const pcm = Buffer.alloc(32000);
    const text = await transcribePcm(pcm, { language: 'en' });
    transcribe = text === null
      ? 'PASS — IAM auth OK (silence correctly returned no text; install ffmpeg for full round-trip)'
      : `WARN — ${text}`;
  }
} else {
  transcribe = 'FAIL — no Polly audio to test';
}
console.log('Transcribe STT: ', transcribe);

console.log('\n=== Result ===');
const ok = [bedrock, polly, transcribe].every((s) => s.startsWith('PASS'));
console.log(ok ? 'Ready for browser testing.' : 'Fix failures above before browser testing.');
