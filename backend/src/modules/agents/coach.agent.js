import { callLLM, isLlmConfigured } from './llm.client.js';
import { applySkillDeltas } from '../skill-graph/skill-graph.service.js';
import { updateLearningVelocity } from '../rep-profile/rep-profile.service.js';
import { getRecommendationsForSkills } from '../lms-recommend/recommend.service.js';
import { checkReinforcement } from '../coaching/reinforcement.service.js';
import { SessionInsight } from '../../models/SessionInsight.js';

function computeDeltas(observerScores, currentGraph, objective) {
  const deltas = [];
  const graphMap = Object.fromEntries(currentGraph.map((s) => [s.skillId, s.score]));

  for (const [skillId, observedScore] of Object.entries(observerScores.scores ?? {})) {
    const current = graphMap[skillId] ?? 50;
    const target = observedScore;
    const delta = Math.round((target - current) * 0.3);
    if (delta !== 0) {
      deltas.push({
        skillId,
        delta,
        reason: skillId === objective ? 'Primary session objective' : 'Observed during session',
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
    durationMinutes,
    overallScore: observerOutput.overallScore ?? 50,
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
