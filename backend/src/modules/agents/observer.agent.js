import { callOpenAI, isOpenAiConfigured } from './openai.client.js';
import { SKILLS } from '../../seed/skills.seed.js';

function mockObserverScores(sessionBrief, transcript) {
  const text = transcript.map((t) => t.text).join(' ').toLowerCase();
  const objective = sessionBrief.objective;
  const scores = {};

  for (const skill of SKILLS) {
    let base = 50;
    if (skill.skillId === objective) base = 45;

    if (text.includes('scholarship') && skill.skillId === 'scholarship') base += 15;
    if (text.includes('emi') && skill.skillId === 'emi_plans') base += 12;
    if (text.includes('price') && skill.skillId === 'pricing') base += 8;
    if (text.includes('demo') && skill.skillId === 'demo_pitch') base += 10;
    if (text.includes('?') && skill.skillId === 'need_discovery') base += 8;
    if (text.includes('enroll') && skill.skillId === 'closing') base += 15;
    if (text.includes('hello') || text.includes('namaste')) {
      if (skill.skillId === 'greeting') base += 20;
    }

    scores[skill.skillId] = Math.min(100, Math.max(0, base + Math.floor(Math.random() * 10)));
  }

  const mistakes = [];
  if (!text.includes('scholarship') && objective === 'pricing') {
    mistakes.push('Did not mention scholarship options when discussing pricing');
  }
  if (!text.includes('?')) {
    mistakes.push('Did not ask enough discovery questions');
  }
  if (text.split(' ').length < 30) {
    mistakes.push('Conversation was too short — insufficient engagement');
  }

  const highlights = [];
  if (text.includes('scholarship')) highlights.push('Mentioned scholarship options');
  if (text.includes('result') || text.includes('rank')) highlights.push('Used social proof with results');

  return {
    scores,
    mistakes,
    highlights,
    keyQuotes: transcript.filter((t) => t.speaker === 'sales_executive').map((t) => t.text).slice(0, 3),
    confidence: Math.min(100, 40 + transcript.length * 5),
    overallScore: scores[objective] ?? 50,
  };
}

export async function observeSession(sessionBrief, transcript) {
  const skillList = SKILLS.map((s) => s.skillId).join(', ');

  if (isOpenAiConfigured() && transcript.length > 0) {
    const transcriptText = transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n');

    const result = await callOpenAI(
      [
        {
          role: 'system',
          content: `You are an Observer Agent for sales training evaluation. Score ONLY — never generate dialogue.
Return JSON with:
- scores: object mapping each skill ID to 0-100 score (${skillList})
- mistakes: array of specific mistakes the sales rep made
- highlights: array of things the rep did well
- keyQuotes: array of 1-3 notable rep quotes
- confidence: 0-100 how confident you are in this evaluation
- overallScore: 0-100 for the session objective "${sessionBrief.objective}"

Score based on: did they address ${sessionBrief.primaryObjection}? Did they demonstrate ${sessionBrief.objective} skills?`,
        },
        {
          role: 'user',
          content: `Session brief: ${JSON.stringify(sessionBrief)}\n\nTranscript:\n${transcriptText}`,
        },
      ],
      true
    );

    if (result) {
      try {
        return JSON.parse(result);
      } catch {
        // fall through to mock
      }
    }
  }

  return mockObserverScores(sessionBrief, transcript);
}
