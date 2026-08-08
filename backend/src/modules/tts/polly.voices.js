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
import { genderForPersona } from './persona-gender.js';

export const POLLY_VOICES = {
  en: {
    female: {
      voiceId: 'Kajal',
      // Kajal is the only Indian voice with a generative engine — noticeably
      // more expressive than neural, which matters because flat, linear
      // delivery was a live-test complaint.
      engine: 'generative',
      languageCode: 'en-IN',
      label: 'Kajal · Indian English (female, generative)',
      genderMatch: true,
      indianAccent: true,
    },
    // No Indian-English male voice exists in Polly. Nearest correct-gender
    // option is a US male; accent is wrong but the character is not.
    male: {
      voiceId: 'Matthew',
      engine: 'neural',
      languageCode: 'en-US',
      label: 'Matthew · US English (male) — NOT an Indian voice',
      genderMatch: true,
      accentMismatch: true,
      indianAccent: false,
      meetsIndianRequirement: false,
      warning: 'STOPGAP: every customer in this product is an Indian parent, but Polly has no Indian male voice in any region — Matthew is American. Set SARVAM_API_KEY to voice male personas as Indian (aditya, en-IN).',
    },
  },
  hi: {
    female: {
      voiceId: 'Kajal',
      engine: 'generative',
      languageCode: 'hi-IN',
      label: 'Kajal · Hindi (female, generative)',
      genderMatch: true,
      indianAccent: true,
    },
    // Polly has NO Hindi male voice at all. Keeping gender correct means
    // losing Hindi entirely for this persona.
    male: {
      voiceId: 'Matthew',
      engine: 'neural',
      languageCode: 'en-US',
      label: 'Matthew · US English (male) — NOT an Indian voice, and not Hindi',
      genderMatch: true,
      accentMismatch: true,
      languageDowngrade: true,
      indianAccent: false,
      meetsIndianRequirement: false,
      warning: 'STOPGAP: Polly has no Hindi male voice at all (only Aditi and Kajal speak Hindi, both female), so a Hindi-speaking father falls back to Matthew — American, and speaking English phonemes. Set SARVAM_API_KEY to voice him correctly (rahul, hi-IN).',
    },
  },
};

export function resolvePollyVoice(language = 'en', voiceGender = 'female', persona = null) {
  const lang = language === 'hi' ? 'hi' : 'en';
  // Parent roles override the caller's gender; students keep theirs (it follows
  // the child's gender). See persona-gender.js.
  const gender = genderForPersona(voiceGender, persona);

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
