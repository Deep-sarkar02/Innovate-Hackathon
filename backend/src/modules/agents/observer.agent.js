import { callLLM, isLlmConfigured } from './llm.client.js';
import { GROUNDED_SKILLS, GROUNDED_SKILL_IDS } from '../../seed/skills.seed.js';
import {
  getObserverSystemPrompt,
  getObserverOutputSchema,
  getObserverHeadlineFindings,
} from './observer-audit.kb.js';

/**
 * Observer Agent — scores a training conversation using the IL CRT call-audit rubric.
 * Grounded on observer-audit.json (171 winning calls + TM audit sheet).
 *
 * Rules preserved from the prior implementation:
 * - Score ONLY with evidence; unobserved skills are omitted.
 * - Degradation is loud: mode 'llm' | 'mock'.
 * - Structural metrics are computed locally (ASR-robust) and passed to the LLM.
 */

const PHASE_SKILL_MAP = {
  introduction: ['greeting', 'value_proposition'],
  rapport_building: ['need_discovery', 'trust_building'],
  need_generation: ['value_proposition', 'trust_building'],
  session_pitching: ['demo_pitch', 'urgency_creation'],
  closing: ['closing'],
};

const COMPREHENSION_PATTERNS = [
  'samajh aaya', 'samajh aa raha', 'theek hai', 'aapko kya lagta', 'clear hai',
  'understand', 'make sense', 'follow kar', 'sun pa rahe', 'boliye',
];

function hasWord(text, words) {
  return words.some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i').test(text));
}

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

function clamp(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function computeStructuralMetrics(transcript) {
  const repTurns = transcript.filter((t) => t.speaker === 'sales_executive');
  const customerTurns = transcript.filter((t) => t.speaker !== 'sales_executive');
  const totalTurns = transcript.length || 1;

  let longestAgentMonologue = 0;
  let currentRun = 0;
  for (const turn of transcript) {
    if (turn.speaker === 'sales_executive') {
      currentRun += 1;
      longestAgentMonologue = Math.max(longestAgentMonologue, currentRun);
    } else {
      currentRun = 0;
    }
  }

  const repText = repTurns.map((t) => t.text).join(' ');
  const agentQuestionCount = (repText.match(/\?/g) ?? []).length;
  const comprehensionChecks = COMPREHENSION_PATTERNS.reduce(
    (count, phrase) => count + (repText.toLowerCase().includes(phrase) ? 1 : 0),
    0
  );

  let discountPositionPct = null;
  const scholarshipIdx = repTurns.findIndex((t) =>
    hasPositiveMention(t.text, ['scholarship', 'discount', 'waiver', 'concession'])
  );
  if (scholarshipIdx >= 0 && repTurns.length > 0) {
    discountPositionPct = Math.round(((scholarshipIdx + 1) / repTurns.length) * 100);
  }

  return {
    customer_talk_share: Math.round((customerTurns.length / totalTurns) * 100) / 100,
    longest_agent_monologue_turns: longestAgentMonologue,
    agent_question_count: agentQuestionCount,
    comprehension_checks: comprehensionChecks,
    discount_position_pct: discountPositionPct,
  };
}

function mapAuditToSkills(audit) {
  const scores = {};
  const evidenceQuotes = {};

  for (const phase of audit.phases ?? []) {
    const evidenced = (phase.expected_items ?? []).filter(
      (item) => ['done', 'partial'].includes(item.status) && String(item.quote ?? '').trim().length > 2
    );
    if (!evidenced.length) continue;

    for (const skillId of PHASE_SKILL_MAP[phase.phase] ?? []) {
      if (!GROUNDED_SKILL_IDS.includes(skillId) || skillId in scores) continue;
      scores[skillId] = clamp(phase.score);
      evidenceQuotes[skillId] = String(evidenced[0].quote).slice(0, 300);
    }
  }

  const allRepQuotes = (audit.phases ?? [])
    .flatMap((phase) => (phase.expected_items ?? [])
      .filter((item) => item.quote)
      .map((item) => String(item.quote)))
    .join(' ')
    .toLowerCase();

  const crossPhaseSkills = [
    { skillId: 'emi_plans', words: ['emi', 'installment', 'instalment', 'monthly', 'bajaj', 'finance'] },
    { skillId: 'pricing', words: ['price', 'fee', 'fees', 'cost', 'amount', 'rupees'] },
    { skillId: 'scholarship', words: ['scholarship', 'discount', 'waiver', 'concession'] },
    { skillId: 'objection_handling', words: ['concern', 'objection', 'worry', 'issue', 'problem'] },
    { skillId: 'competitor_comparison', words: ['compare', 'other coaching', 'tuition', 'difference', 'byju'] },
  ];

  for (const { skillId, words } of crossPhaseSkills) {
    if (skillId in scores || !GROUNDED_SKILL_IDS.includes(skillId)) continue;
    if (!hasPositiveMention(allRepQuotes, words)) continue;
    scores[skillId] = clamp(audit.overall_score) ?? 55;
    evidenceQuotes[skillId] = 'Observed in phase evidence';
  }

  return { scores, evidenceQuotes };
}

function extractMistakesAndHighlights(audit) {
  const mistakes = [];
  const highlights = [];
  const keyQuotes = [];

  for (const phase of audit.phases ?? []) {
    for (const obs of phase.observations ?? []) {
      const text = String(obs);
      if (/should have|instead|missed|failed|without asking|one way|monologue|premature|abrupt/i.test(text)) {
        mistakes.push(text);
      } else if (/good|well|correct|secured|explained|asked|matched|appropriate/i.test(text)) {
        highlights.push(text);
      }
    }

    for (const item of phase.expected_items ?? []) {
      if (item.status === 'missed' && item.quote) {
        mistakes.push(`${item.item}: missed — "${item.quote}"`);
      }
      if (['done', 'partial'].includes(item.status) && item.quote) {
        keyQuotes.push(String(item.quote).slice(0, 200));
      }
    }
  }

  for (const penalty of audit.penalties ?? []) {
    mistakes.push(`${penalty.rule} (${penalty.points} pts): ${penalty.evidence}`);
  }

  for (const fix of audit.top_3_fixes ?? []) {
    mistakes.push(`${fix.fix} — ${fix.why}${fix.say_this_instead ? `. Say: "${fix.say_this_instead}"` : ''}`);
  }

  const metrics = audit.structural_metrics ?? {};
  if (metrics.customer_talk_share != null && metrics.customer_talk_share < 0.25) {
    mistakes.push(`One-way call: customer talk share ${Math.round(metrics.customer_talk_share * 100)}% (corpus median 35%)`);
  }
  if (metrics.longest_agent_monologue_turns >= 8) {
    mistakes.push(`Long agent monologue: ${metrics.longest_agent_monologue_turns} consecutive turns (8+ is a flag on winning calls)`);
  }
  if (metrics.comprehension_checks === 0) {
    mistakes.push('Zero comprehension checks — rep never verified parent understanding');
  }

  return {
    mistakes: [...new Set(mistakes)].slice(0, 10),
    highlights: [...new Set(highlights)].slice(0, 8),
    keyQuotes: [...new Set(keyQuotes)].slice(0, 3),
  };
}

function mapAuditToObserverOutput(audit, sessionBrief, computedMetrics) {
  const { scores, evidenceQuotes } = mapAuditToSkills(audit);
  const { mistakes, highlights, keyQuotes } = extractMistakesAndHighlights(audit);

  const structural = {
    ...computedMetrics,
    ...(audit.structural_metrics ?? {}),
  };

  const phaseConfidence = (audit.phases ?? [])
    .map((p) => p.confidence)
    .filter(Boolean);
  let confidence = 70;
  if (phaseConfidence.includes('low')) confidence = 45;
  else if (phaseConfidence.every((c) => c === 'high')) confidence = 85;

  return {
    mode: 'llm',
    scores,
    evidenceQuotes,
    scoredSkills: Object.keys(scores),
    unscoredSkills: GROUNDED_SKILL_IDS.filter((s) => !(s in scores)),
    mistakes,
    highlights,
    keyQuotes,
    confidence,
    overallScore: clamp(audit.overall_score),
    callAudit: {
      ...audit,
      structural_metrics: structural,
      rubric: 'IL CRT 5-phase audit',
      sessionObjective: sessionBrief.objective,
    },
  };
}

function validateLlmResult(raw) {
  const scores = {};
  const evidenceQuotes = {};
  for (const [skillId, entry] of Object.entries(raw.scores ?? {})) {
    if (!GROUNDED_SKILL_IDS.includes(skillId)) continue;
    if (entry && typeof entry === 'object') {
      const s = clamp(entry.score);
      if (s === null) continue;
      if (!entry.evidence || String(entry.evidence).trim().length < 3) continue;
      scores[skillId] = s;
      evidenceQuotes[skillId] = String(entry.evidence).slice(0, 300);
    } else {
      const s = clamp(entry);
      if (s !== null) scores[skillId] = s;
    }
  }
  return { scores, evidenceQuotes };
}

function heuristicObserverScores(sessionBrief, transcript) {
  const repTurns = transcript.filter((t) => t.speaker === 'sales_executive');
  const repText = repTurns.map((t) => t.text).join(' ');
  const totalTurns = repTurns.length;
  const structural = computeStructuralMetrics(transcript);

  const scores = {};
  const mistakes = [];
  const highlights = [];

  const evidence = {
    greeting:
      totalTurns > 0
      && hasWord(repTurns[0]?.text ?? '', ['hello', 'namaste', 'good morning', 'good afternoon', 'good evening', 'hi']),
    need_discovery: structural.agent_question_count >= 2,
    pricing: hasPositiveMention(repText, ['price', 'fee', 'fees', 'cost', 'amount', 'rupees']),
    emi_plans: hasPositiveMention(repText, ['emi', 'installment', 'instalment', 'monthly', 'bajaj', 'finance']),
    scholarship: hasPositiveMention(repText, ['scholarship', 'discount', 'waiver', 'concession']),
    demo_pitch: hasPositiveMention(repText, ['demo', 'session', 'meeting', 'google meet']),
    urgency_creation: hasPositiveMention(repText, ['selected', 'selection', 'limited', 'today', 'last date']),
    closing: hasPositiveMention(repText, ['enroll', 'enrol', 'admission', 'confirm', 'register', 'book']),
    trust_building: hasPositiveMention(repText, ['result', 'rank', 'topper', 'faculty', 'iit', 'report', 'test']),
    competitor_comparison: hasPositiveMention(repText, ['compare', 'other coaching', 'tuition', 'difference']),
    value_proposition: hasPositiveMention(repText, ['infinity learn', 'sri chaitanya', 'counsellor', 'counselor']),
  };

  for (const [skillId, seen] of Object.entries(evidence)) {
    if (!GROUNDED_SKILL_IDS.includes(skillId)) continue;
    if (seen) scores[skillId] = 60;
  }

  if (evidence.pricing && !evidence.emi_plans) {
    mistakes.push('Talked price without an EMI translation — 75.6% of real closed deals are financed');
  }
  if (structural.discount_position_pct != null && structural.discount_position_pct < 40) {
    mistakes.push(`Discount/scholarship appeared at ${structural.discount_position_pct}% into the call — premature (corpus avg ~54%)`);
  }
  if (structural.agent_question_count < 5) {
    mistakes.push(`Only ${structural.agent_question_count} rep questions — CRT rubric expects ≥7 discovery items`);
  }
  if (structural.comprehension_checks === 0) {
    mistakes.push('Zero comprehension checks — rep never verified parent understanding');
  }
  if (structural.customer_talk_share < 0.25) {
    mistakes.push(`One-way call: customer talk share ${Math.round(structural.customer_talk_share * 100)}%`);
  }
  if (structural.longest_agent_monologue_turns >= 8) {
    mistakes.push(`Agent monologue of ${structural.longest_agent_monologue_turns} turns — 54% of winning calls have 8+ turn monologues`);
  }
  if (evidence.trust_building) {
    highlights.push('Anchored on test/report/results — present in winning-call corpus');
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
    confidence: Math.min(35, 10 + totalTurns * 3),
    overallScore: objectiveScore ?? null,
    callAudit: {
      rubric: 'IL CRT 5-phase audit (heuristic fallback)',
      structural_metrics: structural,
      sessionObjective: sessionBrief.objective,
      phases: [],
    },
  };
}

function buildAuditUserPrompt(sessionBrief, transcript, structuralMetrics, durationMinutes) {
  const transcriptText = transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n');
  const findings = getObserverHeadlineFindings();

  return `Session brief:
${JSON.stringify({
    objective: sessionBrief.objective,
    primaryObjection: sessionBrief.primaryObjection,
    cohortId: sessionBrief.cohortId,
    goal: sessionBrief.goal,
    customerName: sessionBrief.customerName,
    displayName: sessionBrief.displayName,
    language: sessionBrief.language,
  }, null, 2)}

Duration: ${durationMinutes ?? 'unknown'} minutes

Pre-computed structural metrics (trust these counts — computed locally, ASR-robust):
${JSON.stringify(structuralMetrics, null, 2)}

Corpus calibration (171 winning calls):
- Median customer talk share: 35%. Below 25% = red flag.
- Median agent questions: 4 (rubric expects ≥7 discovery items).
- Median longest agent monologue: 8 turns.
- Scholarship/discount first appears ~54% into winning calls.

Key TM findings to watch for:
${JSON.stringify(findings, null, 2)}

Transcript:
${transcriptText}

Return ONLY valid JSON matching this schema:
${JSON.stringify(getObserverOutputSchema(), null, 2)}`;
}

export async function observeSession(sessionBrief, transcript, { durationMinutes } = {}) {
  const structuralMetrics = computeStructuralMetrics(transcript);

  if (isLlmConfigured() && transcript.length > 0) {
    const result = await callLLM(
      [
        {
          role: 'system',
          content: getObserverSystemPrompt(),
        },
        {
          role: 'user',
          content: buildAuditUserPrompt(sessionBrief, transcript, structuralMetrics, durationMinutes),
        },
      ],
      true,
      { max_tokens: 6000, temperature: 0.2 }
    );

    if (result) {
      try {
        const audit = JSON.parse(result);
        if (audit?.phases?.length && audit.overall_score != null) {
          return mapAuditToObserverOutput(audit, sessionBrief, structuralMetrics);
        }

        const { scores, evidenceQuotes } = validateLlmResult(audit);
        if (Object.keys(scores).length > 0) {
          return {
            mode: 'llm',
            scores,
            evidenceQuotes,
            scoredSkills: Object.keys(scores),
            unscoredSkills: GROUNDED_SKILL_IDS.filter((s) => !(s in scores)),
            mistakes: (audit.mistakes ?? []).slice(0, 8).map(String),
            highlights: (audit.highlights ?? []).slice(0, 8).map(String),
            keyQuotes: (audit.keyQuotes ?? []).slice(0, 3).map(String),
            confidence: clamp(audit.confidence) ?? 50,
            overallScore: clamp(audit.overall_score ?? audit.overallScore),
            callAudit: audit,
          };
        }
      } catch {
        console.error('[observer] LLM returned unparseable JSON — falling back to heuristic scoring');
      }
    }
  }

  return heuristicObserverScores(sessionBrief, transcript);
}

export {
  heuristicObserverScores,
  hasWord,
  hasPositiveMention,
  validateLlmResult,
  mapAuditToObserverOutput,
};
export const OBSERVED_SKILLS = GROUNDED_SKILLS.map((s) => ({ skillId: s.skillId, name: s.name }));
