import { callLLM, isLlmConfigured } from './llm.client.js';
import { applySkillDeltas } from '../skill-graph/skill-graph.service.js';
import { updateLearningVelocity } from '../rep-profile/rep-profile.service.js';
import { getRecommendationsForSkills } from '../lms-recommend/recommend.service.js';
import { checkReinforcement } from '../coaching/reinforcement.service.js';
import { SessionInsight } from '../../models/SessionInsight.js';

// Max the graph can move on ONE session. Second-order guard: without a cap,
// a single noisy evaluation (or a rep who found a phrase that games the
// Observer) swings the graph, which redirects the planner, which changes
// what everyone trains next. One session is one data point.
const MAX_DELTA_PER_SESSION = 8;

// exported for unit tests
export function computeDeltas(observerOutput, currentGraph, objective) {
  const deltas = [];
  const graphMap = Object.fromEntries(currentGraph.map((s) => [s.skillId, s.score]));

  // Confidence-weight the learning rate: a mock/heuristic evaluation
  // (confidence ≤35) moves the graph at a fraction of a real one.
  const confidence = (observerOutput.confidence ?? 50) / 100;
  const learningRate = 0.3 * confidence;

  for (const [skillId, observedScore] of Object.entries(observerOutput.scores ?? {})) {
    // Only skills the Observer actually scored (evidence-backed) arrive here —
    // unobserved skills are omitted upstream and must never move.
    const current = graphMap[skillId] ?? 50;
    const raw = Math.round((observedScore - current) * learningRate);
    const delta = Math.max(-MAX_DELTA_PER_SESSION, Math.min(MAX_DELTA_PER_SESSION, raw));
    if (delta !== 0) {
      deltas.push({
        skillId,
        delta,
        reason:
          (skillId === objective ? 'Primary session objective' : 'Observed during session')
          + (observerOutput.mode === 'mock' ? ' (heuristic evaluation — low weight)' : ''),
      });
    }
  }

  return deltas;
}

function mockCoachFeedback(sessionBrief, observerOutput, skillDeltas) {
  const objectiveDelta = skillDeltas.find((d) => d.skillId === sessionBrief.objective);
  const improved = objectiveDelta && objectiveDelta.delta > 0;

  return improved
    ? `Good progress on ${sessionBrief.objective.replace(/_/g, ' ')}. Keep building on the scholarship angle and push toward closing.`
    : `Focus needed on ${sessionBrief.objective.replace(/_/g, ' ')}. Review the recommended LMS module before your next session. Address ${sessionBrief.primaryObjection.replace(/_/g, ' ')} more directly.`;
}

export async function coachSession({
  repId,
  sessionId,
  sessionBrief,
  observerOutput,
  currentGraph,
  durationMinutes,
}) {
  const skillDeltas = computeDeltas(observerOutput, currentGraph, sessionBrief.objective);
  const appliedDeltas = await applySkillDeltas(repId, sessionId, skillDeltas);

  const avgDelta = appliedDeltas.length
    ? appliedDeltas.reduce((s, d) => s + d.delta, 0) / appliedDeltas.length
    : 0;
  await updateLearningVelocity(repId, avgDelta / 10);

  for (const d of appliedDeltas) {
    await checkReinforcement(repId, d.skillId, d.newScore, d.previousScore);
  }

  const weakSkills = appliedDeltas
    .filter((d) => d.newScore < 60)
    .map((d) => d.skillId);
  const lmsRecommendations = getRecommendationsForSkills(weakSkills, sessionBrief.objective);

  let coachFeedback = mockCoachFeedback(sessionBrief, observerOutput, appliedDeltas);

  if (isLlmConfigured()) {
    const aiFeedback = await callLLM([
      {
        role: 'system',
        content: `You are a Coach Agent. Provide brief, actionable feedback (2-3 sentences) for a sales rep after a training session. Never generate customer dialogue.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          objective: sessionBrief.objective,
          mistakes: observerOutput.mistakes,
          highlights: observerOutput.highlights,
          skillDeltas: appliedDeltas.filter((d) => d.skillId === sessionBrief.objective),
          recommendations: lmsRecommendations,
        }),
      },
    ]);
    if (aiFeedback) coachFeedback = aiFeedback.trim();
  }

  const insight = await SessionInsight.create({
    sessionId,
    repId,
    objective: sessionBrief.objective,
    cohortId: sessionBrief.cohortId,
    cohortVersion: sessionBrief.cohortVersion,
    skillDeltas: appliedDeltas.map((d) => ({
      skillId: d.skillId,
      previousScore: d.previousScore,
      newScore: d.newScore,
      delta: d.delta,
    })),
    mistakes: observerOutput.mistakes ?? [],
    highlights: observerOutput.highlights ?? [],
    keyQuotes: observerOutput.keyQuotes ?? [],
    confidence: observerOutput.confidence ?? 50,
    evaluationMode: observerOutput.mode ?? 'mock',
    evidenceQuotes: observerOutput.evidenceQuotes ?? {},
    durationMinutes,
    // null when the objective skill was never exercised — do not fake a 50
    ...(observerOutput.overallScore != null ? { overallScore: observerOutput.overallScore } : {}),
    coachFeedback,
    lmsRecommendations,
    observerScores: observerOutput.scores ?? {},
  });

  return {
    insight,
    skillDeltas: appliedDeltas,
    coachFeedback,
    lmsRecommendations,
  };
}
