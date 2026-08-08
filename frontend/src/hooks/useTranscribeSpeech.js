import { useEffect, useRef, useState } from 'react';
import { sttApi } from '../services/api.js';
import { blobToCleanPcm16kMono, getSupportedRecorderMimeType, pcmToBase64 } from '../utils/audioPcm.js';
import { getCleanMicrophoneStream, rmsLevel } from '../utils/audioCleanup.js';

const SILENCE_THRESHOLD = 0.014;
const SILENCE_MS = 1400;
const MIN_SPEECH_MS = 450;
const MAX_SPEECH_MS = 28000;
const POLL_MS = 80;
const MAX_PCM_BYTES = 16000 * 2 * 28;

function languageCode(lang) {
  return lang.startsWith('hi') ? 'hi' : 'en';
}

export function useTranscribeSpeech({
  onResult,
  onFailure,
  enabled = true,
  speaker = 'sales_executive',
  lang = 'en-US',
  provider = 'sarvam',
} = {}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState(null);

  const onResultRef = useRef(onResult);
  const onFailureRef = useRef(onFailure);
  const rawStreamRef = useRef(null);
  const cleanStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const processingRef = useRef(false);
  const speechStartRef = useRef(null);
  const silenceStartRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const pollRef = useRef(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onFailureRef.current = onFailure;
  }, [onFailure]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setListening(false);
      return undefined;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSupported(false);
      return undefined;
    }

    let cancelled = false;
    let mimeType = '';

    function finalizeUtterance({ minSpeechMs = MIN_SPEECH_MS } = {}) {
      if (!isSpeakingRef.current || processingRef.current) return;

      const speechMs = Date.now() - (speechStartRef.current ?? Date.now());
      isSpeakingRef.current = false;
      silenceStartRef.current = null;
      speechStartRef.current = null;

      const recorder = recorderRef.current;
      recorderRef.current = null;
      if (!recorder || recorder.state === 'inactive') return;

      if (speechMs < minSpeechMs) {
        chunksRef.current = [];
        return;
      }

      processingRef.current = true;

      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          chunksRef.current = [];
          if (blob.size < 1000) return;

          let pcm = await blobToCleanPcm16kMono(blob);
          if (pcm.length < 3200) return;
          if (pcm.length > MAX_PCM_BYTES) {
            pcm = pcm.slice(0, MAX_PCM_BYTES);
          }

          const { data } = await sttApi.transcribe({
            audio: pcmToBase64(pcm),
            language: languageCode(lang),
          });
          if (data.text?.trim()) {
            onResultRef.current(speaker, data.text.trim());
          }
        } catch (err) {
          const status = err.response?.status;
          const message = err.response?.data?.error || err.message || 'Transcription failed';
          const retryable = !status || status >= 500 || status === 413 || message.includes('ECONNRESET');
          if (retryable) {
            setError(message);
            onFailureRef.current?.(message);
          }
        } finally {
          processingRef.current = false;
        }
      };

      recorder.stop();
    }

    async function start() {
      try {
        const { rawStream, cleanStream, audioContext, analyser } = await getCleanMicrophoneStream();
        if (cancelled) {
          rawStream.getTracks().forEach((track) => track.stop());
          await audioContext.close();
          return;
        }

        rawStreamRef.current = rawStream;
        cleanStreamRef.current = cleanStream;
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;

        mimeType = getSupportedRecorderMimeType();
        if (!mimeType) {
          setSupported(false);
          setError('MediaRecorder not supported in this browser');
          return;
        }

        setListening(true);
        setError(null);

        pollRef.current = setInterval(() => {
          if (!enabledRef.current || processingRef.current || !analyserRef.current) return;

          const level = rmsLevel(analyserRef.current);
          const speaking = level > SILENCE_THRESHOLD;

          if (isSpeakingRef.current && speechStartRef.current) {
            const speechMs = Date.now() - speechStartRef.current;
            if (speechMs >= MAX_SPEECH_MS) {
              finalizeUtterance();
              return;
            }
          }

          if (speaking) {
            silenceStartRef.current = null;
            if (!isSpeakingRef.current) {
              isSpeakingRef.current = true;
              speechStartRef.current = Date.now();
              chunksRef.current = [];
              const recorder = new MediaRecorder(cleanStreamRef.current, { mimeType });
              recorderRef.current = recorder;
              recorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
              };
              recorder.start(250);
            }
            return;
          }

          if (!isSpeakingRef.current) return;

          if (!silenceStartRef.current) {
            silenceStartRef.current = Date.now();
            return;
          }

          if (Date.now() - silenceStartRef.current < SILENCE_MS) return;

          finalizeUtterance();
        }, POLL_MS);
      } catch (err) {
        if (err.name === 'NotAllowedError') {
          setError('Microphone permission denied');
        } else {
          setError(err.message || 'Failed to start microphone');
        }
        setSupported(false);
      }
    }

    start();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      rawStreamRef.current?.getTracks().forEach((track) => track.stop());
      cleanStreamRef.current?.getTracks().forEach((track) => track.stop());
      audioContextRef.current?.close();
      rawStreamRef.current = null;
      cleanStreamRef.current = null;
      audioContextRef.current = null;
      analyserRef.current = null;
      recorderRef.current = null;
      setListening(false);
    };
  }, [enabled, speaker, lang]);

  return { listening, supported, error, provider };
}
