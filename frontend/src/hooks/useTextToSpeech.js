import { useCallback, useEffect, useRef, useState } from 'react';
import { pickVoice, loadVoices } from '../utils/voicePicker.js';
import { getLanguageConfig } from '../config/sessionPreferences.js';
import { ttsApi } from '../services/api.js';

export function useTextToSpeech({ language = 'en', voiceGender = 'female' } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [provider, setProvider] = useState('browser');
  const audioRef = useRef(null);

  useEffect(() => {
    loadVoices().then(() => setVoicesReady(true));
    ttsApi.status().then(({ data }) => setProvider(data.provider)).catch(() => setProvider('browser'));
  }, []);

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
      const { data } = await ttsApi.speak({ text, language, voiceGender });
      const blob = new Blob([data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);

      return new Promise((resolve) => {
        audioRef.current?.pause();
        const audio = new Audio(url);
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
          resolve();
        };

        audio.play().catch(() => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
          resolve();
        });
      });
    },
    [language, voiceGender]
  );

  const speak = useCallback(
    async (text) => {
      if (!text) return;

      if (provider === 'polly') {
        try {
          await speakWithPolly(text);
          return;
        } catch {
          // fall through to browser
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

  return { speak, stop, speaking, provider };
}
