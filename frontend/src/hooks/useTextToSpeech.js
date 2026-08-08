import { useCallback, useEffect, useRef, useState } from 'react';
import { pickVoiceDetailed, loadVoices } from '../utils/voicePicker.js';
import { getLanguageConfig } from '../config/sessionPreferences.js';
import { ttsApi } from '../services/api.js';
import { logApiError } from '../utils/apiError.js';
import { sanitizeForSpeech } from '../utils/speechText.js';

export function useTextToSpeech({ language = 'en', voiceGender = 'female', persona = 'father' } = {}) {
  const [speaking, setSpeaking] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const [provider, setProvider] = useState(null); // null = not yet known
  const [voiceInfo, setVoiceInfo] = useState(null);
  const [ttsError, setTtsError] = useState(null);
  const audioRef = useRef(null);
  // speak() awaits this so the FIRST utterance cannot race the status probe.
  // Previously provider defaulted to 'browser', and the opening line is spoken
  // on mount — so the customer's first sentence always used the browser voice,
  // which on macOS has no male hi-IN voice and therefore sounded female even
  // for a father persona. Everything after it was correct, which made the bug
  // look intermittent.
  const providerRef = useRef(null);

  useEffect(() => {
    loadVoices().then(() => setVoicesReady(true));

    const probe = ttsApi
      .status({ language, voiceGender, persona })
      .then(({ data }) => {
        const resolved = data.provider ?? 'browser';
        setProvider(resolved);
        setVoiceInfo(data.voice ?? null);
        if (data.voice?.warning) setTtsError(data.voice.warning);
        return resolved;
      })
      .catch((err) => {
        logApiError('tts/status', err);
        setProvider('browser');
        setTtsError('Server TTS unavailable — using browser voice fallback.');
        return 'browser';
      });

    providerRef.current = probe;
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

        // Report a gender compromise instead of hiding it: a father persona
        // speaking in a woman's voice destroys the simulation, and the rep
        // needs to know it is a device limitation, not the persona.
        const { voice, genderMatch, warning } = pickVoiceDetailed(langConfig.ttsLang, voiceGender);
        if (voice) utterance.voice = voice;
        if (!genderMatch && warning) setTtsError(warning);

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

  const speakWithServer = useCallback(
    async (text) => {
      const response = await ttsApi.speak({ text, language, voiceGender, persona });
      const bytes = response.data;

      if (!bytes?.byteLength) {
        throw new Error('Server TTS returned empty audio');
      }

      const mimeType = response.headers['content-type'] || 'audio/mpeg';
      const blob = new Blob([bytes], { type: mimeType });
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
          reject(new Error('Browser failed to play server TTS audio'));
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

      // Wait for the status probe rather than assuming 'browser'.
      const active = provider ?? (await providerRef.current) ?? 'browser';

      if (active === 'sarvam' || active === 'polly') {
        try {
          setTtsError(null);
          await speakWithServer(text);
          return;
        } catch (err) {
          logApiError('tts/speak', err);
          setTtsError(
            err.response?.data?.error
            || err.message
            || 'Server TTS failed — falling back to browser voice'
          );
        }
      }

      await speakWithBrowser(text);
    },
    [provider, speakWithServer, speakWithBrowser]
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
