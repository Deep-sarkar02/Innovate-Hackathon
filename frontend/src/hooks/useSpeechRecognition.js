import { useEffect, useRef, useState } from 'react';
import { sttApi } from '../services/api.js';
import { useTranscribeSpeech } from './useTranscribeSpeech.js';

function useBrowserSpeechRecognition({ onResult, enabled = true, speaker = 'sales_executive', lang = 'en-US' }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const shouldRestart = useRef(false);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return undefined;
    }

    if (!enabled) {
      shouldRestart.current = false;
      recognitionRef.current?.stop();
      setListening(false);
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim();
          if (text) onResultRef.current(speaker, text);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied');
        shouldRestart.current = false;
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setError(event.error);
      }
    };

    recognition.onend = () => {
      setListening(false);
      if (shouldRestart.current && enabled) {
        try {
          recognition.start();
          setListening(true);
        } catch {
          // ignore restart race
        }
      }
    };

    recognition.onstart = () => {
      setListening(true);
      setError(null);
    };

    recognitionRef.current = recognition;
    shouldRestart.current = true;

    try {
      recognition.start();
    } catch (err) {
      setError(err.message);
    }

    return () => {
      shouldRestart.current = false;
      recognition.onend = null;
      recognition.stop();
    };
  }, [enabled, speaker, lang]);

  return { listening, supported, error, provider: 'browser' };
}

export function useSpeechRecognition(options) {
  const [provider, setProvider] = useState(null);

  useEffect(() => {
    sttApi.status().then(({ data }) => setProvider(data.provider)).catch(() => setProvider('browser'));
  }, []);

  const transcribe = useTranscribeSpeech({ ...options, enabled: options.enabled && provider === 'transcribe' });
  const browser = useBrowserSpeechRecognition({ ...options, enabled: options.enabled && provider === 'browser' });

  if (provider === null) {
    return { listening: false, supported: true, error: null, provider: null };
  }

  return provider === 'transcribe' ? transcribe : browser;
}
