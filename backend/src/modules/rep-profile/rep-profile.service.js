import { RepProfile } from '../../models/RepProfile.js';

import { UserSkillProgress } from '../../models/UserSkillProgress.js';

import { Skill } from '../../models/Skill.js';

import { getSkillGraphForUser } from '../skill-graph/skill-graph.service.js';

import { SAMPLE_LMS_CONTEXT } from '../../seed/lms-context.sample.js';

import {

  deriveWeakSkills,

  mergeQuizOutcomes,

  normalizeQuizOutcomes,

  sanitizeLmsContext,

} from './lms-context.mapper.js';



const DEFAULT_QUIZ_OUTCOMES = normalizeQuizOutcomes(SAMPLE_LMS_CONTEXT);



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

  jee_specific: 68,

  parent_engagement: 58,

  demo_pitch: 62,

  value_proposition: 65,

  crm_documentation: 90,

  course_structure: 85,

};



function mapLmsContextForResponse(lmsContext) {

  if (!lmsContext) return null;

  const productKnowledge = {};

  if (lmsContext.productKnowledge) {

    const entries = lmsContext.productKnowledge instanceof Map

      ? lmsContext.productKnowledge.entries()

      : Object.entries(lmsContext.productKnowledge);

    for (const [key, val] of entries) productKnowledge[key] = val;

  }

  return {

    ...lmsContext,

    productKnowledge,

  };

}



function applyLmsSkillPriors(userId, lmsContext) {

  const weakSkills = deriveWeakSkills(lmsContext);

  return Promise.all(

    weakSkills.slice(0, 8).map(async ({ skillId, priority }) => {

      const doc = await UserSkillProgress.findOne({ userId, skillId });

      if (!doc) return null;

      doc.score = Math.max(20, doc.score - Math.round(priority / 5));

      return doc.save();

    }),

  );

}



export async function getOrCreateRepProfile(userId) {

  let profile = await RepProfile.findOne({ userId });

  if (!profile) {

    profile = await RepProfile.create({

      userId,

      city: 'Hyderabad',

      region: 'South',

      language: 'hi',

      cohortAssignments: [],

      quizOutcomes: DEFAULT_QUIZ_OUTCOMES,

      lmsContext: sanitizeLmsContext(SAMPLE_LMS_CONTEXT),

      learningVelocity: 0.12,

    });

    await initializeRepSkillProgress(userId);

    await applyLmsSkillPriors(userId, SAMPLE_LMS_CONTEXT);

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

      { upsert: false },

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

    lmsContext: mapLmsContextForResponse(profile.lmsContext),

    learningVelocity: profile.learningVelocity,

    lastSessionAt: profile.lastSessionAt,

    skillGraph,

  };

}



export async function ingestLmsContext(userId, rawPayload) {

  const profile = await getOrCreateRepProfile(userId);

  const lmsContext = sanitizeLmsContext(rawPayload);

  const lmsOutcomes = normalizeQuizOutcomes(lmsContext);



  profile.lmsContext = lmsContext;



  const merged = mergeQuizOutcomes(profile.quizOutcomes, lmsOutcomes);

  profile.quizOutcomes = new Map(Object.entries(merged));

  await profile.save();



  await applyLmsSkillPriors(userId, lmsContext);

  return getRepProfileWithSkills(userId);

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

  await ingestLmsContext(userId, SAMPLE_LMS_CONTEXT);

  console.log('[seed] Demo rep profile initialized with CRT LMS context');

}



export { deriveWeakSkills, pickObjectiveFromLms } from './lms-context.mapper.js';


