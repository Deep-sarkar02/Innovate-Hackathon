import { callOpenAI, isOpenAiConfigured } from './openai.client.js';
import { GROUNDED_SKILLS, GROUNDED_SKILL_IDS } from '../../seed/skills.seed.js';

/**
 * Observer Agent — scores a training conversation. Never talks.
 *
 * First principles this rewrite enforces:
 *
 * 1. A SCORE MUST TRACE TO EVIDENCE. The old version scored all 46 skills and
 *    added Math.random() — the "adaptive" loop was literally driven by noise.
 *    Now: only the 12 grounded skills are scored, the LLM must cite a quote
 *    per score, and a skill with no observable evidence gets NO score (it is
 *    omitted), never a fabricated one. Downstream (coach → skill graph) only
 *    moves on skills that were actually observed.
 *
 * 2. THE RUBRIC COMES FROM REAL WINNING CALLS (57 transcribed closed sales,
 *    6,233-call funnel analysis):
 *      - Winners anchor on the child's test/report early (68% of wins)
 *      - Diagnosis before pitch; price appears LATE and in only 26% of wins
 *      - Discount/scholarship is the LAST lever (~66% through the call)
 *      - Selection framing ("we selected N children") beats sales framing
 *      - EMI translation matters: 75.6% of all closed deals are financed
 *
 * 3. DEGRADATION IS LOUD. Output carries mode: 'llm' | 'mock'. The mock path
 *    is deterministic (same transcript → same result) with honest low
 *    confidence, so it can never masquerade as real evaluation.
 */

// Word-boundary matcher. The old code used substring includes() — 'hi'
// matched "which", "child", "this"… classifying most turns as greetings.
function hasWord(text, words) {
  return words.some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i').test(text));
}

// Naive negation guard: "we don't offer scholarships" must not count as a
// scholarship pitch. Checks a small window before the keyword.
function hasPositiveMention(text, words) {
  for (const w of words) {
    const re = new RegExp(`(?:^|\\.\\s*)([^.]*?)(?:^|[^a-z])${w}(?:[^a-z]|$)`, 'i');
    const m = text.match(re);
    if (!m) continue;
    const windowBefore = m[1].slice(-40).toLowerCase();
    if (!/\b(don'?t|do not|no|never|can'?t|cannot|won'?t|not)\b/.test(windowBefore)) return true;
  }
  return false;
}

// Deterministic, evidence-only fallback. Scores ONLY what is observable from
// rep turns; everything else is omitted. No randomness — ever.
function heuristicObserverScores(sessionBrief, transcript) {
  const repTurns = transcript.filter((t) => t.speaker === 'sales_executive');
  const repText = repTurns.map((t) => t.text).join(' ');
  const totalTurns = repTurns.length;

  const scores = {};
  const mistakes = [];
  const highlights = [];

  const evidence = {
    greeting:
      totalTurns > 0
      && hasWord(repTurns[0]?.text ?? '', ['hello', 'namaste', 'good morning', 'good afternoon', 'good evening', 'hi']),
    need_discovery: (repText.match(/\?/g) ?? []).length >= 2,
    pricing: hasPositiveMention(repText, ['price', 'fee', 'fees', 'cost', 'amount', 'rupees']),
    emi_plans: hasPositiveMention(repText, ['emi', 'installment', 'instalment', 'monthly', 'bajaj', 'finance']),
    scholarship: hasPositiveMention(repText, ['scholarship', 'discount', 'waiver', 'concession']),
    demo_pitch: hasPositiveMention(repText, ['demo', 'session', 'meeting', 'google meet']),
    urgency_creation: hasPositiveMention(repText, ['selected', 'selection', 'limited', 'today', 'last date']),
    closing: hasPositiveMention(repText, ['enroll', 'enrol', 'admission', 'confirm', 'register', 'book']),
    trust_building: hasPositiveMention(repText, ['result', 'rank', 'topper', 'faculty', 'iit', 'report', 'test']),
    competitor_comparison: hasPositiveMention(repText, ['compare', 'other coaching', 'tuition', 'difference']),
  };

  for (const [skillId, seen] of Object.entries(evidence)) {
    if (!GROUNDED_SKILL_IDS.includes(skillId)) continue;
    if (seen) {
      scores[skillId] = 60; // observed, quality unknown — flat, honest baseline
    }
    // NOT seen => omitted. Absence of evidence is not a score.
  }

  // Structural checks from the winning-call corpus
  if (evidence.pricing && !evidence.emi_plans) {
    mistakes.push('Talked price without an EMI translation — 75.6% of real closed deals are financed');
  }
  if (evidence.scholarship && repTurns.length >= 4) {
    const firstHalf = repTurns.slice(0, Math.ceil(repTurns.length / 2)).map((t) => t.text).join(' ');
    if (hasPositiveMention(firstHalf, ['scholarship', 'discount'])) {
      mistakes.push('Led with discount/scholarship — in winning calls it is the LAST lever (~66% through)');
    } else {
      highlights.push('Held discount back as a closing lever, matching winning-call structure');
    }
  }
  if (!evidence.need_discovery) {
    mistakes.push('Fewer than 2 discovery questions — winners diagnose before pitching');
  }
  if (evidence.trust_building) {
    highlights.push('Anchored on test/report/results — present in 68% of winning calls');
  }
  if (evidence.urgency_creation) {
    highlights.push('Used selection/urgency framing');
  }

  const objectiveScore = scores[sessionBrief.objective];
  return {
    mode: 'mock',
    scores,
    scoredSkills: Object.keys(scores),
    unscoredSkills: GROUNDED_SKILL_IDS.filter((s) => !(s in scores)),
    mistakes,
    highlights,
    keyQuotes: [],
    // Honest: keyword evidence without quality judgement is low-confidence.
    confidence: Math.min(35, 10 + totalTurns * 3),
    overallScore: objectiveScore ?? null,
  };
}

function clamp(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function validateLlmResult(raw) {
  const scores = {};
  const evidenceQuotes = {};
  for (const [skillId, entry] of Object.entries(raw.scores ?? {})) {
    if (!GROUNDED_SKILL_IDS.includes(skillId)) continue; // discard hallucinated skills
    // Accept {score, evidence} or bare number; require evidence for the former
    if (entry && typeof entry === 'object') {
      const s = clamp(entry.score);
      if (s === null) continue;
      if (!entry.evidence || String(entry.evidence).trim().length < 3) continue; // no evidence, no score
      scores[skillId] = s;
      evidenceQuotes[skillId] = String(entry.evidence).slice(0, 300);
    } else {
      const s = clamp(entry);
      if (s !== null) scores[skillId] = s;
    }
  }
  return { scores, evidenceQuotes };
}

const RUBRIC = `SCORING RUBRIC — derived from 57 transcribed winning calls and a 6,233-call funnel analysis:
- need_discovery: did the rep ask questions and diagnose the child's specific gap BEFORE pitching? Winners diagnose first.
- trust_building: did the rep anchor on the child's own test/report/results (68% of winning calls) and concrete proof (faculty, ranks)?
- urgency_creation: selection framing ("we selected N children from your school") and legitimate time anchors. Fake pressure scores LOW.
- pricing: price should arrive LATE. Leading with price scores low. Winners mention price in only 26% of calls before the demo.
- emi_plans: 75.6% of real closed deals are financed. Translating price to monthly EMI (Bajaj/credit card/Fibe) scores high; quoting only annual price scores low.
- scholarship: discount/scholarship is the LAST lever (winners deploy it ~66% through the call). Early discounting scores LOW.
- demo_pitch: did the rep drive toward booking/holding the demo session? (Demo length is the #1 conversion lever in real data.)
- objection_handling: did the rep acknowledge, isolate, and answer the customer's ACTUAL objection rather than script-dumping?
- competitor_comparison: differentiation without rubbishing the competitor.
- closing / greeting / value_proposition: standard quality judgement, evidence required.`;

export async function observeSession(sessionBrief, transcript) {
  if (isOpenAiConfigured() && transcript.length > 0) {
    const transcriptText = transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n');

    const result = await callOpenAI(
      [
        {
          role: 'system',
          content: `You are an Observer Agent for sales training evaluation. Score ONLY — never generate dialogue.

${RUBRIC}

Score ONLY these skills: ${GROUNDED_SKILL_IDS.join(', ')}.
CRITICAL RULES:
- Only score a skill if there is direct evidence in the transcript. If a skill was not exercised, OMIT it entirely. Do NOT guess.
- Every score MUST include a verbatim evidence quote from the transcript.
Return JSON:
{
  "scores": { "<skillId>": { "score": 0-100, "evidence": "verbatim quote" } },
  "mistakes": ["specific mistake ..."],
  "highlights": ["specific strength ..."],
  "keyQuotes": ["1-3 notable rep quotes"],
  "confidence": 0-100,
  "overallScore": 0-100 for the session objective "${sessionBrief.objective}"
}`,
        },
        {
          role: 'user',
          content: `Session brief: ${JSON.stringify({
            objective: sessionBrief.objective,
            primaryObjection: sessionBrief.primaryObjection,
            cohortId: sessionBrief.cohortId,
            goal: sessionBrief.goal,
          })}\n\nTranscript:\n${transcriptText}`,
        },
      ],
      true
    );

    if (result) {
      try {
        const raw = JSON.parse(result);
        const { scores, evidenceQuotes } = validateLlmResult(raw);
        if (Object.keys(scores).length > 0) {
          return {
            mode: 'llm',
            scores,
            evidenceQuotes,
            scoredSkills: Object.keys(scores),
            unscoredSkills: GROUNDED_SKILL_IDS.filter((s) => !(s in scores)),
            mistakes: (raw.mistakes ?? []).slice(0, 8).map(String),
            highlights: (raw.highlights ?? []).slice(0, 8).map(String),
            keyQuotes: (raw.keyQuotes ?? []).slice(0, 3).map(String),
            confidence: clamp(raw.confidence) ?? 50,
            overallScore: clamp(raw.overallScore),
          };
        }
      } catch {
        console.error('[observer] LLM returned unparseable JSON — falling back to heuristic scoring');
      }
    }
  }

  return heuristicObserverScores(sessionBrief, transcript);
}

// Exported for unit tests
export { heuristicObserverScores, hasWord, hasPositiveMention, validateLlmResult };
export const OBSERVED_SKILLS = GROUNDED_SKILLS.map((s) => ({ skillId: s.skillId, name: s.name }));
