import { callOpenAI, isOpenAiConfigured } from './openai.client.js';
import { getKnowledgeForBrief } from '../cohort-kb/cohort-kb.service.js';

const PERSONA_PROMPTS = {
  father: 'You are a concerned father evaluating coaching for your child preparing for NEET. You are practical, budget-conscious, and need convincing.',
  mother: 'You are a caring mother researching the best coaching for your child. You worry about quality and safety of the investment.',
  student: 'You are a NEET dropper student who failed last year. You are anxious but motivated to improve your rank this time.',
};

const MOOD_MODIFIERS = {
  skeptical: 'You are skeptical and need strong proof before believing anything.',
  neutral: 'You are neutral — neither enthusiastic nor dismissive.',
  interested: 'You are somewhat interested but have concerns to address.',
  frustrated: 'You are frustrated from bad past experiences with other coaching centers.',
};

function buildCustomerSystemPrompt(sessionBrief, knowledge, customerState) {
  const persona = PERSONA_PROMPTS[sessionBrief.persona] ?? PERSONA_PROMPTS.father;
  const mood = MOOD_MODIFIERS[sessionBrief.mood] ?? MOOD_MODIFIERS.neutral;
  const lang = sessionBrief.language === 'hi' ? 'Respond in Hindi (Devanagari script).' : 'Respond in English.';

  const knowledgeContext = [
    ...knowledge.objectionNodes.map((n) => `[Objection] ${n.content}`),
    ...knowledge.pitchNodes.map((n) => `[Info you know] ${n.content}`),
  ].join('\n');

  return `You are a simulated CUSTOMER in a sales training exercise for Infinity Learn (EdTech).
${persona}
${mood}

TODAY'S SCENARIO (you do NOT know the rep's scores):
- Primary concern: ${sessionBrief.primaryObjection.replace(/_/g, ' ')}
- Session goal being tested: ${sessionBrief.objective.replace(/_/g, ' ')}
- Your city: ${sessionBrief.city ?? 'Hyderabad'}

YOUR CURRENT STATE (adjust responses based on these internal feelings):
- Trust: ${customerState.trust}/100
- Financial comfort: ${customerState.financialComfort}/100
- Academic anxiety: ${customerState.academicAnxiety}/100
- Decision readiness: ${customerState.decisionReadiness}/100

KNOWLEDGE YOU HAVE:
${knowledgeContext || 'You know coaching is expensive and you want the best for your child.'}

RULES:
- You are the CUSTOMER, not the salesperson. Never offer to sell anything.
- Never evaluate or coach the salesperson.
- Stay in character. Raise objections naturally related to: ${sessionBrief.primaryObjection.replace(/_/g, ' ')}
- Keep responses concise (1-3 sentences). ${lang}
- If trust increases above 70, become slightly more open. If below 30, become more resistant.`;
}

function mockCustomerReply(sessionBrief, repText, customerState) {
  const text = repText.toLowerCase();
  const objection = sessionBrief.primaryObjection;

  if (objection === 'high_fees' || text.includes('price') || text.includes('fee')) {
    if (text.includes('scholarship') || text.includes('emi')) {
      customerState.trust = Math.min(100, customerState.trust + 10);
      customerState.financialComfort = Math.min(100, customerState.financialComfort + 8);
      return sessionBrief.language === 'hi'
        ? 'छात्रवृत्ति के बारे में और बताइए। वास्तव में कितनी छूट मिल सकती है?'
        : "Tell me more about the scholarship. How much discount can I actually get?";
    }
    return sessionBrief.language === 'hi'
      ? 'फीस बहुत ज़्यादा है। हमारे बजट में नहीं आता। क्या सस्ता विकल्प है?'
      : "The fees are too high for our budget. We can't afford this. Is there a cheaper option?";
  }

  if (text.includes('scholarship')) {
    customerState.trust = Math.min(100, customerState.trust + 5);
    return sessionBrief.language === 'hi'
      ? 'छात्रवृत्ति के लिए पात्रता क्या है? पichle साल 450 marks थे।'
      : 'What are the eligibility criteria for scholarship? My child scored 450 last year.';
  }

  if (text.includes('demo') || text.includes('trial')) {
    customerState.decisionReadiness = Math.min(100, customerState.decisionReadiness + 15);
    return sessionBrief.language === 'hi'
      ? 'ठीक है, एक डेमो क्लास देख सकते हैं। लेकिन पहले फीस साफ कर दीजिए।'
      : "Fine, we can look at a demo class. But clarify the fees first.";
  }

  if (text.includes('hello') || text.includes('hi') || text.includes('namaste')) {
    return sessionBrief.language === 'hi'
      ? 'नमस्ते। मैं NEET के लिए कोचिंग ढूंढ रहा हूँ। क्या आप बता सकते हैं?'
      : "Hello. I'm looking for NEET coaching for my child. What can you tell me?";
  }

  return sessionBrief.language === 'hi'
    ? 'समझ गया। लेकिन मुझे यकीन नहीं है। और कोचिंग भी देख रहे हैं।'
    : "I see. But I'm not convinced yet. We're also looking at other coaching options.";
}

export function updateCustomerState(customerState, repText, sessionBrief) {
  const text = repText.toLowerCase();

  if (text.includes('scholarship') || text.includes('emi') || text.includes('discount')) {
    customerState.financialComfort = Math.min(100, customerState.financialComfort + 5);
    customerState.trust = Math.min(100, customerState.trust + 3);
  }
  if (text.includes('result') || text.includes('rank') || text.includes('topper')) {
    customerState.belief = Math.min(100, customerState.belief + 5);
    customerState.trust = Math.min(100, customerState.trust + 4);
  }
  if (text.includes('guarantee') || text.includes('refund')) {
    customerState.trust = Math.min(100, customerState.trust + 8);
    customerState.decisionReadiness = Math.min(100, customerState.decisionReadiness + 5);
  }
  if (text.includes('enroll') || text.includes('sign up') || text.includes('register')) {
    customerState.decisionReadiness = Math.min(100, customerState.decisionReadiness + 10);
  }
  if (text.length < 10) {
    customerState.trust = Math.max(0, customerState.trust - 2);
  }

  customerState.trust = Math.max(0, Math.min(100, customerState.trust));
  customerState.financialComfort = Math.max(0, Math.min(100, customerState.financialComfort));
  customerState.belief = Math.max(0, Math.min(100, customerState.belief));
  customerState.decisionReadiness = Math.max(0, Math.min(100, customerState.decisionReadiness));

  return customerState;
}

export async function generateCustomerReply(session, repMessage) {
  const { sessionBrief, customerState, transcript, language } = session;
  const knowledge = await getKnowledgeForBrief(sessionBrief);

  const history = transcript
    .slice(-10)
    .map((t) => `${t.speaker}: ${t.text}`)
    .join('\n');

  if (isOpenAiConfigured()) {
    const reply = await callOpenAI([
      { role: 'system', content: buildCustomerSystemPrompt(sessionBrief, knowledge, customerState) },
      {
        role: 'user',
        content: `Conversation so far:\n${history}\n\nSales rep just said: "${repMessage}"\n\nRespond as the customer.`,
      },
    ]);
    if (reply) return reply.trim();
  }

  return mockCustomerReply(sessionBrief, repMessage, customerState);
}
