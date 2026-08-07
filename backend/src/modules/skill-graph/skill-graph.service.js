import { UserSkillProgress } from '../../models/UserSkillProgress.js';
import { SkillUpdate } from '../../models/SkillUpdate.js';
import { Skill } from '../../models/Skill.js';

export async function getSkillGraphForUser(userId) {
  const progress = await UserSkillProgress.find({ userId }).lean();
  const skills = await Skill.find().lean();
  const skillMap = Object.fromEntries(skills.map((s) => [s.skillId, s]));

  const bySkillId = new Map();
  for (const p of progress) {
    const existing = bySkillId.get(p.skillId);
    if (!existing || p.lastUpdated > existing.lastUpdated) {
      bySkillId.set(p.skillId, p);
    }
  }

  return [...bySkillId.values()].map((p) => ({
    skillId: p.skillId,
    name: skillMap[p.skillId]?.name ?? p.skillId,
    category: skillMap[p.skillId]?.category ?? 'unknown',
    weight: skillMap[p.skillId]?.weight ?? 1,
    score: p.score,
    trend: p.trend,
    sessionCount: p.sessionCount,
    masteredAt: p.masteredAt,
    deprioritizedUntil: p.deprioritizedUntil,
  }));
}

export async function getWeakestSkills(userId, limit = 5) {
  const graph = await getSkillGraphForUser(userId);
  const seen = new Set();
  return graph
    .filter((s) => !s.masteredAt && (!s.deprioritizedUntil || s.deprioritizedUntil < new Date()))
    .filter((s) => {
      if (seen.has(s.skillId)) return false;
      seen.add(s.skillId);
      return true;
    })
    .sort((a, b) => (a.score - b.score) || (b.weight - a.weight))
    .slice(0, limit);
}

export async function applySkillDeltas(userId, sessionId, deltas) {
  if (deltas.length === 0) return [];

  // One read + one bulkWrite + one insertMany — the previous version issued
  // 2 sequential round-trips PER skill (findOne + save + create), ~90 queries
  // on a 45-skill session.
  const skillIds = deltas.map((d) => d.skillId);
  const progressDocs = await UserSkillProgress.find({ userId, skillId: { $in: skillIds } }).lean();
  const progressMap = Object.fromEntries(progressDocs.map((p) => [p.skillId, p]));

  const updates = [];
  const bulkOps = [];
  const logDocs = [];
  const now = new Date();

  for (const { skillId, delta, reason } of deltas) {
    const progress = progressMap[skillId];
    if (!progress) continue;

    const previousScore = progress.score;
    const newScore = Math.max(0, Math.min(100, previousScore + delta));
    const improvementStreak = delta > 0 ? (progress.improvementStreak ?? 0) + 1 : 0;

    const set = {
      lastScore: previousScore,
      score: newScore,
      trend: newScore - previousScore,
      sessionCount: (progress.sessionCount ?? 0) + 1,
      attemptCount: (progress.attemptCount ?? 0) + 1,
      improvementStreak,
      lastUpdated: now,
    };
    if (newScore >= 80 && improvementStreak >= 3) set.masteredAt = now;

    bulkOps.push({ updateOne: { filter: { userId, skillId }, update: { $set: set } } });
    logDocs.push({ userId, sessionId, skillId, previousScore, newScore, delta, reason });
    updates.push({ skillId, previousScore, newScore, delta });
  }

  if (bulkOps.length > 0) await UserSkillProgress.bulkWrite(bulkOps, { ordered: false });
  if (logDocs.length > 0) await SkillUpdate.insertMany(logDocs);

  return updates;
}

export async function getTeamSkillRollup() {
  const skills = await Skill.find().lean();
  const allProgress = await UserSkillProgress.find().lean();

  const bySkill = {};
  for (const skill of skills) {
    bySkill[skill.skillId] = { scores: [], name: skill.name, category: skill.category, weight: skill.weight };
  }

  for (const p of allProgress) {
    if (bySkill[p.skillId]) {
      bySkill[p.skillId].scores.push(p.score);
    }
  }

  const rollups = Object.entries(bySkill).map(([skillId, data]) => {
    const avg = data.scores.length
      ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
      : 0;
    return {
      skillId,
      name: data.name,
      category: data.category,
      weight: data.weight,
      averageScore: Math.round(avg),
      repCount: data.scores.length,
    };
  });

  rollups.sort((a, b) => a.averageScore - b.averageScore);
  return rollups;
}

export async function getRepProgressHistory(userId) {
  const updates = await SkillUpdate.find({ userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const bySkill = {};
  for (const u of updates) {
    if (!bySkill[u.skillId]) bySkill[u.skillId] = [];
    bySkill[u.skillId].push({ score: u.newScore, date: u.createdAt, delta: u.delta });
  }

  return bySkill;
}

export async function deprioritizeSkill(userId, skillId, days = 7) {
  const until = new Date();
  until.setDate(until.getDate() + days);
  await UserSkillProgress.findOneAndUpdate({ userId, skillId }, { deprioritizedUntil: until });
}
