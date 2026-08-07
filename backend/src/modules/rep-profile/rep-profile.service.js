import { RepProfile } from '../../models/RepProfile.js';
import { UserSkillProgress } from '../../models/UserSkillProgress.js';
import { Skill } from '../../models/Skill.js';
import { getSkillGraphForUser } from '../skill-graph/skill-graph.service.js';

const DEFAULT_QUIZ_OUTCOMES = {
  scholarship_basics: { score: 78, completedAt: new Date('2026-08-01'), attempts: 2 },
  pricing_emi: { score: 45, completedAt: new Date('2026-08-03'), attempts: 1 },
  objection_handling: { score: 62, completedAt: null, attempts: 0 },
  closing_techniques: { score: 55, completedAt: null, attempts: 0 },
};

const DEFAULT_SKILL_SCORES = {
  greeting: 95,
  rapport: 92,
  need_discovery: 88,
  need_mapping: 85,
  active_listening: 80,
  empathy: 78,
  confidence: 75,
  academic_knowledge: 70,
  scholarship: 65,
  pricing: 40,
  emi_plans: 38,
  objection_handling: 55,
  price_objection: 35,
  competitor_comparison: 50,
  closing: 37,
  follow_up: 60,
  neet_specific: 72,
  dropper_handling: 68,
  parent_engagement: 58,
};

export async function getOrCreateRepProfile(userId) {
  let profile = await RepProfile.findOne({ userId });
  if (!profile) {
    profile = await RepProfile.create({
      userId,
      city: 'Hyderabad',
      region: 'South',
      language: 'hi',
      cohortAssignments: ['NEET_Dropper_v2'],
      quizOutcomes: DEFAULT_QUIZ_OUTCOMES,
      learningVelocity: 0.12,
    });
  }
  return profile;
}

export async function initializeRepSkillProgress(userId) {
  const skills = await Skill.find().lean();
  const existing = await UserSkillProgress.find({ userId }).lean();
  const existingIds = new Set(existing.map((e) => e.skillId));

  const toCreate = skills
    .filter((s) => !existingIds.has(s.skillId))
    .map((s) => ({
      userId,
      skillId: s.skillId,
      score: DEFAULT_SKILL_SCORES[s.skillId] ?? 50,
      trend: 0,
      sessionCount: 0,
    }));

  if (toCreate.length > 0) {
    await UserSkillProgress.insertMany(toCreate);
  }

  for (const [skillId, score] of Object.entries(DEFAULT_SKILL_SCORES)) {
    await UserSkillProgress.findOneAndUpdate(
      { userId, skillId },
      { score },
      { upsert: false }
    );
  }
}

export async function getRepProfileWithSkills(userId) {
  await getOrCreateRepProfile(userId);
  await initializeRepSkillProgress(userId);

  const profile = await RepProfile.findOne({ userId }).lean();
  const skillGraph = await getSkillGraphForUser(userId);

  const quizOutcomes = {};
  if (profile.quizOutcomes) {
    const entries = profile.quizOutcomes instanceof Map
      ? profile.quizOutcomes.entries()
      : Object.entries(profile.quizOutcomes);
    for (const [key, val] of entries) {
      quizOutcomes[key] = val;
    }
  }

  return {
    userId: profile.userId,
    city: profile.city,
    region: profile.region,
    language: profile.language,
    cohortAssignments: profile.cohortAssignments,
    quizOutcomes,
    learningVelocity: profile.learningVelocity,
    lastSessionAt: profile.lastSessionAt,
    skillGraph,
  };
}

export async function updateRepProfile(userId, updates) {
  const profile = await getOrCreateRepProfile(userId);

  if (updates.city) profile.city = updates.city;
  if (updates.region) profile.region = updates.region;
  if (updates.language) profile.language = updates.language;
  if (updates.cohortAssignments) profile.cohortAssignments = updates.cohortAssignments;

  await profile.save();
  return getRepProfileWithSkills(userId);
}

export async function updateQuizOutcomes(userId, quizOutcomes) {
  const profile = await getOrCreateRepProfile(userId);

  for (const [moduleId, outcome] of Object.entries(quizOutcomes)) {
    profile.quizOutcomes.set(moduleId, {
      score: outcome.score,
      completedAt: outcome.completedAt ? new Date(outcome.completedAt) : new Date(),
      attempts: outcome.attempts ?? (profile.quizOutcomes.get(moduleId)?.attempts ?? 0) + 1,
    });
  }

  await profile.save();
  return getRepProfileWithSkills(userId);
}

export async function updateLearningVelocity(userId, delta) {
  const profile = await getOrCreateRepProfile(userId);
  profile.learningVelocity = Math.round((profile.learningVelocity * 0.7 + delta * 0.3) * 100) / 100;
  profile.lastSessionAt = new Date();
  await profile.save();
  return profile;
}

export async function seedDemoRepProfile(userId) {
  await getOrCreateRepProfile(userId);
  await initializeRepSkillProgress(userId);
  console.log('[seed] Demo rep profile initialized');
}
