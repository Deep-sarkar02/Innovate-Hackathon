import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInstructorPrompt,
  buildPersonaVariables,
  resolvePersonaRole,
} from '../src/modules/customer-profiles/customer-instructor.js';
import { buildSessionBriefFromProfile, getCustomerProfile, resolveVoiceGender } from '../src/modules/customer-profiles/customer-profiles.service.js';

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
