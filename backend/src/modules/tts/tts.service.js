import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { env, isPollyConfigured, isSarvamConfigured } from '../../config/env.js';
import { sanitizeForSpeech } from '../../utils/speechText.js';
import { listPollyVoices, resolvePollyVoice } from './polly.voices.js';
import { textToSsml } from './ssml.js';
import { synthesizeSarvamSpeech } from '../sarvam/sarvam.tts.js';
import { listSarvamVoices, resolveSarvamVoice } from '../sarvam/sarvam.voices.js';

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
  if (isSarvamConfigured()) return 'sarvam';
  if (isPollyConfigured()) return 'polly';
  return 'browser';
}

export function getTtsVoiceCatalog() {
  if (isSarvamConfigured()) return listSarvamVoices();
  return listPollyVoices();
}

export function resolveTtsVoice(language = 'en', voiceGender = 'female', persona = null) {
  if (isSarvamConfigured()) return resolveSarvamVoice(language, voiceGender, persona);
  return resolvePollyVoice(language, voiceGender, persona);
}

async function synthesizePollySpeech(text, { language = 'en', voiceGender = 'female', persona = 'father' } = {}) {
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

    let audio;
    if (typeof stream.transformToByteArray === 'function') {
      audio = Buffer.from(await stream.transformToByteArray());
    } else {
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      audio = Buffer.concat(chunks);
    }

    return { audio, contentType: 'audio/mpeg', voice };
  } catch (err) {
    console.warn('[polly] TTS failed:', err.message, voice);
    return null;
  }
}

export async function synthesizeSpeech(text, options = {}) {
  if (isSarvamConfigured()) {
    const sarvam = await synthesizeSarvamSpeech(text, options);
    if (sarvam) return sarvam;
  }

  if (isPollyConfigured()) {
    const polly = await synthesizePollySpeech(text, options);
    if (polly) return polly;
  }

  return null;
}

export { isPollyConfigured, isSarvamConfigured };
