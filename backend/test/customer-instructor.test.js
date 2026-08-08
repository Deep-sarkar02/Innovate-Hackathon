import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInstructorPrompt,
  buildPersonaVariables,
  resolvePersonaRole,
} from '../src/modules/customer-profiles/customer-instructor.js';
import { buildSessionBriefFromProfile, getCustomerProfile, listCustomerProfiles, resolveVoiceGender } from '../src/modules/customer-profiles/customer-profiles.service.js';

test('resolvePersonaRole reads persona from session brief string', () => {
  assert.equal(resolvePersonaRole({ persona: 'mother' }), 'mother');
  assert.equal(resolvePersonaRole({ persona: 'father' }), 'father');
  assert.equal(resolvePersonaRole({ personaRole: 'student' }), 'student');
});

test('mother profile injects mother identity into instructor prompt — not hardcoded father', () => {
  const profile = getCustomerProfile('moderate_mother_g5_early_grade');
  assert.ok(profile, 'mother profile exists in seed');

  const brief = buildSessionBriefFromProfile(profile, { language: 'en' });
  assert.equal(brief.persona, 'mother');
  assert.equal(brief.customerName, 'Sunita Sharma');
  assert.equal(resolveVoiceGender(brief), 'female');

  const vars = buildPersonaVariables(brief);
  assert.equal(vars.persona_role, 'mother');
  assert.equal(vars.parent_name, 'Sunita Sharma');
  assert.equal(vars.child_name, 'Tarini');

  const prompt = buildInstructorPrompt(brief, { turnCount: 2, conversationPhase: 'discovery' });
  assert.match(prompt, /Sunita Sharma/);
  assert.match(prompt, /the mother of Tarini/i);
  assert.match(prompt, /IDENTITY LOCK.*MOTHER/i);
  assert.doesNotMatch(prompt, /Rajesh Kumar/);
  assert.doesNotMatch(prompt, /the father of Ansh/i);
});

test('father profile keeps father identity in instructor prompt', () => {
  const profile = getCustomerProfile('moderate_father_g7_mainstream');
  const brief = buildSessionBriefFromProfile(profile, { language: 'en' });
  const prompt = buildInstructorPrompt(brief, { turnCount: 1, conversationPhase: 'cold_open' });

  assert.equal(brief.persona, 'father');
  assert.match(prompt, /Rajesh Kumar/);
  assert.match(prompt, /IDENTITY LOCK.*FATHER/i);
});

// Regression: listCustomerProfiles() passes the RAW profile (persona is an
// object), not a sessionBrief (persona is a string). The old `??` chain took
// the object, failed the typeof-string check, and defaulted every persona to
// 'father' — so the picker showed mothers with a male voice.
test('resolvePersonaRole reads persona.role from a raw profile object', () => {
  assert.equal(resolvePersonaRole({ persona: { role: 'mother' } }), 'mother');
  assert.equal(resolvePersonaRole({ persona: { role: 'student' } }), 'student');
  assert.equal(resolvePersonaRole({ persona: { role: 'both_parents' } }), 'father');
});

test('every seeded profile resolves a voice gender matching its persona role', () => {
  const profiles = listCustomerProfiles();
  assert.ok(profiles.length >= 7, `expected the full ladder, got ${profiles.length}`);

  const expected = { mother: 'female', father: 'male' };
  for (const p of profiles) {
    const want = expected[p.persona.role]
      ?? (p.persona.childGender === 'female' ? 'female' : 'male'); // student
    assert.equal(
      p.voiceGender, want,
      `${p.profileId} (${p.persona.role}) got ${p.voiceGender}, expected ${want}`,
    );
  }

  // Not every persona may be voiced male — that was the symptom of the bug.
  assert.ok(
    new Set(profiles.map((p) => p.voiceGender)).size > 1,
    'all profiles resolved to one gender — resolvePersonaRole is falling through to its default',
  );
});
