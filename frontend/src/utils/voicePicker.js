/**
 * Browser SpeechSynthesis voice selection — the LAST-RESORT fallback used only
 * when server TTS (Sarvam/Polly) is unavailable.
 *
 * The Web Speech API does not expose a gender field, so gender can only be
 * inferred from the voice NAME. Two rules keep that inference honest:
 *
 *  1. Never let a name appear in both gender lists. 'Aditi' was previously
 *     listed as a male hint — she is a female Polly/Indian voice — which made
 *     a father persona speak in a woman's voice.
 *  2. Never silently fall back to a voice of the wrong gender. Returning the
 *     first voice in the pool is how a male persona ends up as Lekha/Heera on
 *     macOS, where no male hi-IN voice is installed at all. When gender cannot
 *     be honoured we return null and report why, so the caller can flag the
 *     compromise instead of pretending it did not happen.
 */

// Names that are unambiguously female across macOS / Windows / Google voices.
// Used both as positive hints for female and as an EXCLUSION list for male.
const FEMALE_NAMES = [
  'raveena', 'kajal', 'aditi', 'swara', 'lekha', 'heera', 'priya', 'neerja',
  'veena', 'kavya', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona',
  'zira', 'susan', 'linda', 'hazel', 'catherine', 'female',
];

const MALE_NAMES = [
  'ravi', 'kumar', 'arjun', 'amit', 'prabhat', 'aditya', 'rahul', 'hemant',
  'madhur', 'daniel', 'alex', 'fred', 'oliver', 'thomas', 'david', 'mark',
  'george', 'james', 'male',
];

const NAME_HINTS = { female: FEMALE_NAMES, male: MALE_NAMES };

/**
 * @returns {{voice: SpeechSynthesisVoice|null, genderMatch: boolean, warning: string|null}}
 */
export function pickVoiceDetailed(lang, gender) {
  if (!window.speechSynthesis) {
    return { voice: null, genderMatch: false, warning: 'This browser has no speech synthesis.' };
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    return { voice: null, genderMatch: false, warning: 'No browser voices are installed.' };
  }

  const isHindi = String(lang).toLowerCase().startsWith('hi');
  const preferredLocales = isHindi ? ['hi-in', 'hi'] : ['en-in', 'en-gb', 'en'];

  let pool = voices;
  for (const locale of preferredLocales) {
    const match = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(locale));
    if (match.length) {
      pool = match;
      break;
    }
  }

  const wantMale = gender === 'male';
  const hints = NAME_HINTS[wantMale ? 'male' : 'female'];
  const opposite = NAME_HINTS[wantMale ? 'female' : 'male'];
  const nameOf = (v) => v.name.toLowerCase();

  // 1. A voice whose name positively matches the requested gender.
  const matched = pool.find((v) => hints.some((h) => nameOf(v).includes(h)));
  if (matched) return { voice: matched, genderMatch: true, warning: null };

  // 2. Otherwise any voice NOT known to be the opposite gender. Unknown names
  //    are a genuine maybe; known-opposite names are a definite no.
  const notOpposite = pool.find((v) => !opposite.some((h) => nameOf(v).includes(h)));
  if (notOpposite) {
    return {
      voice: notOpposite,
      genderMatch: false,
      warning: `No confirmed ${gender} voice for ${lang} in this browser; using "${notOpposite.name}", whose gender could not be verified.`,
    };
  }

  // 3. Every available voice is the wrong gender — refuse rather than mislead.
  return {
    voice: null,
    genderMatch: false,
    warning: `This browser has no ${gender} voice for ${lang} — every installed ${lang} voice is ${wantMale ? 'female' : 'male'}. Configure server TTS (Sarvam) for a correct ${gender} Indian voice.`,
  };
}

export function pickVoice(lang, gender) {
  return pickVoiceDetailed(lang, gender).voice;
}

export function loadVoices() {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis?.getVoices() ?? [];
    if (existing.length) {
      resolve(existing);
      return;
    }
    if (!window.speechSynthesis) {
      resolve([]);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
  });
}
