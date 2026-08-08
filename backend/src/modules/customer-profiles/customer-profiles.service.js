import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLD_CALL_OPENING } from './customer-instructor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const profilesData = JSON.parse(
  readFileSync(join(__dirname, '../../seed/customer-profiles.json'), 'utf8'),
);

const PROFILES = profilesData.profiles ?? [];
const SHARED = profilesData.shared ?? {};
const TRAINING_LADDER = profilesData.training_ladder?.sequence ?? [];

export function resolveVoiceGender(profileOrBrief) {
  const role = profileOrBrief?.persona?.role ?? profileOrBrief?.persona ?? 'father';
  const childGender = profileOrBrief?.persona?.child_gender ?? profileOrBrief?.childGender;

  if (role === 'mother') return 'female';
  if (role === 'father') return 'male';
  if (role === 'student') return childGender === 'female' ? 'female' : 'male';
  return 'female';
}

export function listCustomerProfiles() {
  return PROFILES.map((p) => ({
    profileId: p.profile_id,
    displayName: p.display_name,
    cohort: p.cohort,
    difficulty: p.difficulty,
    isDefault: p.is_default ?? false,
    summary: p.summary,
    voiceGender: resolveVoiceGender(p),
    persona: {
      role: p.persona.role,
      name: p.persona.name,
      childName: p.persona.child_name,
      childGrade: p.persona.child_grade,
      childGender: p.persona.child_gender,
      city: p.persona.city,
      state: p.persona.state,
      board: p.persona.board,
      brandAwareness: p.persona.brand_awareness,
      occupation: p.persona.occupation,
      language: p.persona.language,
    },
    step: TRAINING_LADDER.find((s) => s.profile_id === p.profile_id)?.step ?? null,
  }));
}

export function getCustomerProfile(profileId) {
  return PROFILES.find((p) => p.profile_id === profileId) ?? null;
}

export function getDefaultProfile() {
  return PROFILES.find((p) => p.is_default) ?? PROFILES[0] ?? null;
}

export function getSharedConfig() {
  return {
    objectionTaxonomy: SHARED.objection_taxonomy,
    brandAwarenessStates: SHARED.brand_awareness_states,
    successCriteria: SHARED.success_criteria,
    failureTriggers: SHARED.failure_triggers,
    trainingLadder: TRAINING_LADDER,
  };
}

function mapDifficultyProfile(dp = {}) {
  return {
    knowledge: dp.knowledge ?? 3,
    emotion: dp.emotion ?? 3,
    budget: dp.budget ?? 3,
    timePressure: dp.time_pressure ?? 2,
    competitorLoyalty: dp.competitor_loyalty ?? 2,
    decisionAuthority: dp.decision_authority ?? 3,
  };
}

/**
 * Build a session brief from a chosen customer profile + planner objective.
 */
export function buildSessionBriefFromProfile(profile, { objective, goal, language = 'en' } = {}) {
  if (!profile) throw new Error('Customer profile not found');

  const p = profile.persona;
  const primaryObjection = profile.objections?.[0]?.id ?? 'need_time';

  return {
    profileId: profile.profile_id,
    displayName: profile.display_name,
    objective: objective ?? 'demo_pitch',
    difficulty: mapDifficultyProfile(profile.difficulty_profile),
    difficultyLabel: profile.difficulty,
    persona: p.role,
    mood: profile.difficulty === 'easy' ? 'interested' : profile.difficulty === 'hard' ? 'skeptical' : 'neutral',
    primaryObjection,
    goal: goal ?? profile.summary,
    cohortId: profile.cohort,
    cohortVersion: 1,
    customerName: p.name,
    childName: p.child_name,
    childGrade: p.child_grade,
    childGender: p.child_gender,
    board: p.board,
    city: p.city,
    state: p.state,
    region: p.state,
    testName: p.test_taken,
    brandAwareness: p.brand_awareness,
    existingTuition: p.existing_tuition,
    language,
    summary: profile.summary,
    objections: profile.objections ?? [],
    yieldConditions: profile.yield_conditions ?? [],
    successState: profile.success_state,
    failureState: profile.failure_state,
    openingLine: COLD_CALL_OPENING,
    voiceGender: resolveVoiceGender(profile),
    occupation: p.occupation,
    personaLanguage: p.language,
    stateSeed: profile.state_variables ?? {},
  };
}

export function initialStateFromProfile(sessionBrief) {
  const seed = sessionBrief.stateSeed ?? {};
  return {
    belief: 50,
    trust: seed.trust ?? 35,
    urgency: seed.urgency ?? 25,
    financialComfort: seed.financial_comfort ?? 30,
    emotionalConfidence: 50,
    academicAnxiety: seed.academic_anxiety ?? 55,
    competitorAffinity: 35,
    decisionReadiness: seed.decision_readiness ?? 20,
    mentionedTopics: [],
    objectionsRaised: [],
    conversationPhase: 'cold_open',
    turnCount: 0,
  };
}
