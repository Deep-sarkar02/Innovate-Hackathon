import { Cohort } from '../../models/Cohort.js';
import { SessionInsight } from '../../models/SessionInsight.js';
import { UserSkillProgress } from '../../models/UserSkillProgress.js';
import { getSkillGraphForUser, getWeakestSkills } from '../skill-graph/skill-graph.service.js';
import { getOrCreateRepProfile } from '../rep-profile/rep-profile.service.js';
import { deriveWeakSkills, pickObjectiveFromLms } from '../rep-profile/lms-context.mapper.js';
import { COHORT_LADDER } from '../../seed/cohorts.seed.js';
import {
  buildSessionBriefFromProfile,
  getCustomerProfile,
  getDefaultProfile,
  pickProfileForRep,
} from '../customer-profiles/customer-profiles.service.js';

const SKILL_THRESHOLD = 60;
const MAX_FAILURES_BEFORE_ROTATE = 5;
const QUIZ_WEAK_THRESHOLD = 70;

// Personas per objective — parents dominate because the real funnel is 86%
// grade 1-8 (the buyer is always a parent there). 'student' only appears for
// board-year style objectives; 'both_parents' trains multi-decision-maker
// calls (18.6% of real demos have both parents present).
const PERSONA_MAP = {
  pricing: ['father', 'mother', 'both_parents'],
  emi_plans: ['father', 'mother'],
  scholarship: ['father', 'mother'],
  closing: ['father', 'both_parents'],
  objection_handling: ['father', 'mother'],
  need_discovery: ['mother', 'father'],
  competitor_comparison: ['father', 'both_parents'],
  trust_building: ['mother', 'both_parents'],
  urgency_creation: ['mother', 'father'],
  demo_pitch: ['mother', 'father'],
  value_proposition: ['father', 'both_parents'],
  greeting: ['father', 'mother'],
  academic_knowledge: ['father', 'mother'],
  jee_specific: ['father', 'mother'],
  neet_specific: ['mother', 'father'],
  course_structure: ['mother', 'father'],
  crm_documentation: ['father', 'mother'],
  follow_up: ['father', 'mother'],
};

// Objective -> objection, REAL taxonomy with real frequencies:
// financial_constraint 52.1% | need_time 28.2% | trust_deficit 8.3%
// family_consultation 6.8% | competitor_locked 4.6%
const OBJECTION_MAP = {
  pricing: 'financial_constraint',
  emi_plans: 'financial_constraint',
  scholarship: 'financial_constraint',
  closing: 'need_time',
  urgency_creation: 'need_time',
  objection_handling: 'financial_constraint',
  competitor_comparison: 'competitor_locked',
  trust_building: 'trust_deficit',
  demo_pitch: 'need_time',
  need_discovery: 'financial_constraint',
  value_proposition: 'trust_deficit',
  greeting: 'need_time',
  academic_knowledge: 'trust_deficit',
  jee_specific: 'trust_deficit',
  neet_specific: 'trust_deficit',
  course_structure: 'financial_constraint',
  crm_documentation: 'need_time',
  follow_up: 'need_time',
};

const GOAL_TEMPLATES = {
  pricing: 'Can rep hold price for late in the call and translate it to a monthly EMI? (75.6% of real deals are financed)',
  emi_plans: 'Can rep convert an annual price into a concrete EMI plan the parent accepts?',
  scholarship: 'Can rep keep discount as the LAST lever instead of leading with it?',
  closing: 'Can rep convert "need time to think" into a concrete commitment?',
  objection_handling: 'Can rep handle the financial objection without immediately discounting?',
  competitor_comparison: 'Can rep displace an existing tuition/coaching without rubbishing it?',
  trust_building: 'Can rep build trust with test-report evidence and concrete proof?',
  urgency_creation: 'Can rep create legitimate urgency (selection framing) with no exam deadline?',
  need_discovery: 'Can rep diagnose the child\'s gap before pitching?',
  demo_pitch: 'Can rep drive to a demo booking? (90+ min demos close at 21.5% vs <7% for shorter)',
  value_proposition: 'Can rep tie every rupee to the diagnosed gap?',
  academic_knowledge: 'Can rep accurately explain exam patterns, eligibility, and IL product fit?',
  jee_specific: 'Can rep counsel on JEE Main/Advanced eligibility, attempts, and IL JEE programs?',
  neet_specific: 'Can rep counsel on NEET pattern, attempts, and IL NEET offerings without factual errors?',
  course_structure: 'Can rep explain CBSE Foundation batch structure, pricing, and USPs clearly?',
  crm_documentation: 'Can rep follow LeadSquared workflow and document the call correctly?',
  follow_up: 'Can rep set concrete follow-up steps and confirm next actions with the parent?',
};

/**
 * Cohort placement walks the EMPIRICAL difficulty ladder (by real sale rate):
 * east_belt_middle (16.8%) → premium_school → board_year → mainstream_middle
 * → early_grade_value (9.0%). New reps start on the easiest rung; average
 * grounded-skill score moves them up. Exported pure for unit tests.
 */
export function pickCohortForLevel(avgSkillScore) {
  if (avgSkillScore == null || avgSkillScore < 45) return COHORT_LADDER[0];
  if (avgSkillScore < 55) return COHORT_LADDER[1];
  if (avgSkillScore < 65) return COHORT_LADDER[2];
  if (avgSkillScore < 75) return COHORT_LADDER[3];
  return COHORT_LADDER[4];
}

function mapLmsContextPlain(lmsContext) {
  if (!lmsContext) return null;
  const productKnowledge = {};
  if (lmsContext.productKnowledge) {
    for (const [k, v] of lmsContext.productKnowledge.entries?.() ?? Object.entries(lmsContext.productKnowledge)) {
      productKnowledge[k] = v;
    }
  }
  return {
    ...lmsContext,
    productKnowledge: Object.keys(productKnowledge).length ? productKnowledge : lmsContext.productKnowledge,
  };
}

function pickObjective(weakestSkills, quizOutcomes, progressRecords, lmsContext) {
  const lmsPlain = mapLmsContextPlain(lmsContext);
  const lmsBoost = Object.fromEntries(
    deriveWeakSkills(lmsPlain ?? {}).map((s) => [s.skillId, s.priority]),
  );
  const candidates = [];

  for (const skill of weakestSkills) {
    if (skill.score >= SKILL_THRESHOLD && !(lmsBoost[skill.skillId] > 30)) continue;
    if (skill.deprioritizedUntil && skill.deprioritizedUntil > new Date()) continue;

    const progress = progressRecords.find((p) => p.skillId === skill.skillId);
    if (progress?.attemptCount >= MAX_FAILURES_BEFORE_ROTATE && progress.improvementStreak === 0) {
      continue;
    }

    let priority = (SKILL_THRESHOLD - skill.score) * skill.weight;
    priority += lmsBoost[skill.skillId] ?? 0;

    for (const [moduleId, outcome] of Object.entries(quizOutcomes)) {
      if (moduleId.includes(skill.skillId.split('_')[0]) && outcome.score < QUIZ_WEAK_THRESHOLD) {
        priority += 20;
      }
    }

    candidates.push({ skillId: skill.skillId, name: skill.name, priority, score: skill.score });
  }

  for (const { skillId, priority, reasons } of deriveWeakSkills(lmsPlain ?? {})) {
    if (candidates.some((c) => c.skillId === skillId)) continue;
    candidates.push({
      skillId,
      name: skillId.replace(/_/g, ' '),
      priority,
      score: 50,
      lmsOnly: true,
      reason: reasons?.[0],
    });
  }

  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0]?.skillId ?? pickObjectiveFromLms(lmsPlain) ?? 'pricing';
}

function buildObjectiveReason(objective, targetSkill, lmsContext) {
  const lmsPlain = mapLmsContextPlain(lmsContext);
  const lmsMatch = deriveWeakSkills(lmsPlain ?? {}).find((s) => s.skillId === objective);

  if (lmsMatch && targetSkill) {
    return `CRT LMS gap: ${lmsMatch.reasons?.[0] ?? 'weak area'} · skill ${targetSkill.name} (${targetSkill.score}/100)`;
  }
  if (lmsMatch) {
    return `CRT LMS remediation: ${lmsMatch.reasons?.[0] ?? objective.replace(/_/g, ' ')}`;
  }
  if (targetSkill) {
    return `Weakest grounded skill: ${targetSkill.name} (${targetSkill.score}/100)`;
  }
  return 'Default training objective';
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

export async function generateSessionBrief(repId, options = {}) {
  const repProfile = await getOrCreateRepProfile(repId);
  const skillGraph = await getSkillGraphForUser(repId);
  const weakestSkills = await getWeakestSkills(repId, 10);
  const progressRecords = await UserSkillProgress.find({ userId: repId }).lean();

  const groundedScores = skillGraph
    .filter((s) => s.sessionCount > 0 || s.score !== 50)
    .map((s) => s.score);
  const avgSkill = groundedScores.length
    ? groundedScores.reduce((a, b) => a + b, 0) / groundedScores.length
    : weakestSkills.length
      ? weakestSkills.reduce((a, s) => a + s.score, 0) / weakestSkills.length
      : null;

  const quizOutcomes = {};
  if (repProfile.quizOutcomes) {
    for (const [key, val] of repProfile.quizOutcomes.entries?.() ?? Object.entries(repProfile.quizOutcomes)) {
      quizOutcomes[key] = val;
    }
  }

  const lmsContext = mapLmsContextPlain(repProfile.lmsContext);
  const objective = pickObjective(weakestSkills, quizOutcomes, progressRecords, lmsContext);
  const goal = GOAL_TEMPLATES[objective] ?? `Can rep demonstrate proficiency in ${objective}?`;
  const language = options.language ?? repProfile.language ?? 'en';

  const placementScore = lmsContext?.salesReadinessScore ?? avgSkill;
  const recommendedProfile = pickProfileForRep(placementScore);
  const customerProfile = options.profileId
    ? getCustomerProfile(options.profileId)
    : recommendedProfile ?? getDefaultProfile();

  const lmsHints = lmsContext
    ? {
      weakAreas: lmsContext.weakAreas,
      conceptsToRevise: lmsContext.conceptsToRevise,
      llmSummary: lmsContext.llmSummary,
      recommendedTrainingModules: lmsContext.recommendedTrainingModules,
    }
    : undefined;

  if (customerProfile) {
    return buildSessionBriefFromProfile(customerProfile, {
      objective,
      goal,
      language,
      lmsHints,
    });
  }

  // Fallback: legacy auto-generated brief (no profile sheet)
  const assigned = repProfile.cohortAssignments?.[0];
  const cohortKey = assigned ?? pickCohortForLevel(avgSkill);
  const [cohortId, versionStr] = cohortKey.includes('_v')
    ? [cohortKey.replace(/_v\d+$/, ''), parseInt(cohortKey.match(/_v(\d+)$/)?.[1] ?? '1', 10)]
    : [cohortKey, null];

  const cohort = (versionStr
    ? await Cohort.findOne({ cohortId, version: versionStr }).lean()
    : null)
    ?? await Cohort.findOne({ cohortId, isActive: true }).sort({ version: -1 }).lean()
    ?? await Cohort.findOne({ isActive: true }).sort({ cohortId: 1, version: -1 }).lean();

  const targetSkill = weakestSkills.find((s) => s.skillId === objective) ?? weakestSkills[0];
  const difficulty = computeDifficulty(objective, targetSkill?.score ?? 50, cohort?.difficultyPresets);
  const persona = pickPersona(objective, cohort ?? { personas: ['father'] });
  const mood = pickMood(difficulty);
  const primaryObjection = OBJECTION_MAP[objective]
    ?? cohort?.commonObjections?.[0]
    ?? 'financial_constraint';

  return {
    objective,
    difficulty,
    persona,
    mood,
    primaryObjection,
    goal,
    cohortId: cohort?.cohortId ?? cohortId,
    cohortVersion: cohort?.version ?? versionStr ?? 1,
    customerName:
      persona === 'student' ? 'Rahul'
        : persona === 'both_parents' ? 'Mr. & Mrs. Sharma'
          : persona === 'mother' ? 'Mrs. Sharma' : 'Mr. Sharma',
    language,
    city: repProfile.city ?? 'Hyderabad',
    region: repProfile.region ?? 'South',
    lmsHints,
  };
}

export async function previewPlan(repId, options = {}) {
  const skillGraph = await getSkillGraphForUser(repId);
  const groundedScores = skillGraph.map((s) => s.score);
  const avgSkill = groundedScores.length
    ? groundedScores.reduce((a, b) => a + b, 0) / groundedScores.length
    : null;

  const recommendedProfile = pickProfileForRep(avgSkill);
  const brief = await generateSessionBrief(repId, options);
  const profile = await getOrCreateRepProfile(repId);
  const lmsContext = mapLmsContextPlain(profile.lmsContext);
  const weakestSkills = await getWeakestSkills(repId, 5);

  const lastInsight = await SessionInsight.findOne({ repId })
    .sort({ createdAt: -1 })
    .lean();

  const targetSkill = weakestSkills.find((s) => s.skillId === brief.objective);

  return {
    sessionBrief: brief,
    recommendedProfileId: recommendedProfile?.profile_id ?? brief.profileId,
    adaptivePlan: {
      objective: brief.objective,
      objectiveReason: buildObjectiveReason(brief.objective, targetSkill, lmsContext),
      avgSkillScore: avgSkill != null ? Math.round(avgSkill) : null,
      salesReadinessScore: lmsContext?.salesReadinessScore ?? null,
      certificationStatus: lmsContext?.certificationStatus ?? null,
      crtWeakAreas: lmsContext?.weakAreas ?? [],
      conceptsToRevise: lmsContext?.conceptsToRevise ?? [],
      lastSessionFixes: lastInsight?.callAudit?.top_3_fixes
        ?? lastInsight?.mistakes?.slice(0, 3)
        ?? [],
      lastCoachFeedback: lastInsight?.coachFeedback ?? null,
    },
    weakestSkills: weakestSkills.map((s) => ({ skillId: s.skillId, name: s.name, score: s.score })),
    repProfile: {
      city: profile.city,
      language: profile.language,
      learningVelocity: profile.learningVelocity,
      lmsContext,
    },
  };
}
