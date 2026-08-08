import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genderForPersona } from '../src/modules/tts/persona-gender.js';
import { resolvePollyVoice, POLLY_VOICES } from '../src/modules/tts/polly.voices.js';
import { resolveSarvamVoice } from '../src/modules/sarvam/sarvam.voices.js';
import { listCustomerProfiles } from '../src/modules/customer-profiles/customer-profiles.service.js';

test('parent roles override the requested gender — a father is never female', () => {
  assert.equal(genderForPersona('female', 'father'), 'male');
  assert.equal(genderForPersona('male', 'mother'), 'female');
  assert.equal(genderForPersona('female', 'both_parents'), 'male');
});

test('a student keeps the caller gender — it follows the child, not the role', () => {
  // Polly used to force every student male, mis-voicing female students.
  assert.equal(genderForPersona('female', 'student'), 'female');
  assert.equal(genderForPersona('male', 'student'), 'male');
});

test('no persona falls back to the requested gender', () => {
  assert.equal(genderForPersona('male', null), 'male');
  assert.equal(genderForPersona('female', null), 'female');
});

test('Polly and Sarvam agree on gender for every persona/language combo', () => {
  const femaleSarvam = new Set(['priya', 'kavya']);
  const femalePolly = new Set(['Kajal', 'Aditi', 'Raveena']);

  for (const lang of ['en', 'hi']) {
    for (const [persona, requested, want] of [
      ['father', 'female', 'male'],
      ['mother', 'male', 'female'],
      ['student', 'female', 'female'],
      ['student', 'male', 'male'],
    ]) {
      const s = resolveSarvamVoice(lang, requested, persona);
      const p = resolvePollyVoice(lang, requested, persona);
      const sGender = femaleSarvam.has(s.speaker) ? 'female' : 'male';
      const pGender = femalePolly.has(p.voiceId) ? 'female' : 'male';
      assert.equal(sGender, want, `sarvam ${lang}/${persona}/${requested} -> ${s.speaker}`);
      assert.equal(pGender, want, `polly ${lang}/${persona}/${requested} -> ${p.voiceId}`);
    }
  }
});

test('Polly never voices a male persona with a female voice, even in Hindi', () => {
  // Polly has NO Hindi male voice, so the correct behaviour is to downgrade the
  // language (Matthew en-US) rather than hand back Kajal and sound like a woman.
  for (const lang of ['en', 'hi']) {
    const v = resolvePollyVoice(lang, 'male', 'father');
    assert.ok(
      !['Kajal', 'Aditi', 'Raveena'].includes(v.voiceId),
      `${lang} father resolved to the female voice ${v.voiceId}`,
    );
    assert.equal(v.genderMatch, true);
  }
  // And the compromise must be reported, not hidden.
  assert.ok(POLLY_VOICES.hi.male.warning, 'Hindi male fallback must carry a warning');
});

test('every seeded profile drives a gender-correct voice end to end', () => {
  for (const p of listCustomerProfiles()) {
    const want = p.persona.role === 'mother' ? 'female'
      : p.persona.role === 'father' ? 'male'
        : (p.persona.childGender === 'female' ? 'female' : 'male');

    assert.equal(p.voiceGender, want, `${p.profileId} voiceGender`);

    const resolved = genderForPersona(p.voiceGender, p.persona.role);
    assert.equal(resolved, want, `${p.profileId} through the TTS gender rule`);
  }
});
