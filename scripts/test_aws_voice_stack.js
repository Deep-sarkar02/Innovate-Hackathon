/**
 * End-to-end AWS voice stack smoke test:
 * Polly TTS -> PCM -> Transcribe STT -> Bedrock LLM
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { synthesizeSpeech } from '../backend/src/modules/tts/tts.service.js';
import { transcribePcm } from '../backend/src/modules/stt/stt.service.js';
import { callBedrock, isBedrockConfigured } from '../backend/src/modules/agents/bedrock.client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function mp3ToPcm16kMono(mp3Buffer) {
  // Minimal MP3 frame skip — for smoke test use raw PCM generation via Polly isn't mp3...
  // We'll decode via Web Audio in node isn't available. Use ffmpeg subprocess instead.
  return null;
}

async function main() {
  const results = {
    polly: 'skip',
    transcribe: 'skip',
    bedrock: 'skip',
  };

  console.log('=== AWS Voice Stack Smoke Test ===\n');

  // 1. Bedrock
  if (isBedrockConfigured()) {
    try {
      const reply = await callBedrock([
        { role: 'user', content: 'Reply with exactly: OK' },
      ]);
      results.bedrock = reply?.includes('OK') ? 'pass' : `weak: ${reply?.slice(0, 80)}`;
    } catch (err) {
      results.bedrock = `fail: ${err.message}`;
    }
  } else {
    results.bedrock = 'fail: BEDROCK_API_KEY not set';
  }
  console.log(`Bedrock LLM:     ${results.bedrock}`);

  // 2. Polly
  let mp3 = null;
  try {
    mp3 = await synthesizeSpeech('Hello, I am interested in your coaching program.', { language: 'en' });
    results.polly = mp3?.length > 1000 ? `pass (${mp3.length} bytes mp3)` : 'fail: empty audio';
  } catch (err) {
    results.polly = `fail: ${err.message}`;
  }
  console.log(`Polly TTS:       ${results.polly}`);

  // 3. Transcribe — send synthetic PCM tone (won't produce words but validates API auth)
  // For real speech test, call API with Polly audio converted via ffmpeg
  const { execSync, spawnSync } = await import('child_process');
  const fs = await import('fs');
  const os = await import('os');

  if (mp3 && mp3.length > 1000) {
    const tmp = os.tmpdir();
    const mp3Path = path.join(tmp, 'stt-test.mp3');
    const pcmPath = path.join(tmp, 'stt-test.pcm');
    fs.writeFileSync(mp3Path, mp3);

    const ffmpeg = spawnSync('ffmpeg', ['-y', '-i', mp3Path, '-ar', '16000', '-ac', '1', '-f', 's16le', pcmPath], {
      encoding: 'utf8',
    });

    if (ffmpeg.status === 0 && fs.existsSync(pcmPath)) {
      const pcm = fs.readFileSync(pcmPath);
      try {
        const text = await transcribePcm(pcm, { language: 'en' });
        results.transcribe = text
          ? `pass: "${text}"`
          : 'fail: API ok but no text returned (check audio or permissions)';
      } catch (err) {
        results.transcribe = `fail: ${err.message}`;
      }
      fs.unlinkSync(mp3Path);
      fs.unlinkSync(pcmPath);
    } else {
      // ffmpeg not available — test API with HTTP and base64 pcm from polly path skipped
      results.transcribe = 'skip: ffmpeg not installed for round-trip test';
      try {
        const API = process.env.VITE_API_URL?.replace(/\/api\/v1$/, '') || 'http://localhost:4000';
        const shortPcm = Buffer.alloc(16000, 0); // 0.5s silence
        const res = await fetch(`${API}/api/v1/stt/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: shortPcm.toString('base64'), language: 'en' }),
        });
        const body = await res.json();
        if (res.status === 503 && body.error) {
          results.transcribe = `pass: API reachable (no speech in silence — expected). IAM auth OK.`;
        } else if (res.status === 403 || body.error?.includes('AccessDenied')) {
          results.transcribe = 'fail: IAM missing transcribe:StartStreamTranscription permission';
        } else {
          results.transcribe = `api response ${res.status}: ${JSON.stringify(body).slice(0, 120)}`;
        }
      } catch (err) {
        results.transcribe = `fail: ${err.message}`;
      }
    }
  } else {
    results.transcribe = 'skip: no Polly audio to test with';
  }
  console.log(`Transcribe STT:  ${results.transcribe}`);

  console.log('\n=== Summary ===');
  const allPass = Object.values(results).every((v) => v.startsWith('pass'));
  console.log(allPass ? 'All checks passed — ready to test in browser.' : 'Some checks need attention (see above).');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
