/**
 * Data-grounded customer instructor — loaded from elevenlabs-moderate-customer.agent.json.
 * Persona (father / mother / student) is injected from the session brief chosen on the frontend.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const agentConfig = JSON.parse(
  readFileSync(join(__dirname, '../../seed/elevenlabs-moderate-customer.agent.json'), 'utf8'),
);

export const COLD_CALL_OPENING =
  agentConfig.conversation_config?.agent?.first_message ?? 'Hello? Haan ji, kaun bol raha hai?';

const PROMPT_TEMPLATE = agentConfig.conversation_config?.agent?.prompt?.prompt ?? '';

const IDENTITY_LOCK = {
  father:
    'IDENTITY LOCK: You are male — the FATHER. Use male forms (main bol raha hoon, maine socha). '
    + 'Refer to spouse as wife/meri biwi. NEVER say "my husband" about yourself or speak as a mother.',
  mother:
    'IDENTITY LOCK: You are female — the MOTHER. Use female forms (main bol rahi hoon, maine socha). '
    + 'Refer to spouse as husband/mere pati. NEVER say "my wife" about yourself or speak as a father.',
  student:
    'IDENTITY LOCK: You ARE the child (student) answering the phone — not a parent. '
    + 'Say "mera test", "my school" — never "my child". Deflect money and demo booking to parents.',
};

function substituteTemplate(template, vars) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, String(value));
  }
  return out;
}

function formatObjections(objections = []) {
  return objections
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .map((o, i) => `${i + 1}. ${o.id.toUpperCase().replace(/_/g, ' ')}: "${o.sample_line}" — ${o.trigger}`)
    .join('\n');
}

function formatYieldConditions(conditions = []) {
  return conditions.map((c) => `- ${c}`).join('\n');
}

/** Resolve persona role from session brief (profile-driven, not hardcoded). */
const PERSONA_ROLES = ['father', 'mother', 'student', 'both_parents'];

// Accepts either a sessionBrief (persona is a string role) or a raw profile
// from customer-profiles.json (persona is an object with .role). Reading the
// object case first matters: `??` only skips null/undefined, so an object-valued
// persona would otherwise win and fail the string check, silently defaulting
// every persona — mothers included — to 'father'.
export function resolvePersonaRole(sessionBrief = {}) {
  const candidates = [
    typeof sessionBrief.persona === 'string' ? sessionBrief.persona : sessionBrief.persona?.role,
    sessionBrief.personaRole,
    sessionBrief.persona_role,
  ];
  for (const raw of candidates) {
    if (typeof raw === 'string' && PERSONA_ROLES.includes(raw)) {
      return raw === 'both_parents' ? 'father' : raw;
    }
  }
  return 'father';
}

/** Build dynamic variables for the ElevenLabs-style prompt from the chosen profile. */
export function buildPersonaVariables(sessionBrief = {}) {
  const personaRole = resolvePersonaRole(sessionBrief);

  return {
    persona_role: personaRole,
    parent_name: sessionBrief.customerName ?? sessionBrief.displayName ?? 'Parent',
    child_name: sessionBrief.childName ?? 'child',
    child_grade: String(sessionBrief.childGrade ?? 7),
    city: sessionBrief.city ?? 'India',
    test_name: sessionBrief.testName ?? 'school aptitude test',
    brand_awareness: sessionBrief.brandAwareness ?? 'vaguely_heard',
  };
}

export function buildInstructorPrompt(sessionBrief, { turnCount = 0, conversationPhase = 'cold_open' } = {}) {
  if (!sessionBrief?.customerName && !sessionBrief?.profileId) {
    console.warn('[customer-instructor] sessionBrief missing profile fields — persona may be incomplete');
  }

  const personaRole = resolvePersonaRole(sessionBrief);
  const vars = buildPersonaVariables(sessionBrief);
  const basePrompt = substituteTemplate(PROMPT_TEMPLATE, vars);

  const {
    state = '',
    board = 'CBSE',
    existingTuition = '',
    occupation = '',
    language = 'en',
    summary = '',
    objections = [],
    yieldConditions = [],
    successState = '',
    failureState = '',
    difficultyLabel = 'moderate',
    childName = vars.child_name,
    testName = vars.test_name,
  } = sessionBrief;

  const coldOpenRule = turnCount <= 1
    ? `Opening line already spoken: "${COLD_CALL_OPENING}" — do NOT repeat it verbatim.`
    : 'You ALREADY greeted the caller. Do NOT ask "kaun bol raha hai" again.';

  const phaseGuide = {
    cold_open: 'Establish who is calling and why. One clarifying question max.',
    credibility: 'Rep introduced themselves — need proof (company, school test link, Sri Chaitanya if unfamiliar).',
    discovery: 'Rep asks about your child — answer honestly, one concern naturally.',
    objection: 'Raise current objection once, then listen.',
    warming: 'Rep handled concern — soften, follow up, move toward demo timing.',
    closing: 'Near agreement — confirm demo slot, both parents, or next step.',
    exit: 'Rep failed — wrap up politely and end the call.',
  }[conversationPhase] ?? 'Move forward — never repeat yourself.';

  const langNote = language === 'hi'
    ? 'Respond in natural Hinglish with Hindi in Devanagari where natural.'
    : 'Speak natural Hinglish — English with common Hindi words (haan, theek hai, dekhiye).';

  return `${basePrompt}

=== SESSION PROFILE (from user-selected customer persona) ===
${IDENTITY_LOCK[personaRole] ?? IDENTITY_LOCK.father}
Display name: ${sessionBrief.displayName ?? vars.parent_name}
Board: ${board}${state ? ` · ${state}` : ''}
${occupation ? `Occupation: ${occupation}.` : ''}
${existingTuition ? `${childName}'s tuition: ${existingTuition}.` : ''}
Difficulty: ${difficultyLabel}
${summary ? `Profile note: ${summary}` : ''}

=== LIVE SESSION STATE (turn ${turnCount}, phase: ${conversationPhase}) ===
${coldOpenRule}
${phaseGuide}
${langNote}

=== PROFILE-SPECIFIC OBJECTIONS (one at a time) ===
${formatObjections(objections) || '(Use standard need_time → family → tuition → price order)'}

=== PROFILE YIELD CONDITIONS ===
${formatYieldConditions(yieldConditions) || '(EMI, free demo with slot, both parents, test report anchor)'}

Success end-state: ${successState || 'Book demo with concrete slot.'}
Failure end-state: ${failureState || 'Exit after three weak-rep triggers.'}

REMINDER: You are ${vars.parent_name}, the ${personaRole} of ${childName}. Never slip into a different persona or gender.`;
}

export const EVALUATION_CRITERIA =
  agentConfig.platform_settings?.evaluation?.criteria?.map((c) => ({
    id: c.id,
    name: c.name,
  })) ?? [];
