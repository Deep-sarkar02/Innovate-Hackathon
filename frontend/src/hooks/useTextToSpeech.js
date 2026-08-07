import { useCallback, useEffect, useRef, useState } from 'react';
import { pickVoice, loadVoices } from '../utils/voicePicker.js';
import { getLanguageConfig } from '../config/sessionPreferences.js';

export function useTextToSpeech({ language = 'en', voiceGender = 'female' } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    loadVoices().then(() => setVoicesReady(true));
  }, []);

  const speak = useCallback((text) => {
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

      utteranceRef.current = utterance;
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
  }, [language, voiceGender, voicesReady]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  return { speak, stop, speaking };
}
