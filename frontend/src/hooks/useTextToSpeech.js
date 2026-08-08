import { useCallback, useEffect, useRef, useState } from 'react';
import { pickVoice, loadVoices } from '../utils/voicePicker.js';
import { getLanguageConfig } from '../config/sessionPreferences.js';
import { ttsApi } from '../services/api.js';
import { logApiError } from '../utils/apiError.js';
import { sanitizeForSpeech } from '../utils/speechText.js';

export function useTextToSpeech({ language = 'en', voiceGender = 'female', persona = 'father' } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [provider, setProvider] = useState('browser');
  const [voiceInfo, setVoiceInfo] = useState(null);
  const [ttsError, setTtsError] = useState(null);
  const audioRef = useRef(null);

  useEffect(() => {
    loadVoices().then(() => setVoicesReady(true));
    ttsApi
      .status({ language, voiceGender, persona })
      .then(({ data }) => {
        setProvider(data.provider ?? 'browser');
        setVoiceInfo(data.voice ?? null);
      })
      .catch((err) => {
        logApiError('tts/status', err);
        setProvider('browser');
        setTtsError('Polly unavailable — using browser Indian voice fallback.');
      });
  }, [language, voiceGender, persona]);

  const speakWithBrowser = useCallback(
    (text) => {
      if (!text || !window.speechSynthesis) return Promise.resolve();

      const langConfig = getLanguageConfig(language);

      return new Promise((resolve) => {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = voiceGender === 'female' ? 1.05 : 0.85;
        utterance.lang = langConfig.ttsLang;

        const voice = pickVoice(langConfig.ttsLang, voiceGender);
        if (voice) utterance.voice = voice;

        utterance.onstart = () => setSpeaking(true);
        utterance.onend = () => {
          setSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setSpeaking(false);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [language, voiceGender, voicesReady]
  );

  const speakWithPolly = useCallback(
    async (text) => {
      const response = await ttsApi.speak({ text, language, voiceGender, persona });
      const bytes = response.data;

      if (!bytes?.byteLength) {
        throw new Error('Polly returned empty audio');
      }

      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      return new Promise((resolve, reject) => {
        audioRef.current?.pause();
        const audio = new Audio(url);
        audio.volume = 1;
        audioRef.current = audio;

        audio.onplay = () => setSpeaking(true);
        audio.onended = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
          reject(new Error('Browser failed to play Polly audio'));
        };

        audio.play().catch((err) => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
          reject(err);
        });
      });
    },
    [language, voiceGender, persona]
  );

  const speak = useCallback(
    async (rawText) => {
      const text = sanitizeForSpeech(rawText);
      if (!text) return;

      if (provider === 'polly') {
        try {
          setTtsError(null);
          await speakWithPolly(text);
          return;
        } catch (err) {
          logApiError('tts/speak', err);
          setTtsError(
            err.response?.data?.error
            || err.message
            || 'Polly failed — falling back to browser voice'
          );
        }
      }

      await speakWithBrowser(text);
    },
    [provider, speakWithPolly, speakWithBrowser]
  );

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking, provider, voiceInfo, ttsError };
}
