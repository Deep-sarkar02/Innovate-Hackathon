import { Cohort } from '../../models/Cohort.js';
import { SessionInsight } from '../../models/SessionInsight.js';
import { UserSkillProgress } from '../../models/UserSkillProgress.js';
import { getWeakestSkills } from '../skill-graph/skill-graph.service.js';
import { getOrCreateRepProfile } from '../rep-profile/rep-profile.service.js';

const SKILL_THRESHOLD = 60;
const MAX_FAILURES_BEFORE_ROTATE = 5;
const QUIZ_WEAK_THRESHOLD = 70;

const PERSONA_MAP = {
  pricing: ['father', 'mother'],
  scholarship: ['father', 'student'],
  closing: ['student', 'mother'],
  objection_handling: ['father', 'student'],
  need_discovery: ['student', 'mother'],
  competitor_comparison: ['father', 'student'],
  parent_engagement: ['father', 'mother'],
};

const OBJECTION_MAP = {
  pricing: 'high_fees',
  scholarship: 'scholarship_not_enough',
  closing: 'need_to_think',
  objection_handling: 'already_tried_coaching',
  competitor_comparison: 'competitor_cheaper',
  parent_engagement: 'need_parent_approval',
  neet_specific: 'online_is_enough',
};

const GOAL_TEMPLATES = {
  pricing: 'Can rep overcome pricing objection and move to closing?',
  scholarship: 'Can rep explain scholarship options and build value?',
  closing: 'Can rep successfully close and get commitment?',
  objection_handling: 'Can rep handle objections using LAER framework?',
  competitor_comparison: 'Can rep differentiate against competitors?',
  parent_engagement: 'Can rep engage parent and address their concerns?',
  need_discovery: 'Can rep uncover student needs through effective questioning?',
};

function pickObjective(weakestSkills, quizOutcomes, progressRecords) {
  const candidates = [];

  for (const skill of weakestSkills) {
    if (skill.score >= SKILL_THRESHOLD) continue;
    if (skill.deprioritizedUntil && skill.deprioritizedUntil > new Date()) continue;

    const progress = progressRecords.find((p) => p.skillId === skill.skillId);
    if (progress?.attemptCount >= MAX_FAILURES_BEFORE_ROTATE && progress.improvementStreak === 0) {
      continue;
    }

    let priority = (SKILL_THRESHOLD - skill.score) * skill.weight;

    const relatedModules = skill.skillId;
    for (const [moduleId, outcome] of Object.entries(quizOutcomes)) {
      if (moduleId.includes(skill.skillId.split('_')[0]) && outcome.score < QUIZ_WEAK_THRESHOLD) {
        priority += 20;
      }
    }

    candidates.push({ skillId: skill.skillId, name: skill.name, priority, score: skill.score });
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0]?.skillId ?? 'pricing';
}

function computeDifficulty(objective, skillScore, cohortPresets) {
  const base = cohortPresets ?? {
    knowledge: 3,
    emotion: 2,
    budget: 3,
    timePressure: 3,
    competitorLoyalty: 2,
    decisionAuthority: 3,
  };

  const successRate = skillScore / 100;
  const scale = successRate > 0.7 ? 1.2 : successRate < 0.4 ? 0.8 : 1;

  return {
    knowledge: Math.min(5, Math.max(1, Math.round(base.knowledge * scale))),
    emotion: Math.min(5, Math.max(1, Math.round(base.emotion * (2 - successRate)))),
    budget: Math.min(5, Math.max(1, Math.round(base.budget * (objective === 'pricing' ? 1.3 : 1)))),
    timePressure: Math.min(5, Math.max(1, Math.round(base.timePressure * scale))),
    competitorLoyalty: Math.min(5, Math.max(1, Math.round(base.competitorLoyalty * (2 - successRate)))),
    decisionAuthority: Math.min(5, Math.max(1, Math.round(base.decisionAuthority))),
  };
}

function pickPersona(objective, cohort) {
  const options = PERSONA_MAP[objective] ?? cohort.personas ?? ['father'];
  return options[Math.floor(Math.random() * options.length)];
}

function pickMood(difficulty) {
  if (difficulty.emotion >= 4) return 'skeptical';
  if (difficulty.emotion >= 3) return 'neutral';
  return 'interested';
}

export async function generateSessionBrief(repId) {
  const profile = await getOrCreateRepProfile(repId);
  const weakestSkills = await getWeakestSkills(repId, 10);
  const progressRecords = await UserSkillProgress.find({ userId: repId }).lean();

  const quizOutcomes = {};
  if (profile.quizOutcomes) {
    for (const [key, val] of profile.quizOutcomes.entries?.() ?? Object.entries(profile.quizOutcomes)) {
      quizOutcomes[key] = val;
    }
  }

  const cohortKey = profile.cohortAssignments?.[0] ?? 'NEET_Dropper_v2';
  const [cohortId, versionStr] = cohortKey.includes('_v')
    ? [cohortKey.replace(/_v\d+$/, ''), parseInt(cohortKey.match(/_v(\d+)$/)?.[1] ?? '2', 10)]
    : [cohortKey, 2];

  const cohort = await Cohort.findOne({ cohortId, version: versionStr, isActive: true }).lean()
    ?? await Cohort.findOne({ cohortId, isActive: true }).sort({ version: -1 }).lean();

  const objective = pickObjective(weakestSkills, quizOutcomes, progressRecords);
  const targetSkill = weakestSkills.find((s) => s.skillId === objective) ?? weakestSkills[0];
  const difficulty = computeDifficulty(objective, targetSkill?.score ?? 50, cohort?.difficultyPresets);
  const persona = pickPersona(objective, cohort ?? { personas: ['father'] });
  const mood = pickMood(difficulty);
  const primaryObjection = OBJECTION_MAP[objective]
    ?? cohort?.commonObjections?.[0]
    ?? 'high_fees';

  return {
    objective,
    difficulty,
    persona,
    mood,
    primaryObjection,
    goal: GOAL_TEMPLATES[objective] ?? `Can rep demonstrate proficiency in ${objective}?`,
    cohortId: cohort?.cohortId ?? cohortId,
    cohortVersion: cohort?.version ?? versionStr,
    customerName: persona === 'student' ? 'Rahul' : persona === 'mother' ? 'Mrs. Sharma' : 'Mr. Sharma',
    language: profile.language ?? 'en',
    city: profile.city ?? 'Hyderabad',
    region: profile.region ?? 'South',
  };
}

export async function previewPlan(repId) {
  const brief = await generateSessionBrief(repId);
  const profile = await getOrCreateRepProfile(repId);
  const weakestSkills = await getWeakestSkills(repId, 5);

  return {
    sessionBrief: brief,
    weakestSkills: weakestSkills.map((s) => ({ skillId: s.skillId, name: s.name, score: s.score })),
    repProfile: {
      city: profile.city,
      language: profile.language,
      learningVelocity: profile.learningVelocity,
    },
  };
}
