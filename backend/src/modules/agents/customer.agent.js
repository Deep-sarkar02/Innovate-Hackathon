import { callLLM, isLlmConfigured } from './llm.client.js';
import { getKnowledgeForBrief } from '../cohort-kb/cohort-kb.service.js';
import { OBJECTIONS } from '../../seed/cohorts.seed.js';

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

const PERSONA_PROMPTS = {
  father:
    'You are the father of a school-going child (grade 1-8) who recently took an aptitude/foundation '
    + 'test through their school. You are practical and budget-conscious — school fees already stretch '
    + 'the family budget, and any big amount only works as a monthly EMI. You care about concrete '
    + 'results, not marketing language.',
  mother:
    'You are the mother of a school-going child (grade 1-8) who recently took an aptitude/foundation '
    + 'test through their school. You are deeply invested in your child\'s education, cautious about '
    + 'online programs, and you weigh trust and proof heavily. Big financial decisions are made '
    + 'together with your spouse.',
  both_parents:
    'You are BOTH parents of a school-going child on the same call (18.6% of real demos have both '
    + 'parents). One of you is cost-focused, the other quality-focused. Occasionally hand the '
    + 'conversation between the two voices, e.g. "My husband is asking—" / "Let me give the phone '
    + 'to my wife." The rep must convince both of you.',
  student:
    'You are a grade 9-12 student preparing for boards and JEE/NEET foundation. You are curious but '
    + 'not the decision maker — your parents decide payments. You get excited about content but '
    + 'deflect money questions to your parents.',
};

const MOOD_MODIFIERS = {
  skeptical: 'You are skeptical and need strong proof before believing anything.',
  neutral: 'You are neutral — neither enthusiastic nor dismissive.',
  interested: 'You are somewhat interested but have concerns to address.',
  frustrated: 'You are frustrated from bad past experiences with other coaching or tuition.',
};

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

function buildCustomerSystemPrompt(sessionBrief, knowledge, customerState, language = 'en') {
  const persona = PERSONA_PROMPTS[sessionBrief.persona] ?? PERSONA_PROMPTS.father;
  const mood = MOOD_MODIFIERS[sessionBrief.mood] ?? MOOD_MODIFIERS.neutral;
  const lang = language === 'hi' ? 'Respond in Hindi (Devanagari script).' : 'Respond in English.';
  const objection = OBJECTIONS[normalizeObjection(sessionBrief.primaryObjection)];

  const knowledgeContext = [
    ...knowledge.objectionNodes.map((n) => `[Objection] ${n.content}`),
    ...knowledge.pitchNodes.map((n) => `[Info you know] ${n.content}`),
  ].join('\n');

  return `You are a simulated CUSTOMER in a sales training exercise for Infinity Learn (EdTech).
${persona}
${mood}

TODAY'S SCENARIO (you do NOT know the rep's scores):
- Your primary concern: ${objection.label} — a natural way you might voice it: "${objection.customerLine}"
- Session goal being tested: ${sessionBrief.objective?.replace(/_/g, ' ')}
- Your city: ${sessionBrief.city ?? 'Patna'}

YOUR CURRENT STATE (adjust responses based on these internal feelings):
- Trust: ${customerState.trust}/100
- Financial comfort: ${customerState.financialComfort}/100
- Academic anxiety: ${customerState.academicAnxiety}/100
- Decision readiness: ${customerState.decisionReadiness}/100

KNOWLEDGE YOU HAVE:
${knowledgeContext || 'You know coaching is expensive and you want the best for your child. Any large amount only works as monthly EMI.'}

RULES:
- You are the CUSTOMER, not the salesperson. Never offer to sell anything.
- Never evaluate or coach the salesperson.
- Stay in character as a ${sessionBrief.persona} with a ${sessionBrief.mood} mood.
- Directly respond to what the sales rep just said — reference their specific points.
- Raise your primary concern naturally — do not volunteer it in the first turn.
- React to what the rep ACTUALLY says. If they claim something without proof, push back.
- If the rep only quotes an annual price, ask what it means per month — EMI is how your family thinks about money.
- Keep responses concise (1-3 sentences). ${lang}
- If trust rises above 70, become slightly more open. If below 30, become more resistant.`;
}

// ── Deterministic state machine (shared by mock and LLM paths) ──────────

const TOPIC_RULES = [
  {
    topic: 'emi',
    words: ['emi', 'installment', 'instalment', 'monthly', 'bajaj', 'fibe', 'finance'],
    effects: { financialComfort: 8, trust: 3 },
  },
  {
    topic: 'scholarship',
    words: ['scholarship', 'discount', 'waiver', 'concession'],
    effects: { financialComfort: 5, trust: 2 },
  },
  {
    topic: 'proof',
    words: ['result', 'rank', 'topper', 'report', 'test', 'score'],
    effects: { belief: 5, trust: 4 },
  },
  {
    topic: 'selection',
    words: ['selected', 'selection', 'chosen', 'shortlisted'],
    effects: { trust: 4, urgency: 5 },
  },
  {
    topic: 'demo',
    words: ['demo', 'session', 'google meet', 'meeting'],
    effects: { decisionReadiness: 6 },
  },
  {
    topic: 'close',
    words: ['enroll', 'enrol', 'admission', 'register', 'confirm'],
    effects: { decisionReadiness: 8 },
  },
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
    // Diminishing returns: repeating a keyword is not progress. First mention
    // full effect, later mentions 25% — kills the "spam scholarship" exploit.
    const factor = seen.includes(rule.topic) ? 0.25 : 1;
    for (const [key, amount] of Object.entries(rule.effects)) {
      customerState[key] = (customerState[key] ?? 50) + Math.round(amount * factor);
    }
    if (!seen.includes(rule.topic)) seen.push(rule.topic);
  }

  // Empty/near-empty turns erode trust slightly
  if (repText.trim().length < 10) {
    customerState.trust = (customerState.trust ?? 50) - 2;
  }

  for (const key of [
    'belief', 'trust', 'urgency', 'financialComfort',
    'emotionalConfidence', 'academicAnxiety', 'competitorAffinity', 'decisionReadiness',
  ]) {
    if (customerState[key] != null) {
      customerState[key] = Math.max(0, Math.min(100, customerState[key]));
    }
  }

  if (customerState.mentionedTopics !== undefined || mentionedTopics === null) {
    customerState.mentionedTopics = seen;
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

  // Word-boundary greeting — the old substring check classified "which
  // batch" and "the child" as greetings.
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
  const knowledge = await getKnowledgeForBrief(sessionBrief);

  const history = transcript
    .slice(-10)
    .map((t) => `${t.speaker}: ${t.text}`)
    .join('\n');

  if (isLlmConfigured()) {
    const reply = await callLLM([
      { role: 'system', content: buildCustomerSystemPrompt(sessionBrief, knowledge, customerState, replyLanguage) },
      {
        role: 'user',
        content: `Conversation so far:\n${history || '(session just started)'}\n\nSales rep just said: "${repMessage}"\n\nRespond as the customer. Address their specific message.`,
      },
    ]);
    if (reply) return { text: reply.trim(), mode: 'llm' };
  }

  return { text: mockCustomerReply(sessionBrief, repMessage, customerState), mode: 'mock' };
}

// Exported for unit tests
export { mockCustomerReply, positiveTopicMention, TOPIC_RULES, GREETING_RE };
