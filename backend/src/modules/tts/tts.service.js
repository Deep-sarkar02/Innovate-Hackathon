import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { env, isPollyConfigured } from '../../config/env.js';
import { sanitizeForSpeech } from '../../utils/speechText.js';
import { listPollyVoices, resolvePollyVoice } from './polly.voices.js';
import { textToSsml } from './ssml.js';

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

export function getTtsVoiceCatalog() {
  return listPollyVoices();
}

export async function synthesizeSpeech(text, { language = 'en', voiceGender = 'female', persona = 'father' } = {}) {
  const spoken = sanitizeForSpeech(text);
  if (!client || !spoken) return null;

  const voice = resolvePollyVoice(language, voiceGender, persona);
  const ssml = textToSsml(spoken, { voiceGender, persona, language });
  const useSsml = voice.engine === 'standard' && ssml.length > 0;

  try {
    const response = await client.send(
      new SynthesizeSpeechCommand({
        Text: useSsml ? ssml : spoken,
        TextType: useSsml ? 'ssml' : 'text',
        OutputFormat: 'mp3',
        VoiceId: voice.voiceId,
        Engine: voice.engine,
        LanguageCode: voice.languageCode,
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
    console.warn('[polly] TTS failed:', err.message, voice);
    return null;
  }
}

export { isPollyConfigured };
