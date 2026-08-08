import { callLLM, isLlmConfigured } from './llm.client.js';
import { getCustomerKnowledgeForBrief } from '../cohort-kb/cohort-kb.service.js';
import { sanitizeForSpeech } from '../../utils/speechText.js';
import { OBJECTIONS } from '../../seed/cohorts.seed.js';
import { buildInstructorPrompt } from '../customer-profiles/customer-instructor.js';
/**
 * Customer Agent — talks. Never evaluates, never coaches.
 *
 * Rewritten against the real funnel (6,233 demo-booked calls):
 *  - Personas are parents of grade 1-8 children buying Foundation/Aptitude
 *    programs (86% of actual volume) — not NEET droppers (0% of volume).
 *  - Objections use the real taxonomy and real frequencies:
 *      financial_constraint 52% | need_time 28% | trust_deficit 8%
 *      family_consultation 7%   | competitor_locked 5%
 *  - State updates are word-boundary + negation aware, with diminishing
 *    returns per topic. The old version used substring includes() ('hi'
 *    matched 'child'), rewarded "we do NOT offer scholarships" with +trust,
 *    and double-applied every update (once in updateCustomerState, again
 *    inside the mock reply). All three are fixed.
 */

function buildCustomerSystemPrompt(sessionBrief, knowledge, customerState, language = 'en') {
  const lang = language === 'hi' ? 'hi' : 'en';
  const briefForPrompt = {
    ...sessionBrief,
    language: lang,
    objections: sessionBrief.objections,
    yieldConditions: sessionBrief.yieldConditions,
  };

  const instructorBlock = buildInstructorPrompt(briefForPrompt, {
    turnCount: customerState.turnCount ?? 0,
    conversationPhase: customerState.conversationPhase ?? 'cold_open',
  });

  const objection = OBJECTIONS[normalizeObjection(sessionBrief.primaryObjection)];
  const { customerFacts } = knowledge;

  const backgroundBlock = customerFacts
    .map((n) => `- ${n.content}`)
    .join('\n');

  return `${instructorBlock}

ADDITIONAL CONTEXT FROM KNOWLEDGE BASE:
${backgroundBlock || '- Your child took a school test via Infinity Learn.'}

PRIMARY OBJECTION THIS SESSION: ${objection.label} — "${objection.customerLine}"

INTERNAL STATE (adjust tone, never say numbers aloud):
- Trust: ${customerState.trust}/100 | Budget comfort: ${customerState.financialComfort}/100 | Decision readiness: ${customerState.decisionReadiness}/100
- If trust > 70, soften slightly. If trust < 30, become more resistant or end the call politely.`;
}

// Legacy objection ids (pre-rewrite briefs may still carry them)
const LEGACY_OBJECTION_MAP = {
  high_fees: 'financial_constraint',
  scholarship_not_enough: 'financial_constraint',
  competitor_cheaper: 'competitor_locked',
  already_tried_coaching: 'competitor_locked',
  need_to_think: 'need_time',
  need_parent_approval: 'family_consultation',
  online_is_enough: 'trust_deficit',
};

export function normalizeObjection(objectionId) {
  if (OBJECTIONS[objectionId]) return objectionId;
  return LEGACY_OBJECTION_MAP[objectionId] ?? 'financial_constraint';
}

const TOPIC_RULES = [
  {
    topic: 'greeting',
    words: ['hello', 'hi', 'hey', 'namaste', 'good morning', 'good afternoon', 'good evening'],
    effects: { trust: 2, emotionalConfidence: 2 },
  },
  {
    topic: 'emi',
    words: ['emi', 'installment', 'instalment', 'monthly', 'per month', 'bajaj', 'fibe', 'finance'],
    effects: { financialComfort: 10, trust: 4, decisionReadiness: 3 },
  },
  {
    topic: 'scholarship',
    words: ['scholarship', 'discount', 'waiver', 'concession'],
    effects: { financialComfort: 6, trust: 3 },
  },
  {
    topic: 'proof',
    words: ['result', 'rank', 'topper', 'report', 'test', 'score', 'diagnostic', 'gap'],
    effects: { belief: 6, trust: 5, academicAnxiety: -3 },
  },
  {
    topic: 'selection',
    words: ['selected', 'selection', 'chosen', 'shortlisted'],
    effects: { trust: 5, urgency: 6, competitorAffinity: -2 },
  },
  {
    topic: 'demo',
    words: ['demo', 'google meet', 'meeting', 'slot', 'timing'],
    effects: { decisionReadiness: 8, trust: 2 },
  },
  {
    topic: 'faculty',
    words: ['faculty', 'teacher', 'iit', 'mentor', 'expert'],
    effects: { belief: 5, trust: 4, competitorAffinity: -4 },
  },
  {
    topic: 'empathy',
    words: ['understand', 'appreciate', 'concern', 'worried', 'feel'],
    effects: { trust: 5, emotionalConfidence: 4 },
  },
  {
    topic: 'pricing',
    words: ['price', 'fee', 'fees', 'cost', 'rupees', 'amount', 'package', 'ultimate', 'regular'],
    effects: { trust: 2, urgency: 2 },
  },
  {
    topic: 'close',
    words: ['enroll', 'enrol', 'admission', 'register', 'confirm', 'book'],
    effects: { decisionReadiness: 10, urgency: 4 },
  },
];

export const CUSTOMER_STATE_KEYS = [
  'belief', 'trust', 'urgency', 'financialComfort',
  'emotionalConfidence', 'academicAnxiety', 'competitorAffinity', 'decisionReadiness',
];

const NEGATION_RE = /\b(don'?t|do not|no|never|can'?t|cannot|won'?t|not|nahi|nahin)\b/i;

function positiveTopicMention(text, words) {
  for (const w of words) {
    const re = new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i');
    const m = re.exec(text);
    if (!m) continue;
    // negation window: 40 chars before the match, same sentence
    const before = text.slice(Math.max(0, m.index - 40), m.index);
    const sameSentence = before.split(/[.?!]/).pop() ?? before;
    if (!NEGATION_RE.test(sameSentence)) return true;
  }
  return false;
}

export function updateCustomerState(customerState, repText, sessionBrief, mentionedTopics = null) {
  const seen = mentionedTopics ?? customerState.mentionedTopics ?? [];

  for (const rule of TOPIC_RULES) {
    if (!positiveTopicMention(repText, rule.words)) continue;
    const factor = seen.includes(rule.topic) ? 0.25 : 1;
    for (const [key, amount] of Object.entries(rule.effects)) {
      customerState[key] = (customerState[key] ?? 50) + Math.round(amount * factor);
    }
    if (!seen.includes(rule.topic)) seen.push(rule.topic);
  }

  if (repText.trim().length < 10) {
    customerState.trust = (customerState.trust ?? 50) - 2;
  }

  if (repText.trim().length >= 20) {
    customerState.emotionalConfidence = (customerState.emotionalConfidence ?? 50) + 1;
  }

  if (customerState.mentionedTopics !== undefined || mentionedTopics === null) {
    customerState.mentionedTopics = seen;
  }
  return clampCustomerState(customerState);
}

function clampCustomerState(customerState) {
  for (const key of CUSTOMER_STATE_KEYS) {
    if (customerState[key] != null) {
      customerState[key] = Math.max(0, Math.min(100, customerState[key]));
    }
  }
  return customerState;
}

/** Nudge state from what the customer just said — makes the panel feel live. */
export function applyCustomerReplyStateEffects(customerState, customerText) {
  if (!customerText?.trim()) return customerState;

  const t = customerText.toLowerCase();

  if (/\b(too high|too much|cannot afford|can't afford|don't believe|not sure|think about|next week|later|husband|wife|spouse|expensive|budget)\b/i.test(t)) {
    customerState.trust = (customerState.trust ?? 50) - 4;
    customerState.decisionReadiness = (customerState.decisionReadiness ?? 50) - 5;
    customerState.financialComfort = (customerState.financialComfort ?? 50) - 3;
  }

  if (/\b(okay|alright|sounds good|tell me more|how much per month|interested|demo|let's see|we can|fine)\b/i.test(t)) {
    customerState.trust = (customerState.trust ?? 50) + 3;
    customerState.decisionReadiness = (customerState.decisionReadiness ?? 50) + 4;
  }

  if (/\b(tuition|coaching|already enrolled|other class|competitor|allen|aakash)\b/i.test(t)) {
    customerState.competitorAffinity = (customerState.competitorAffinity ?? 50) + 4;
  }

  if (/\b(gap|weak|score|math|child|report|improve|result)\b/i.test(t)) {
    customerState.academicAnxiety = (customerState.academicAnxiety ?? 50) + 2;
    customerState.belief = (customerState.belief ?? 50) + 2;
  }

  return clampCustomerState(customerState);
}

export function computeStateDeltas(before, after) {
  const deltas = {};
  for (const key of CUSTOMER_STATE_KEYS) {
    const delta = (after?.[key] ?? 0) - (before?.[key] ?? 0);
    if (delta !== 0) deltas[key] = delta;
  }
  return deltas;
}

export function snapshotCustomerState(state) {
  const snap = {};
  for (const key of CUSTOMER_STATE_KEYS) {
    snap[key] = state?.[key] ?? 0;
  }
  snap.mentionedTopics = [...(state?.mentionedTopics ?? [])];
  snap.objectionsRaised = [...(state?.objectionsRaised ?? [])];
  snap.conversationPhase = state?.conversationPhase ?? 'cold_open';
  snap.turnCount = state?.turnCount ?? 0;
  return snap;
}

function normalizeForCompare(text) {
  return (text ?? '').toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function isNearDuplicate(a, b) {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length > 20 && nb.includes(na.slice(0, Math.min(40, na.length)))) return true;
  return false;
}

function getCustomerLines(transcript) {
  return (transcript ?? [])
    .filter((t) => t.speaker === 'customer')
    .map((t) => t.text)
    .slice(-4);
}

export function computeConversationPhase(customerState, repText) {
  const trust = customerState.trust ?? 35;
  const topics = customerState.mentionedTopics ?? [];
  const turn = customerState.turnCount ?? 0;

  if (trust < 20 && turn > 4) return 'exit';
  if (trust > 65 && topics.includes('demo')) return 'closing';
  if (trust > 50 && (topics.includes('emi') || topics.includes('proof'))) return 'warming';
  if (customerState.objectionsRaised?.length > 0) return 'objection';
  if (topics.includes('proof') || topics.includes('greeting')) return 'discovery';
  if (topics.includes('greeting') || /infinity|chaitanya|school|test|name is/i.test(repText)) return 'credibility';
  if (turn <= 2) return 'cold_open';
  return 'discovery';
}

function detectObjectionRaised(text, sessionBrief) {
  const t = text.toLowerCase();
  const objections = sessionBrief.objections ?? [];
  for (const obj of objections) {
    const id = obj.id;
    if (id === 'need_time' && /think|soch|time|baad mein|later/i.test(t)) return id;
    if (id === 'family_consultation' && /wife|husband|spouse|papa|mummy|discuss|baat kar/i.test(t)) return id;
    if (id === 'competitor_locked' && /tuition|coaching|already|class chal/i.test(t)) return id;
    if (id === 'financial_constraint' && /price|fee|cost|budget|kitna|mahanga|afford/i.test(t)) return id;
    if (id === 'trust_deficit' && /believe|trust|proof|kaise pata|works/i.test(t)) return id;
  }
  return null;
}

export function advanceConversationState(customerState, repText, sessionBrief, customerReplyText) {
  customerState.turnCount = (customerState.turnCount ?? 0) + 1;
  customerState.conversationPhase = computeConversationPhase(customerState, repText);

  if (customerReplyText) {
    const raised = detectObjectionRaised(customerReplyText, sessionBrief);
    if (raised && !(customerState.objectionsRaised ?? []).includes(raised)) {
      customerState.objectionsRaised = [...(customerState.objectionsRaised ?? []), raised];
    }
  }

  return customerState;
}

// ── Mock replies: PURE (no state mutation — state is updated exactly once
// by updateCustomerState in the simulation service) ─────────────────────

const GREETING_RE = /(^|[^a-z])(hello|hi|hey|namaste|namaskar|good (morning|afternoon|evening))([^a-z]|$)/i;

function mockCustomerReply(sessionBrief, repText, customerState) {
  const hi = sessionBrief.language === 'hi';
  const objection = normalizeObjection(sessionBrief.primaryObjection);
  const o = OBJECTIONS[objection];

  if (GREETING_RE.test(repText) && (customerState.mentionedTopics ?? []).length === 0) {
    return hi
      ? 'नमस्ते। हाँ बोलिए, स्कूल में जो टेस्ट हुआ था उसी के बारे में कॉल है क्या?'
      : "Hello. Yes, tell me — is this about the test my child took at school?";
  }

  if (positiveTopicMention(repText, ['emi', 'installment', 'instalment', 'monthly'])) {
    return hi
      ? 'ठीक है, महीने का कितना पड़ेगा? और कितने महीने तक?'
      : 'Okay, how much per month would that be? And for how many months?';
  }

  if (positiveTopicMention(repText, ['price', 'fee', 'fees', 'cost', 'amount'])) {
    return hi
      ? 'फीस कितनी है? हमारा बजट सीमित है, स्कूल की फीस पहले से ही ज़्यादा है।'
      : "What is the total fee? Our budget is limited — school fees are already high.";
  }

  if (positiveTopicMention(repText, ['demo', 'session', 'meeting'])) {
    return hi
      ? 'ठीक है, डेमो देख लेते हैं। दोनों में से कौन सा टाइम रहेगा?'
      : 'Alright, we can see a demo. What timings do you have?';
  }

  if (positiveTopicMention(repText, ['selected', 'selection', 'test', 'report', 'result'])) {
    return hi
      ? 'अच्छा, टेस्ट में कैसा किया मेरे बच्चे ने? क्या कमी निकली?'
      : 'Oh, how did my child actually do in the test? What gaps did you find?';
  }

  // Default: voice the cohort's primary objection
  const line = hi
    ? {
        financial_constraint: 'देखिए, फीस हमारे बजट से बाहर है। स्कूल की फीस ही बहुत है।',
        need_time: 'हमें सोचने का समय चाहिए। अगले हफ्ते बात करते हैं।',
        trust_deficit: 'कैसे मानें कि इससे फायदा होगा? फोन पर तो सब अच्छा ही बताते हैं।',
        family_consultation: 'मैं अकेले फैसला नहीं ले सकता, घर में बात करनी पड़ेगी।',
        competitor_locked: 'बच्चे का पहले से ट्यूशन चल रहा है। दूसरा क्यों लें?',
      }[objection]
    : o.customerLine;

  return line;
}

export async function generateCustomerReply(session, repMessage) {
  const { sessionBrief, customerState, transcript, language } = session;
  const replyLanguage = language ?? sessionBrief.language ?? 'en';
  const knowledge = await getCustomerKnowledgeForBrief(sessionBrief);

  const history = transcript
    .slice(-14)
    .map((t) => `${t.speaker}: ${t.text}`)
    .join('\n');

  const previousCustomerLines = getCustomerLines(transcript);
  const phase = customerState.conversationPhase ?? 'cold_open';
  const objectionsLeft = (sessionBrief.objections ?? [])
    .filter((o) => !(customerState.objectionsRaised ?? []).includes(o.id))
    .map((o) => o.sample_line)
    .slice(0, 2);

  const userPrompt = `Conversation so far:
${history || '(session just started)'}

Sales rep just said: "${repMessage}"

YOUR PREVIOUS LINES (do NOT repeat these questions or phrases):
${previousCustomerLines.length ? previousCustomerLines.map((l) => `- "${l}"`).join('\n') : '(opening only)'}

Stage: ${phase} | Turn: ${(customerState.turnCount ?? 0) + 1}
${objectionsLeft.length ? `Next objection you may raise (only if rep hasn't addressed it): "${objectionsLeft[0]}"` : 'Rep is doing well — soften and move toward demo timing.'}

Respond as ${sessionBrief.customerName ?? 'the customer'} (${sessionBrief.persona}). Acknowledge what the rep said, then move FORWARD. 1–3 sentences only.`;

  if (isLlmConfigured()) {
    const reply = await callLLM([
      { role: 'system', content: buildCustomerSystemPrompt(sessionBrief, knowledge, customerState, replyLanguage) },
      { role: 'user', content: userPrompt },
    ], false, { temperature: 0.68, max_tokens: 180 });

    if (reply) {
      let clean = sanitizeForSpeech(reply.trim());
      const lastLine = previousCustomerLines[previousCustomerLines.length - 1];
      if (clean && lastLine && isNearDuplicate(clean, lastLine)) {
        clean = sanitizeForSpeech(`${clean} Theek hai, aage batayiye.`);
      }
      if (clean) return { text: clean, mode: 'llm' };
    }
  }

  return { text: mockCustomerReply(sessionBrief, repMessage, customerState), mode: 'mock' };
}

// Exported for unit tests
export { mockCustomerReply, positiveTopicMention, TOPIC_RULES, GREETING_RE };
