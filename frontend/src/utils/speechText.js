/** Client-side mirror of backend speechText sanitizer — used before Polly/browser TTS. */
export function sanitizeForSpeech(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();
  cleaned = cleaned.replace(/\*[^*\n]{1,200}\*/g, ' ');
  cleaned = cleaned.replace(/_[^_\n]{1,200}_/g, ' ');
  cleaned = cleaned.replace(/\([^)\n]{1,200}\)/g, ' ');
  cleaned = cleaned.replace(/\[[^\]\n]{1,200}\]/g, ' ');
  cleaned = cleaned.replace(/[*_~`#>]/g, '');
  cleaned = cleaned.replace(
    /^(?:Customer|Parent|Mother|Father|Rep|Sales rep)\s*:\s*/i,
    ''
  );
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}
