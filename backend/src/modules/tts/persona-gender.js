/**
 * Single source of truth for "which voice gender does this persona get?",
 * shared by every TTS provider so Sarvam and Polly cannot drift apart.
 *
 * A parent's gender is fixed by their role, so it overrides whatever gender the
 * caller passed — that override is what stops a wrong client-side selection
 * from putting a woman's voice on a father.
 *
 * A STUDENT is deliberately NOT overridden. The student's gender follows the
 * child, which resolveVoiceGender() has already derived from persona
 * .child_gender upstream. Polly used to force students male, which mis-voiced
 * every female student.
 */
export function genderForPersona(voiceGender = 'female', persona = null) {
  if (persona === 'mother') return 'female';
  if (persona === 'father' || persona === 'both_parents') return 'male';
  return voiceGender === 'male' ? 'male' : 'female';
}
