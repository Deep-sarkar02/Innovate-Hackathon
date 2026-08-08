/**
 * Strip stage directions / markdown before TTS or transcript display.
 * LLMs often emit *sighs*, (pauses), [narration] — Polly reads those literally.
 */
export function sanitizeForSpeech(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text.trim();

  // *action blocks* (may span partial lines)
  cleaned = cleaned.replace(/\*[^*\n]{1,200}\*/g, ' ');
  // _(italic actions)_
  cleaned = cleaned.replace(/_[^_\n]{1,200}_/g, ' ');
  // (parenthetical stage direction)
  cleaned = cleaned.replace(/\([^)\n]{1,200}\)/g, ' ');
  // [bracket narration]
  cleaned = cleaned.replace(/\[[^\]\n]{1,200}\]/g, ' ');
  // leftover markdown emphasis
  cleaned = cleaned.replace(/[*_~`#>]/g, '');
  // leading narration labels some models emit
  cleaned = cleaned.replace(
    /^(?:Customer|Parent|Mother|Father|Rep|Sales rep)\s*:\s*/i,
    ''
  );
  // collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}
