import {
  TranscribeStreamingClient,
  StartStreamTranscriptionCommand,
} from '@aws-sdk/client-transcribe-streaming';
import { env, isTranscribeConfigured, isSarvamConfigured } from '../../config/env.js';
import { transcribeSarvamPcm } from '../sarvam/sarvam.stt.js';

const LANGUAGE_CODES = {
  en: 'en-IN',
  hi: 'hi-IN',
};

const CHUNK_SIZE = 3200;
const MIN_PCM_BYTES = 6400;

let client;
if (isTranscribeConfigured()) {
  client = new TranscribeStreamingClient({
    region: env.awsRegion,
    credentials: {
      accessKeyId: env.awsAccessKeyId,
      secretAccessKey: env.awsSecretAccessKey,
      ...(env.awsSessionToken ? { sessionToken: env.awsSessionToken } : {}),
    },
  });
}

export function getSttProvider() {
  if (isSarvamConfigured()) return 'sarvam';
  if (isTranscribeConfigured()) return 'transcribe';
  return 'browser';
}

function* pcmChunks(pcmBuffer) {
  for (let offset = 0; offset < pcmBuffer.length; offset += CHUNK_SIZE) {
    yield { AudioEvent: { AudioChunk: pcmBuffer.subarray(offset, offset + CHUNK_SIZE) } };
  }
}

async function transcribeAwsPcm(pcmBuffer, { language = 'en', sampleRate = 16000 } = {}) {
  if (!client || !pcmBuffer?.length) return null;
  if (pcmBuffer.length < MIN_PCM_BYTES) return null;

  const languageCode = LANGUAGE_CODES[language] ?? LANGUAGE_CODES.en;

  try {
    const command = new StartStreamTranscriptionCommand({
      LanguageCode: languageCode,
      MediaEncoding: 'pcm',
      MediaSampleRateHertz: sampleRate,
      AudioStream: pcmChunks(pcmBuffer),
    });

    const response = await client.send(command);
    const parts = [];

    for await (const event of response.TranscriptResultStream ?? []) {
      const results = event.TranscriptEvent?.Transcript?.Results ?? [];
      for (const result of results) {
        if (result.IsPartial) continue;
        const text = result.Alternatives?.[0]?.Transcript?.trim();
        if (text) parts.push(text);
      }
    }

    const transcript = parts.join(' ').trim();
    return transcript || null;
  } catch (err) {
    console.warn('[transcribe] STT failed:', err.message);
    return null;
  }
}

export async function transcribePcm(pcmBuffer, options = {}) {
  if (isSarvamConfigured()) {
    const sarvam = await transcribeSarvamPcm(pcmBuffer, options);
    if (sarvam) return sarvam;
  }

  if (isTranscribeConfigured()) {
    const aws = await transcribeAwsPcm(pcmBuffer, options);
    if (aws) return aws;
  }

  return null;
}

export { isTranscribeConfigured, isSarvamConfigured };
