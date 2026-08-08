import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickCohortForLevel } from '../src/modules/training-planner/planner.service.js';
import { computeDeltas } from '../src/modules/agents/coach.agent.js';

test('cohort ladder: new reps start on the easiest empirical rung', () => {
  assert.equal(pickCohortForLevel(null), 'east_belt_middle'); // 16.8% sale rate
  assert.equal(pickCohortForLevel(30), 'east_belt_middle');
  assert.equal(pickCohortForLevel(50), 'premium_school');
  assert.equal(pickCohortForLevel(60), 'board_year');
  assert.equal(pickCohortForLevel(70), 'mainstream_middle');
  assert.equal(pickCohortForLevel(90), 'early_grade_value'); // 9.0% — hardest
});

test('skill deltas are capped: one session cannot swing the graph', () => {
  const observer = { confidence: 100, scores: { pricing: 100 }, mode: 'llm' };
  const graph = [{ skillId: 'pricing', score: 10 }];
  const deltas = computeDeltas(observer, graph, 'pricing');
  assert.equal(deltas.length, 1);
  assert.ok(Math.abs(deltas[0].delta) <= 8, `delta ${deltas[0].delta} exceeds per-session cap`);
});

test('low-confidence (mock) evaluations move the graph far less', () => {
  const graph = [{ skillId: 'pricing', score: 40 }];
  const strong = computeDeltas({ confidence: 100, scores: { pricing: 70 } }, graph, 'pricing');
  const weak = computeDeltas({ confidence: 25, scores: { pricing: 70 }, mode: 'mock' }, graph, 'pricing');
  const strongDelta = strong[0]?.delta ?? 0;
  const weakDelta = weak[0]?.delta ?? 0;
  assert.ok(weakDelta < strongDelta, `mock delta ${weakDelta} should be < llm delta ${strongDelta}`);
});

test('unscored skills never move — absence of evidence is not evidence', () => {
  const observer = { confidence: 100, scores: { pricing: 80 } };
  const graph = [
    { skillId: 'pricing', score: 50 },
    { skillId: 'closing', score: 50 },
  ];
  const deltas = computeDeltas(observer, graph, 'pricing');
  assert.ok(!deltas.some((d) => d.skillId === 'closing'));
});
