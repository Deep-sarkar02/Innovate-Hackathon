import { UserSkillProgress } from '../../models/UserSkillProgress.js';
import { deprioritizeSkill } from '../skill-graph/skill-graph.service.js';

const MAX_FAILURES = 5;
const MIN_IMPROVEMENT = 5;
const MASTERY_THRESHOLD = 80;
const MASTERY_STREAK = 3;

export async function checkReinforcement(userId, skillId, newScore, previousScore) {
  const progress = await UserSkillProgress.findOne({ userId, skillId });
  if (!progress) return null;

  const improved = newScore - previousScore >= MIN_IMPROVEMENT;

  if (!improved && progress.attemptCount >= MAX_FAILURES && progress.improvementStreak === 0) {
    await deprioritizeSkill(userId, skillId, 7);
    return { action: 'deprioritized', skillId, reason: `${MAX_FAILURES} attempts without improvement` };
  }

  if (newScore >= MASTERY_THRESHOLD && progress.improvementStreak >= MASTERY_STREAK) {
    progress.masteredAt = new Date();
    await progress.save();
    return { action: 'mastered', skillId };
  }

  return { action: 'continue', skillId, improved };
}

export async function getReinforcementState(userId) {
  const progress = await UserSkillProgress.find({ userId }).lean();
  return progress.map((p) => ({
    skillId: p.skillId,
    score: p.score,
    attemptCount: p.attemptCount,
    improvementStreak: p.improvementStreak,
    masteredAt: p.masteredAt,
    deprioritizedUntil: p.deprioritizedUntil,
  }));
}
