import { sanitizeForSpeech } from '../../utils/speechText.js';
import { sarvamFetch, isSarvamConfigured } from './sarvam.client.js';
import { resolveSarvamVoice } from './sarvam.voices.js';

export async function synthesizeSarvamSpeech(
  text,
  { language = 'en', voiceGender = 'female', persona = 'father' } = {}
) {
  const spoken = sanitizeForSpeech(text);
  if (!isSarvamConfigured() || !spoken) return null;

  const voice = resolveSarvamVoice(language, voiceGender, persona);

  try {
    const response = await sarvamFetch('/text-to-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: spoken.slice(0, 2500),
        language_code: voice.languageCode,
        speaker: voice.speaker,
        model: 'bulbul:v3',
        output_audio_codec: 'mp3',
        speech_sample_rate: 24000,
        pace: 1,
      }),
    });

    const payload = await response.json();
    const encoded = payload?.audios?.[0];
    if (!encoded) return null;

    return {
      audio: Buffer.from(encoded, 'base64'),
      contentType: 'audio/mpeg',
      voice,
    };
  } catch (err) {
    console.warn('[sarvam] TTS failed:', err.message, voice);
    return null;
  }
}

export { isSarvamConfigured };
