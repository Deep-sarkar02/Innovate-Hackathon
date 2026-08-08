import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { env, isPollyConfigured } from '../../config/env.js';

const VOICES = {
  en: { female: 'Joanna', male: 'Matthew' },
  hi: { female: 'Kajal', male: 'Kajal' },
};

let client;
if (isPollyConfigured()) {
  client = new PollyClient({
    region: env.awsRegion,
    credentials: {
      accessKeyId: env.awsAccessKeyId,
      secretAccessKey: env.awsSecretAccessKey,
      ...(env.awsSessionToken ? { sessionToken: env.awsSessionToken } : {}),
    },
  });
}

export function getTtsProvider() {
  return isPollyConfigured() ? 'polly' : 'browser';
}

export async function synthesizeSpeech(text, { language = 'en', voiceGender = 'female' } = {}) {
  if (!client || !text?.trim()) return null;

  const lang = language === 'hi' ? 'hi' : 'en';
  const voiceId = VOICES[lang]?.[voiceGender] ?? VOICES.en.female;

  try {
    const response = await client.send(
      new SynthesizeSpeechCommand({
        Text: text.trim(),
        OutputFormat: 'mp3',
        VoiceId: voiceId,
        Engine: voiceId === 'Kajal' || voiceId === 'Joanna' || voiceId === 'Matthew' ? 'neural' : 'standard',
        ...(lang === 'hi' ? { LanguageCode: 'hi-IN' } : { LanguageCode: 'en-US' }),
      })
    );

    const stream = response.AudioStream;
    if (!stream) return null;

    if (typeof stream.transformToByteArray === 'function') {
      return Buffer.from(await stream.transformToByteArray());
    }

    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (err) {
    console.warn('[polly] TTS failed:', err.message);
    return null;
  }
}

export { isPollyConfigured };
