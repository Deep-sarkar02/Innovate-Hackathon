const INDIAN_VOICE_HINTS = {
  female: [
    'raveena', 'kajal', 'aditi', 'swara', 'lekha', 'heera', 'priya', 'neerja',
    'veena', 'google hindi', 'microsoft heera', 'india english',
  ],
  male: [
    'aditi', 'ravi', 'kumar', 'arjun', 'amit', 'prabhat', 'google hindi',
    'microsoft ravi', 'india english',
  ],
};

export function pickVoice(lang, gender) {
  if (!window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const isHindi = lang.toLowerCase().startsWith('hi');
  const preferredLocales = isHindi
    ? ['hi-in', 'hi']
    : ['en-in', 'en-gb', 'en'];

  let pool = voices;
  for (const locale of preferredLocales) {
    const match = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(locale));
    if (match.length) {
      pool = match;
      break;
    }
  }

  const hints = INDIAN_VOICE_HINTS[gender === 'male' ? 'male' : 'female'];

  const matched = pool.find((v) => {
    const name = v.name.toLowerCase();
    return hints.some((h) => name.includes(h));
  });
  if (matched) return matched;

  return pool[0] ?? voices[0];
}

export function loadVoices() {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis?.getVoices() ?? [];
    if (existing.length) {
      resolve(existing);
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 500);
  });
}
