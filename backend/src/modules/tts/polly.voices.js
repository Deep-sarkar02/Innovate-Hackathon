/**
 * Amazon Polly — Indian-market voices (en-IN / hi-IN).
 * @see https://docs.aws.amazon.com/polly/latest/dg/voicelist.html
 *
 * VERIFIED CONSTRAINT (DescribeVoices, us-west-2 and us-east-1, Aug 2026):
 * Polly ships exactly THREE Indian-locale voices — Raveena, Aditi and Kajal —
 * and ALL THREE ARE FEMALE. Only Aditi and Kajal speak hi-IN. There is no
 * Indian male voice in any region, so this is a product gap, not a regional
 * one; switching regions does not help.
 *
 * Consequence: a FATHER persona cannot be voiced correctly by Polly alone.
 * Using a female voice in the "male slot" produces a woman saying
 * "main papa bol raha hoon", which breaks the simulation immediately.
 *
 * Policy: keep GENDER correct and downgrade LANGUAGE instead — a male voice
 * with a non-Indian accent is far less jarring than a wrong-gender parent.
 * Every resolution reports genderMatch / accentMismatch / warning so callers
 * can surface the compromise rather than hide it.
 *
 * Preferred fix: configure Sarvam (see modules/sarvam/sarvam.voices.js), which
 * DOES provide Indian male voices — aditya (en-IN) and rahul (hi-IN).
 * tts.service.js already prefers Sarvam when it is configured.
 */
export const POLLY_VOICES = {
  en: {
    female: {
      voiceId: 'Kajal',
      engine: 'neural',
      languageCode: 'en-IN',
      label: 'Kajal · Indian English (female, neural)',
      genderMatch: true,
    },
    // No Indian-English male voice exists in Polly. Nearest correct-gender
    // option is a US male; accent is wrong but the character is not.
    male: {
      voiceId: 'Matthew',
      engine: 'neural',
      languageCode: 'en-US',
      label: 'Matthew · US English (male) — no Indian male voice in Polly',
      genderMatch: true,
      accentMismatch: true,
      warning: 'Polly has no Indian-English male voice; using Matthew (en-US). Configure Sarvam for an Indian male voice.',
    },
  },
  hi: {
    female: {
      voiceId: 'Kajal',
      engine: 'neural',
      languageCode: 'hi-IN',
      label: 'Kajal · Hindi (female, neural)',
      genderMatch: true,
    },
    // Polly has NO Hindi male voice at all. Keeping gender correct means
    // losing Hindi entirely for this persona.
    male: {
      voiceId: 'Matthew',
      engine: 'neural',
      languageCode: 'en-US',
      label: 'Matthew · US English (male) — Polly has no Hindi male voice',
      genderMatch: true,
      accentMismatch: true,
      languageDowngrade: true,
      warning: 'Polly has no Hindi male voice (only Aditi and Kajal speak Hindi, both female). Falling back to Matthew (en-US) to keep the gender correct. Configure Sarvam for a Hindi male voice (rahul).',
    },
  },
};

export function resolvePollyVoice(language = 'en', voiceGender = 'female', persona = null) {
  const lang = language === 'hi' ? 'hi' : 'en';
  // Persona role overrides manual gender so the voice matches the character.
  let gender = voiceGender === 'male' ? 'male' : 'female';
  if (persona === 'mother') gender = 'female';
  else if (persona === 'father' || persona === 'student') gender = 'male';

  const voice = POLLY_VOICES[lang][gender] ?? POLLY_VOICES.en.female;
  if (voice.warning) console.warn('[polly]', voice.warning);
  return voice;
}

export function listPollyVoices() {
  return {
    en: POLLY_VOICES.en,
    hi: POLLY_VOICES.hi,
    note:
      'Polly has NO Indian male voice in any region (verified via DescribeVoices: Raveena, Aditi, Kajal — all female). '
      + 'Male personas keep the correct gender by falling back to a US male voice. '
      + 'Configure Sarvam for genuine Indian male voices (aditya en-IN, rahul hi-IN).',
  };
}
