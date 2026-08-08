import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  updateCustomerState,
  mockCustomerReply,
  normalizeObjection,
  GREETING_RE,
} from '../src/modules/agents/customer.agent.js';

function freshState() {
  return {
    belief: 50, trust: 40, urgency: 30, financialComfort: 30,
    emotionalConfidence: 50, academicAnxiety: 60, competitorAffinity: 40,
    decisionReadiness: 20, mentionedTopics: [],
  };
}

test('negated claims do not earn trust — the inverted-semantics bug', () => {
  const state = freshState();
  const before = state.trust;
  updateCustomerState(state, "sorry ma'am, we do not offer any scholarship or discount", {});
  assert.ok(state.trust <= before, `trust went UP on a denial (${before} -> ${state.trust})`);
});

test('diminishing returns: spamming a keyword is not progress', () => {
  const s1 = freshState();
  updateCustomerState(s1, 'we have EMI options', {});
  const firstGain = s1.financialComfort - 30;

  updateCustomerState(s1, 'again, EMI EMI EMI', {});
  const secondGain = s1.financialComfort - 30 - firstGain;

  assert.ok(firstGain > 0, 'first mention should move state');
  assert.ok(secondGain < firstGain, `repeat mention must be worth less (${secondGain} vs ${firstGain})`);
});

test('greeting regex uses word boundaries', () => {
  assert.equal(GREETING_RE.test('which batch is this'), false);
  assert.equal(GREETING_RE.test('the child scored well'), false);
  assert.equal(GREETING_RE.test('hello sir'), true);
  assert.equal(GREETING_RE.test('namaste ji'), true);
});

test('mock reply is PURE — replies never mutate state (double-apply bug)', () => {
  const state = freshState();
  const snapshot = JSON.stringify(state);
  mockCustomerReply({ language: 'en', primaryObjection: 'financial_constraint' }, 'tell me about the scholarship', state);
  assert.equal(JSON.stringify(state), snapshot);
});

test('state values stay clamped to 0-100', () => {
  const state = freshState();
  state.trust = 99;
  for (let i = 0; i < 10; i += 1) {
    updateCustomerState(state, `the test report shows result rank topper ${i}`, {});
  }
  assert.ok(state.trust <= 100 && state.trust >= 0);
});

test('legacy objection ids map onto the real taxonomy', () => {
  assert.equal(normalizeObjection('high_fees'), 'financial_constraint');
  assert.equal(normalizeObjection('need_to_think'), 'need_time');
  assert.equal(normalizeObjection('financial_constraint'), 'financial_constraint');
  assert.equal(normalizeObjection('totally_unknown'), 'financial_constraint');
});
