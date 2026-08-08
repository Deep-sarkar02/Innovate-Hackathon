/**
 * Wrap plain dialogue in Polly SSML for natural pauses, emphasis, and pitch.
 */

function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function splitSentences(text) {
  return text
    .split(/(?<=[.?!?])\s+|\s+(?=\?)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Add light emphasis on Hindi question words and key sales terms. */
function emphasizePhrases(sentence) {
  let s = escapeXml(sentence);
  const patterns = [
    /\b(kaun|kya|kitna|kyun|kaise|kahan|theek hai|dekhiye|suniye|haan ji|nahi)\b/gi,
    /\b(Infinity Learn|Sri Chaitanya|demo|EMI|test|report|tuition|fees)\b/gi,
  ];
  for (const re of patterns) {
    s = s.replace(re, (m) => `<emphasis level="moderate">${m}</emphasis>`);
  }
  return s;
}

/**
 * @param {string} text - spoken dialogue
 * @param {{ voiceGender?: string, persona?: string, language?: string }} opts
 */
export function textToSsml(text, { voiceGender = 'female', persona = 'father', language = 'en' } = {}) {
  if (!text?.trim()) return '';

  const isFemale = voiceGender === 'female' || persona === 'mother'
    || (persona === 'student' && language !== 'hi');

  // Slightly lower pitch for father; warmer lift for mother
  let pitch = isFemale ? '+4%' : '-6%';
  if (persona === 'student') pitch = '+2%';

  const rate = language === 'hi' ? '92%' : '94%';

  const sentences = splitSentences(text);
  const parts = sentences.map((sentence, i) => {
    const chunk = emphasizePhrases(sentence);
    const pause = sentence.endsWith('?') ? '450ms' : '320ms';
    const breakTag = i < sentences.length - 1 ? `<break time="${pause}"/>` : '';
    return `<prosody rate="${rate}" pitch="${pitch}">${chunk}</prosody>${breakTag}`;
  });

  return `<speak>${parts.join(' ')}</speak>`;
}
