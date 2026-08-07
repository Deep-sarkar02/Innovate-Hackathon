import { SessionInsight } from '../../models/SessionInsight.js';
import { RepProfile } from '../../models/RepProfile.js';
import { User } from '../../models/User.js';
import { getTeamSkillRollup } from '../skill-graph/skill-graph.service.js';
import { getModuleCatalog } from '../lms-recommend/recommend.service.js';

export async function getTeamAnalytics() {
  const rollups = await getTeamSkillRollup();
  const weakest = rollups[0] ?? null;

  const insights = await SessionInsight.find().sort({ createdAt: -1 }).limit(500).lean();

  const cohortFailures = {};
  for (const i of insights) {
    const key = `${i.cohortId}_v${i.cohortVersion}`;
    if (!cohortFailures[key]) cohortFailures[key] = { total: 0, failed: 0 };
    cohortFailures[key].total += 1;
    if (i.overallScore < 60) cohortFailures[key].failed += 1;
  }

  let mostFailedCohort = null;
  let highestFailRate = 0;
  for (const [cohort, data] of Object.entries(cohortFailures)) {
    const rate = data.total ? data.failed / data.total : 0;
    if (rate > highestFailRate) {
      highestFailRate = rate;
      mostFailedCohort = { cohort, failRate: Math.round(rate * 100), sessions: data.total };
    }
  }

  const recentInsights = insights.filter((i) => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return i.createdAt >= weekAgo;
  });

  const objectiveScores = {};
  for (const i of recentInsights) {
    if (!objectiveScores[i.objective]) objectiveScores[i.objective] = [];
    objectiveScores[i.objective].push(i.overallScore);
  }

  let trend = 0;
  if (weakest) {
    const recent = objectiveScores[weakest.skillId] ?? [];
    if (recent.length >= 2) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      trend = Math.round(((avgSecond - avgFirst) / (avgFirst || 1)) * 100);
    }
  }

  const modules = getModuleCatalog();
  const recommendedModule = weakest
    ? modules.find((m) => m.skills.includes(weakest.skillId)) ?? modules[0]
    : modules[0];

  return {
    teamWeakestSkill: weakest
      ? { skillId: weakest.skillId, name: weakest.name, averageScore: weakest.averageScore, trend }
      : null,
    mostFailedCohort,
    recommendedLmsModule: recommendedModule
      ? { moduleId: recommendedModule.moduleId, title: recommendedModule.title, url: recommendedModule.url }
      : null,
    totalSessions: insights.length,
    averageOverallScore: insights.length
      ? Math.round(insights.reduce((s, i) => s + (i.overallScore ?? 0), 0) / insights.length)
      : 0,
  };
}

export async function getRepAnalytics(repId) {
  const insights = await SessionInsight.find({ repId }).sort({ createdAt: -1 }).limit(50).lean();
  const profile = await RepProfile.findOne({ repId }).lean();

  const skillTrends = {};
  for (const i of insights) {
    for (const d of i.skillDeltas ?? []) {
      if (!skillTrends[d.skillId]) skillTrends[d.skillId] = [];
      skillTrends[d.skillId].push({ score: d.newScore, date: i.createdAt, delta: d.delta });
    }
  }

  return {
    repId,
    learningVelocity: profile?.learningVelocity ?? 0,
    lastSessionAt: profile?.lastSessionAt,
    sessionCount: insights.length,
    recentSessions: insights.slice(0, 10).map((i) => ({
      sessionId: i.sessionId,
      objective: i.objective,
      overallScore: i.overallScore,
      date: i.createdAt,
    })),
    skillTrends,
  };
}

export async function getRepLeaderboard() {
  const profiles = await RepProfile.find().lean();
  const users = await User.find({ role: 'sales_executive' }).lean();
  const userMap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));

  return profiles
    .map((p) => ({
      repId: p.userId,
      name: userMap[p.userId.toString()]?.name ?? 'Unknown',
      learningVelocity: p.learningVelocity,
      lastSessionAt: p.lastSessionAt,
      city: p.city,
    }))
    .sort((a, b) => b.learningVelocity - a.learningVelocity);
}
