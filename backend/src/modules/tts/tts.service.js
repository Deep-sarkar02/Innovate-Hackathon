import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { env, isPollyConfigured } from '../../config/env.js';

/**
 * Amazon Polly TTS.
 *
 * HARD PLATFORM CONSTRAINT (verified via DescribeVoices in us-west-2):
 * only TWO Polly voices speak Hindi — Aditi (standard) and Kajal
 * (neural/generative) — and BOTH ARE FEMALE. Polly has no Hindi male voice.
 *
 * The previous map was `hi: { female: 'Kajal', male: 'Kajal' }`, which meant a
 * FATHER persona speaking Hindi was rendered in a female voice with no
 * warning. That silent substitution is the bug: a rep hears a woman saying
 * "main papa bol raha hoon" and the simulation breaks.
 *
 * Policy now: never silently substitute a wrong-gender voice. Resolve the best
 * available voice, and RETURN the mismatch so callers/UI can surface it
 * (see synthesizeSpeech -> { audio, voiceId, genderMatch, warning }).
 */

// Verified available (us-west-2). en-IN: Kajal (F, generative/neural),
// Raveena + Aditi (F, standard). No Indian male voice exists in Polly.
const VOICES = {
  hi: {
    female: { id: 'Kajal', engine: 'neural', languageCode: 'hi-IN' },
    // No Hindi male voice exists in Polly at all.
    male: null,
  },
  en: {
    // Indian-English female. Preferred for Indian personas.
    female: { id: 'Kajal', engine: 'generative', languageCode: 'en-IN' },
    // No Indian-English male voice in Polly; nearest male is US/GB accented.
    male: { id: 'Matthew', engine: 'generative', languageCode: 'en-US', accentMismatch: true },
  },
};

let client;
if (isPollyConfigured()) {
  client = new PollyClient({
    region: env.awsRegion,
    credentials: {
      accessKeyId: env.awsAccessKeyId,
      secretAccessKey: env.awsSecretAccessKey,
      ...(env.awsSessionToken ? { sessionToken: env.awsSessionToken } : {}),
    },
  });
}

export function getTtsProvider() {
  return isPollyConfigured() ? 'polly' : 'browser';
}

/**
 * Resolve a voice for (language, gender) and report honestly what we got.
 * Never returns a wrong-gender voice without flagging it.
 */
export function resolveVoice(language = 'en', voiceGender = 'female') {
  const lang = language === 'hi' ? 'hi' : 'en';
  const gender = voiceGender === 'male' ? 'male' : 'female';
  const exact = VOICES[lang]?.[gender];

  if (exact) {
    return {
      ...exact,
      genderMatch: true,
      warning: exact.accentMismatch
        ? `No Indian-English male voice exists in Polly; using ${exact.id} (${exact.languageCode}).`
        : null,
    };
  }

  // Requested male + Hindi: impossible in Polly. Prefer keeping the GENDER
  // right over keeping the language right — a male voice speaking Indian
  // English is far less jarring than a female voice claiming to be the father.
  if (gender === 'male') {
    const fallback = VOICES.en.male;
    return {
      ...fallback,
      genderMatch: true,
      languageDowngrade: true,
      warning:
        'Polly has no Hindi male voice (only Aditi and Kajal speak Hindi, both female). '
        + `Falling back to ${fallback.id} (en-US) so the gender stays correct. `
        + 'For a Hindi-speaking male persona, use a provider with Indian male voices.',
    };
  }

  const fallback = VOICES.en.female;
  return { ...fallback, genderMatch: true, warning: null };
}

export async function synthesizeSpeech(text, { language = 'en', voiceGender = 'female' } = {}) {
  if (!client || !text?.trim()) return null;

  const voice = resolveVoice(language, voiceGender);
  if (voice.warning) console.warn('[polly]', voice.warning);

  try {
    const response = await client.send(
      new SynthesizeSpeechCommand({
        Text: text.trim(),
        OutputFormat: 'mp3',
        VoiceId: voice.id,
        Engine: voice.engine,
        LanguageCode: voice.languageCode,
      })
    );

    const stream = response.AudioStream;
    if (!stream) return null;

    let audio;
    if (typeof stream.transformToByteArray === 'function') {
      audio = Buffer.from(await stream.transformToByteArray());
    } else {
      const chunks = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      audio = Buffer.concat(chunks);
    }

    return {
      audio,
      voiceId: voice.id,
      engine: voice.engine,
      languageCode: voice.languageCode,
      genderMatch: voice.genderMatch,
      languageDowngrade: Boolean(voice.languageDowngrade),
      warning: voice.warning,
    };
  } catch (err) {
    console.error('[polly] TTS failed:', err.message);
    return null;
  }
}

export { isPollyConfigured, VOICES };
