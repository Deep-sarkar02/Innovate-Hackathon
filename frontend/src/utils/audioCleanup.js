/**
 * Browser-side speech cleanup before Amazon Transcribe.
 * Cuts rumble/hiss, applies a noise gate, trims silence edges.
 */

const MIC_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1,
  sampleRate: 48000,
};

/** Route mic through high-pass + low-pass + compressor → clean MediaStream for recording. */
export function createCleanAudioGraph(audioContext, rawStream) {
  const source = audioContext.createMediaStreamSource(rawStream);

  const highPass = audioContext.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.value = 120;
  highPass.Q.value = 0.8;

  const lowPass = audioContext.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.value = 7000;
  lowPass.Q.value = 0.7;

  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -28;
  compressor.knee.value = 18;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;

  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;

  const destination = audioContext.createMediaStreamDestination();

  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(compressor);
  compressor.connect(analyser);
  compressor.connect(destination);

  return { cleanStream: destination.stream, analyser };
}

export async function getCleanMicrophoneStream() {
  const rawStream = await navigator.mediaDevices.getUserMedia({ audio: MIC_CONSTRAINTS });
  const audioContext = new AudioContext({ sampleRate: 48000 });
  const { cleanStream, analyser } = createCleanAudioGraph(audioContext, rawStream);

  return { rawStream, cleanStream, audioContext, analyser };
}

function trimSilenceEdges(samples, sampleRate, threshold = 0.012, padMs = 60) {
  const pad = Math.floor((padMs / 1000) * sampleRate);
  let start = 0;
  let end = samples.length - 1;

  while (start < end && Math.abs(samples[start]) < threshold) start += 1;
  while (end > start && Math.abs(samples[end]) < threshold) end -= 1;

  start = Math.max(0, start - pad);
  end = Math.min(samples.length - 1, end + pad);

  if (end <= start) return new Float32Array(0);
  return samples.slice(start, end + 1);
}

/** Zero-out very quiet samples (fan hum, room noise between words). */
export function applyNoiseGate(samples, threshold = 0.01) {
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    out[i] = Math.abs(samples[i]) < threshold ? 0 : samples[i];
  }
  return out;
}

/** Gentle peak normalize so Transcribe gets consistent volume. */
export function normalizePeak(samples, targetPeak = 0.85) {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    peak = Math.max(peak, Math.abs(samples[i]));
  }
  if (peak < 0.001) return samples;

  const gain = targetPeak / peak;
  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    out[i] = Math.max(-1, Math.min(1, samples[i] * gain));
  }
  return out;
}

/** Full post-decode cleanup pipeline for speech PCM prep. */
export function cleanSpeechSamples(float32, sampleRate = 16000) {
  if (!float32?.length) return float32;

  let s = applyNoiseGate(float32, 0.01);
  s = trimSilenceEdges(s, sampleRate, 0.012, 60);
  s = normalizePeak(s);
  return s;
}

export function rmsLevel(analyser) {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);

  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const n = (data[i] - 128) / 128;
    sum += n * n;
  }
  return Math.sqrt(sum / data.length);
}
