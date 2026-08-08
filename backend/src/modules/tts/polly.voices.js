/**
 * Amazon Polly — Indian-market voices (en-IN / hi-IN).
 * @see https://docs.aws.amazon.com/polly/latest/dg/voicelist.html
 */
export const POLLY_VOICES = {
  en: {
    female: {
      voiceId: 'Raveena',
      engine: 'standard',
      languageCode: 'en-IN',
      label: 'Raveena · Indian English (female)',
    },
    male: {
      voiceId: 'Aditi',
      engine: 'standard',
      languageCode: 'en-IN',
      label: 'Aditi · Indian English (male slot)',
    },
  },
  hi: {
    female: {
      voiceId: 'Kajal',
      engine: 'neural',
      languageCode: 'hi-IN',
      label: 'Kajal · Hindi Neural (female)',
    },
    male: {
      voiceId: 'Aditi',
      engine: 'standard',
      languageCode: 'hi-IN',
      label: 'Aditi · Hindi (male slot)',
    },
  },
};

export function resolvePollyVoice(language = 'en', voiceGender = 'female', persona = null) {
  const lang = language === 'hi' ? 'hi' : 'en';
  // Persona role overrides manual gender so voice matches character
  let gender = voiceGender === 'male' ? 'male' : 'female';
  if (persona === 'mother') gender = 'female';
  else if (persona === 'father') gender = 'male';
  return POLLY_VOICES[lang][gender] ?? POLLY_VOICES.en.female;
}

export function listPollyVoices() {
  return {
    en: POLLY_VOICES.en,
    hi: POLLY_VOICES.hi,
    note: 'Polly has no dedicated male en-IN voice — male slot uses Aditi (Indian bilingual).',
  };
}
