export function pickVoice(lang, gender) {
  if (!window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const langPrefix = lang.startsWith('hi') ? 'hi' : 'en';
  const langVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
  const pool = langVoices.length ? langVoices : voices;

  const femaleHints = ['female', 'zira', 'samantha', 'karen', 'veena', 'lekha', 'priya', 'heera', 'swara', 'aditi'];
  const maleHints = ['male', 'david', 'mark', 'ravi', 'kumar', 'arjun', 'amit'];

  const hints = gender === 'female' ? femaleHints : maleHints;

  const matched = pool.find((v) => {
    const name = v.name.toLowerCase();
    return hints.some((h) => name.includes(h));
  });

  if (matched) return matched;

  if (gender === 'female') {
    return pool.find((v) => !maleHints.some((h) => v.name.toLowerCase().includes(h))) ?? pool[0];
  }

  return pool.find((v) => maleHints.some((h) => v.name.toLowerCase().includes(h))) ?? pool[pool.length > 1 ? 1 : 0];
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
