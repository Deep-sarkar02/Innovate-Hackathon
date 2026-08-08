import { pcmToWav } from '../../utils/pcmToWav.js';
import { sarvamFetch, isSarvamConfigured } from './sarvam.client.js';

const LANGUAGE_CODES = {
  en: 'en-IN',
  hi: 'hi-IN',
};

// Sarvam REST STT rejects clips longer than 30s — stay under that limit.
const MAX_PCM_BYTES = 16000 * 2 * 28;

export async function transcribeSarvamPcm(
  pcmBuffer,
  { language = 'en', sampleRate = 16000 } = {}
) {
  if (!isSarvamConfigured() || !pcmBuffer?.length) return null;
  if (pcmBuffer.length < 6400) return null;

  const trimmed = pcmBuffer.length > MAX_PCM_BYTES
    ? pcmBuffer.subarray(0, MAX_PCM_BYTES)
    : pcmBuffer;

  const languageCode = LANGUAGE_CODES[language] ?? LANGUAGE_CODES.en;
  const wavBuffer = pcmToWav(trimmed, sampleRate);

  try {
    const form = new FormData();
    form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'utterance.wav');
    form.append('model', 'saaras:v4');
    form.append('mode', 'transcribe');
    form.append('language_code', languageCode);

    const response = await sarvamFetch('/speech-to-text', {
      method: 'POST',
      body: form,
    });

    const payload = await response.json();
    const transcript = payload?.transcript?.trim();
    return transcript || null;
  } catch (err) {
    if (err.message.includes('maximum limit of 30 seconds')) {
      console.warn('[sarvam] STT clip too long — trim utterances under 28s');
    } else {
      console.warn('[sarvam] STT failed:', err.message);
    }
    return null;
  }
}

export { isSarvamConfigured };
