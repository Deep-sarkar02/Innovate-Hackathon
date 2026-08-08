import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeQuizOutcomes,
  deriveWeakSkills,
  pickObjectiveFromLms,
  quizKeyForProduct,
} from '../src/modules/rep-profile/lms-context.mapper.js';
import { SAMPLE_LMS_CONTEXT } from '../src/seed/lms-context.sample.js';

test('quizKeyForProduct maps CRT module labels', () => {
  assert.equal(quizKeyForProduct('Target Exams'), 'target_exams');
  assert.equal(quizKeyForProduct('LeadSquared'), 'leadsquared');
});

test('normalizeQuizOutcomes flattens productKnowledge and dailyPerformance', () => {
  const outcomes = normalizeQuizOutcomes(SAMPLE_LMS_CONTEXT);
  assert.ok(outcomes.target_exams);
  assert.ok(outcomes.leadsquared);
  assert.equal(outcomes.target_exams.score, 75);
  assert.equal(outcomes.leadsquared.score, 95);
  assert.ok(outcomes.target_exams.completedAt);
});

test('deriveWeakSkills prioritises JEE/NEET gaps from sample profile', () => {
  const ranked = deriveWeakSkills(SAMPLE_LMS_CONTEXT);
  const topIds = ranked.slice(0, 3).map((s) => s.skillId);
  assert.ok(
    topIds.some((id) => ['jee_specific', 'neet_specific', 'academic_knowledge', 'objection_handling'].includes(id)),
  );
});

test('pickObjectiveFromLms returns a skill id', () => {
  const objective = pickObjectiveFromLms(SAMPLE_LMS_CONTEXT);
  assert.ok(typeof objective === 'string' && objective.length > 0);
});
