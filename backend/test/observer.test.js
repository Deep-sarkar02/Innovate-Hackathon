import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  heuristicObserverScores,
  hasWord,
  hasPositiveMention,
  validateLlmResult,
} from '../src/modules/agents/observer.agent.js';

const brief = { objective: 'pricing', primaryObjection: 'financial_constraint' };

function turns(...texts) {
  return texts.map((text) => ({ speaker: 'sales_executive', text }));
}

test('heuristic scoring is deterministic — no randomness, ever', () => {
  const transcript = turns(
    'Hello sir, good evening. I am calling about the test your child took.',
    'What subjects does he find difficult? How are his marks in maths?',
    'The fee is 12000 per year, but on EMI it is only 1000 per month via Bajaj.'
  );
  const a = heuristicObserverScores(brief, transcript);
  const b = heuristicObserverScores(brief, transcript);
  assert.deepEqual(a, b);
});

test('skills without evidence are OMITTED, not scored', () => {
  const out = heuristicObserverScores(brief, turns('Hello sir, good morning.'));
  assert.equal(out.mode, 'mock');
  assert.ok(!('closing' in out.scores), 'closing was never exercised');
  assert.ok(!('emi_plans' in out.scores), 'emi never mentioned');
  assert.ok(out.unscoredSkills.includes('closing'));
});

test('greeting detection uses word boundaries — the old substring bug', () => {
  // These all contain "hi" as a substring and used to classify as greetings
  assert.equal(hasWord('which batch do you offer', ['hi']), false);
  assert.equal(hasWord('the child is in class six', ['hi']), false);
  assert.equal(hasWord('what about this program', ['hi']), false);
  assert.equal(hasWord('hi sir', ['hi']), true);
});

test('negation guard: denying a scholarship is not a scholarship pitch', () => {
  assert.equal(hasPositiveMention('we do not offer any scholarship', ['scholarship']), false);
  assert.equal(hasPositiveMention("we don't have discounts", ['discount']), false);
  assert.equal(hasPositiveMention('we offer a 40% scholarship', ['scholarship']), true);
});

test('LLM validation drops scores without evidence and hallucinated skills', () => {
  const { scores, evidenceQuotes } = validateLlmResult({
    scores: {
      pricing: { score: 70, evidence: 'the fee is 12000 per year' },
      closing: { score: 80, evidence: '' }, // no evidence -> dropped
      made_up_skill: { score: 90, evidence: 'whatever' }, // not grounded -> dropped
      emi_plans: { score: 250, evidence: 'emi via bajaj' }, // clamped
    },
  });
  assert.deepEqual(Object.keys(scores).sort(), ['emi_plans', 'pricing']);
  assert.equal(scores.emi_plans, 100);
  assert.ok(evidenceQuotes.pricing);
});

test('structural mistakes reflect the winning-call corpus rules', () => {
  const out = heuristicObserverScores(
    brief,
    turns('The price is 15000 rupees total for the year. Do you want to enroll?')
  );
  assert.ok(
    out.mistakes.some((m) => m.includes('EMI')),
    'price without EMI translation must be flagged (75.6% of real deals are financed)'
  );
});
