export const LANGUAGES = [
  { id: 'en', label: 'English', speechLang: 'en-US', ttsLang: 'en-US' },
  { id: 'hi', label: 'Hindi', speechLang: 'hi-IN', ttsLang: 'hi-IN' },
];

export const VOICE_GENDERS = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
];

export const DEFAULT_SESSION = {
  language: 'en',
  voiceGender: 'female',
  personaIndex: 0,
  customerName: '',
};

export function getLanguageConfig(languageId) {
  return LANGUAGES.find((l) => l.id === languageId) ?? LANGUAGES[0];
}

export function loadSessionPrefs() {
  try {
    const raw = localStorage.getItem('sessionPrefs');
    if (raw) return { ...DEFAULT_SESSION, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULT_SESSION };
}

export function saveSessionPrefs(prefs) {
  localStorage.setItem('sessionPrefs', JSON.stringify(prefs));
}
