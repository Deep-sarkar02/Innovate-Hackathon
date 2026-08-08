import { cleanSpeechSamples } from './audioCleanup.js';

function mixToMono(audioBuffer) {
  const length = audioBuffer.length;
  const mono = new Float32Array(length);
  const channels = audioBuffer.numberOfChannels;

  for (let ch = 0; ch < channels; ch += 1) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      mono[i] += data[i] / channels;
    }
  }
  return mono;
}

function resample(input, inputRate, outputRate) {
  if (inputRate === outputRate) return input;

  const ratio = inputRate / outputRate;
  const outputLength = Math.round(input.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i += 1) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;
    const a = input[index] ?? 0;
    const b = input[index + 1] ?? a;
    output[i] = a + (b - a) * fraction;
  }

  return output;
}

function float32ToInt16(samples) {
  const pcm = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    pcm[i] = clamped < 0 ? clamped * 32768 : clamped * 32767;
  }
  return pcm;
}

export function pcmToBase64(pcm) {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function blobToPcm16kMono(blob, targetRate = 16000) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const mono = mixToMono(audioBuffer);
    const resampled = resample(mono, audioBuffer.sampleRate, targetRate);
    return float32ToInt16(resampled);
  } finally {
    await audioContext.close();
  }
}

/** Decode → resample → noise gate → trim silence → normalize → PCM. */
export async function blobToCleanPcm16kMono(blob, targetRate = 16000) {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const mono = mixToMono(audioBuffer);
    const resampled = resample(mono, audioBuffer.sampleRate, targetRate);
    const cleaned = cleanSpeechSamples(resampled, targetRate);
    if (cleaned.length < targetRate * 0.2) return new Int16Array(0);
    return float32ToInt16(cleaned);
  } finally {
    await audioContext.close();
  }
}

export function getSupportedRecorderMimeType() {
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}
