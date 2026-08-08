/**
 * Sarvam Bulbul v3 — Indian-market voices (en-IN / hi-IN).
 * @see https://docs.sarvam.ai/api-reference/text-to-speech/convert
 */
import { genderForPersona } from '../tts/persona-gender.js';

export const SARVAM_VOICES = {
  en: {
    female: {
      speaker: 'priya',
      languageCode: 'en-IN',
      label: 'Priya · Indian English (female)',
    },
    male: {
      speaker: 'aditya',
      languageCode: 'en-IN',
      label: 'Aditya · Indian English (male)',
    },
  },
  hi: {
    female: {
      speaker: 'kavya',
      languageCode: 'hi-IN',
      label: 'Kavya · Hindi (female)',
    },
    male: {
      speaker: 'rahul',
      languageCode: 'hi-IN',
      label: 'Rahul · Hindi (male)',
    },
  },
};

export function resolveSarvamVoice(language = 'en', voiceGender = 'female', persona = null) {
  const lang = language === 'hi' ? 'hi' : 'en';
  // Same rule as Polly — parents forced by role, students follow the child.
  const gender = genderForPersona(voiceGender, persona);
  return SARVAM_VOICES[lang][gender] ?? SARVAM_VOICES.en.female;
}

export function listSarvamVoices() {
  return {
    en: SARVAM_VOICES.en,
    hi: SARVAM_VOICES.hi,
    model: 'bulbul:v3',
    note: 'Natural Indian male and female voices via Sarvam Bulbul v3.',
  };
}
