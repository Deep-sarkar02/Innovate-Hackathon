/**
 * Cohorts derived from REAL funnel data — not invented personas.
 *
 * Source: LeadSquared export analysed 2026-08-08 — 6,233 demo-booked calls,
 * 761 closed sales (12.2% base rate), 1,495 labelled non-closure reasons.
 * (Analysis artifacts: demo_booked_calls_FINAL.csv in the data workspace.)
 *
 * Key facts every agent should respect:
 *  - Funnel is grades 1-8 (86%), Foundation/Aptitude products (81%).
 *    NEET/JEE is 12%; droppers are 0%. There is no dropper cohort on purpose.
 *  - Real objection distribution (n=1,495):
 *      financial_constraint 52.1% | need_time 28.2% | trust_deficit 8.3%
 *      family_consultation 6.8%   | competitor_locked 4.6%
 *  - 75.6% of ALL closed sales are financed (Bajaj EMI 433, credit-card EMI 93,
 *    Fibe 44, ShopSe 5). EMI is the default state, not an objection response.
 *  - Winning-call structure (57 transcribed sale calls): price appears in only
 *    26% of winning calls; discount/scholarship lands LAST (~66% through the
 *    call); the dominant frame is SELECTION ("we selected 5-6 children from
 *    your school"), not selling.
 *  - Demo length is the sharpest outcome lever: 90+ min demos close at 21.5%
 *    vs 2.7-6.6% for everything shorter.
 *
 * Difficulty ladder (empirical, by sale rate — higher = easier to close):
 *   east_belt_middle 16.8% > premium_school 14.5% > board_year 13.1%
 *   > mainstream_middle 12.9% > early_grade_value 9.0%
 */

export const OBJECTIONS = {
  financial_constraint: {
    id: 'financial_constraint',
    share: 0.521,
    label: 'Financial Issues',
    customerLine: 'The fee is beyond our monthly budget. School fees already stretch us.',
  },
  need_time: {
    id: 'need_time',
    share: 0.282,
    label: 'Need more time to think',
    customerLine: 'We want to think about it. Call us next week maybe.',
  },
  trust_deficit: {
    id: 'trust_deficit',
    share: 0.083,
    label: 'Trust Issues',
    customerLine: 'How do we know this actually works? Anyone can show numbers on a call.',
  },
  family_consultation: {
    id: 'family_consultation',
    share: 0.068,
    label: 'Need to discuss with the family',
    customerLine: 'I cannot decide alone. My husband/wife handles these decisions with me.',
  },
  competitor_locked: {
    id: 'competitor_locked',
    share: 0.046,
    label: 'Already enrolled in some other coaching',
    customerLine: 'We already pay for tuition/coaching. Why would we pay for another one?',
  },
};

// Empirical difficulty ladder — first entry is the easiest cohort (highest
// observed sale rate), last is the hardest. The planner walks this ladder.
export const COHORT_LADDER = [
  'east_belt_middle', // 16.8%
  'premium_school', // 14.5%
  'board_year', // 13.1%
  'mainstream_middle', // 12.9%
  'early_grade_value', // 9.0%
];

export const COHORTS = [
  {
    cohortId: 'east_belt_middle',
    name: 'East-Belt Middle (G6-8, WB/Bihar/Odisha/Assam/J&K)',
    version: 1,
    description:
      'Grade 6-8 parents in the eastern belt. Best-converting segment (16.8% vs 12.2% base, n=465). '
      + 'High EMI reliance (78% of its sales financed). Entry rung for new reps.',
    pitchPoints: [
      'Anchor on the school test/report the child already took (present in 68% of winning calls)',
      'Selection framing: "we selected a handful of children from your school", never "we are selling"',
      'Diagnose the child\'s specific gap before any product talk',
      'EMI-first affordability framing — 78% of this cohort\'s buyers finance',
      'Keep price for late in the call; discount/scholarship only as the closing lever',
    ],
    commonObjections: ['financial_constraint', 'need_time', 'family_consultation'],
    personas: ['father', 'mother', 'both_parents'],
    difficultyPresets: {
      knowledge: 2,
      emotion: 2,
      budget: 4,
      timePressure: 2,
      competitorLoyalty: 1,
      decisionAuthority: 3,
    },
    targetSkills: ['need_discovery', 'emi_plans', 'trust_building', 'demo_pitch'],
    meta: { saleRate: 0.168, volumeShare: 0.075, avgPricePitched: 6410, emiShare: 0.78 },
    isActive: true,
  },
  {
    cohortId: 'mainstream_middle',
    name: 'Mainstream Middle (G6-8, rest of India)',
    version: 1,
    description:
      'Grade 6-8 parents outside the eastern belt. 26.4% of volume, 12.9% sale rate (n=1,645). '
      + 'Highest financial-objection density in the funnel (58%). Pure affordability training.',
    pitchPoints: [
      'Value-per-month framing: break annual price into a daily/monthly cost the parent can hold',
      'Package laddering: open on Ultimate, keep Regular as the fallback, never lead with the cheapest',
      'EMI options by name (Bajaj, credit-card EMI, Fibe) — 73% of these buyers finance',
      'Tie every rupee to the diagnosed gap from the child\'s test report',
    ],
    commonObjections: ['financial_constraint', 'need_time', 'competitor_locked'],
    personas: ['father', 'mother', 'both_parents'],
    difficultyPresets: {
      knowledge: 3,
      emotion: 3,
      budget: 5,
      timePressure: 3,
      competitorLoyalty: 2,
      decisionAuthority: 3,
    },
    targetSkills: ['pricing', 'emi_plans', 'objection_handling', 'closing'],
    meta: { saleRate: 0.129, volumeShare: 0.264, avgPricePitched: 11735, emiShare: 0.73 },
    isActive: true,
  },
  {
    cohortId: 'early_grade_value',
    name: 'Early-Grade Value (G1-5)',
    version: 1,
    description:
      'Grade 1-5 parents. Largest cohort (34.2% of volume) and the WORST converting (9.0%, n=2,131). '
      + 'No exam deadline exists, so urgency must be built from the child\'s trajectory, not a date. '
      + 'Hardest rung of the ladder; biggest productivity payoff if improved.',
    pitchPoints: [
      'There is no exam to invoke — urgency comes from foundation-gap compounding, not deadlines',
      'Lead with what the diagnostic test showed about the child, by name',
      'Selection framing matters most here: parents of young children respond to "chosen", not "pitched"',
      'Both-parents demos close 13.8% vs 12.2% base — always push for both parents on the demo',
    ],
    commonObjections: ['financial_constraint', 'need_time', 'family_consultation'],
    personas: ['mother', 'father', 'both_parents'],
    difficultyPresets: {
      knowledge: 2,
      emotion: 2,
      budget: 4,
      timePressure: 1,
      competitorLoyalty: 1,
      decisionAuthority: 4,
    },
    targetSkills: ['urgency_creation', 'need_discovery', 'trust_building', 'closing'],
    meta: { saleRate: 0.09, volumeShare: 0.342, avgPricePitched: 9859, emiShare: 0.77 },
    isActive: true,
  },
  {
    cohortId: 'board_year',
    name: 'Board-Year (G9-12, JEE/NEET foundation)',
    version: 1,
    description:
      'Grade 9-12 parents, exam-driven. 11.7% of volume, 13.1% sale rate (n=731). Highest ticket '
      + '(avg price pitched Rs 15,188) and the most EMI-dependent segment: 85% of its sales are financed.',
    pitchPoints: [
      'Exam-calendar urgency is real here — use it (board year, JEE Main/NEET attempt windows)',
      'High-ticket close: EMI translation is mandatory, 85% of these buyers finance',
      'Faculty/IITian credential pitch carries more weight than in younger cohorts',
      'Competitor displacement matters: 7.3% are already enrolled elsewhere',
    ],
    commonObjections: ['financial_constraint', 'need_time', 'competitor_locked'],
    personas: ['father', 'student', 'both_parents'],
    difficultyPresets: {
      knowledge: 4,
      emotion: 3,
      budget: 5,
      timePressure: 4,
      competitorLoyalty: 3,
      decisionAuthority: 4,
    },
    targetSkills: ['pricing', 'emi_plans', 'competitor_comparison', 'urgency_creation'],
    meta: { saleRate: 0.131, volumeShare: 0.117, avgPricePitched: 15188, emiShare: 0.85 },
    isActive: true,
  },
  {
    cohortId: 'premium_school',
    name: 'Premium-School (school fee 50K+, any grade)',
    version: 1,
    description:
      'Parents paying 50K+ school fees. 20.2% of volume, 14.5% sale rate (n=1,260). The objection mix '
      + 'FLIPS here: financial drops to 47% and competitor objection triples (7.4% vs 2.0% at low-fee '
      + 'schools). This trains displacement and differentiation, not affordability.',
    pitchPoints: [
      'Do NOT lead with affordability — these parents already pay premium fees',
      'Displacement: they likely already have tuition/coaching; differentiate, don\'t discount',
      'Quality signals: faculty depth, outcome data, structured curriculum',
      'Discounting too early reads as low quality to this cohort',
    ],
    commonObjections: ['competitor_locked', 'need_time', 'trust_deficit'],
    personas: ['father', 'mother', 'both_parents'],
    difficultyPresets: {
      knowledge: 4,
      emotion: 2,
      budget: 2,
      timePressure: 2,
      competitorLoyalty: 4,
      decisionAuthority: 4,
    },
    targetSkills: ['competitor_comparison', 'value_proposition', 'trust_building', 'demo_pitch'],
    meta: { saleRate: 0.145, volumeShare: 0.202, avgPricePitched: 12088, emiShare: 0.7 },
    isActive: true,
  },
];

// ── Knowledge graph, grounded in the same data ────────────────────────────
// Objection nodes carry the REAL customer lines; counters carry moves observed
// in winning transcripts (selection frame, EMI translation, discount-last).

function objectionNode(cohortId, objectionId, extraTags = []) {
  const o = OBJECTIONS[objectionId];
  return {
    nodeId: `${cohortId}_v1_obj_${objectionId}`,
    type: 'objection',
    label: o.label,
    content: o.customerLine,
    cohortId,
    cohortVersion: 1,
    tags: [objectionId, ...extraTags],
    relatedSkills:
      objectionId === 'financial_constraint'
        ? ['pricing', 'emi_plans', 'price_objection']
        : objectionId === 'need_time'
          ? ['urgency_creation', 'closing', 'objection_handling']
          : objectionId === 'trust_deficit'
            ? ['trust_building', 'social_proof']
            : objectionId === 'family_consultation'
              ? ['decision_maker_identification', 'parent_engagement']
              : ['competitor_comparison', 'value_proposition'],
  };
}

export const KNOWLEDGE_NODES = [
  // One node per cohort for its top objections
  ...COHORTS.flatMap((c) => c.commonObjections.map((o) => objectionNode(c.cohortId, o))),

  // Shared counters observed in real winning calls (attached to every cohort)
  ...COHORTS.flatMap((c) => [
    {
      nodeId: `${c.cohortId}_v1_counter_emi`,
      type: 'counter',
      label: 'EMI translation',
      content:
        'Translate the annual price into a monthly EMI (Bajaj / credit card / Fibe). '
        + '75.6% of all closed deals are financed — treat EMI as the default, not a concession.',
      cohortId: c.cohortId,
      cohortVersion: 1,
      tags: ['financial_constraint', 'emi'],
      relatedSkills: ['emi_plans', 'pricing'],
    },
    {
      nodeId: `${c.cohortId}_v1_counter_selection`,
      type: 'counter',
      label: 'Selection framing',
      content:
        'Reframe from purchase to selection: "based on the test, we selected a small group of '
        + 'children from your school". Present in the majority of winning calls.',
      cohortId: c.cohortId,
      cohortVersion: 1,
      tags: ['need_time', 'trust_deficit'],
      relatedSkills: ['trust_building', 'urgency_creation'],
    },
    {
      nodeId: `${c.cohortId}_v1_pitch_report`,
      type: 'pitch',
      label: 'Test-report anchor',
      content:
        'Open from the child\'s own test/report data (present in 68% of winning calls, ~36% into '
        + 'the call). Diagnose before pitching; price comes late; discount comes last.',
      cohortId: c.cohortId,
      cohortVersion: 1,
      tags: ['opening'],
      relatedSkills: ['need_discovery', 'demo_pitch'],
    },
    {
      nodeId: `${c.cohortId}_v1_emotion_default`,
      type: 'emotion',
      label: 'Parent state',
      content:
        'Parent is cost-anxious but achievement-motivated. Financial pressure is ambient '
        + '(~52% of all non-closures) — assume it exists even when unspoken.',
      cohortId: c.cohortId,
      cohortVersion: 1,
      tags: ['emotion'],
      relatedSkills: ['empathy', 'trust_building'],
    },
  ]),
];

export const KNOWLEDGE_EDGES = COHORTS.flatMap((c) => [
  {
    fromNodeId: `${c.cohortId}_v1_obj_financial_constraint`,
    toNodeId: `${c.cohortId}_v1_counter_emi`,
    relationship: 'responds_to',
    cohortId: c.cohortId,
    cohortVersion: 1,
  },
  {
    fromNodeId: `${c.cohortId}_v1_obj_need_time`,
    toNodeId: `${c.cohortId}_v1_counter_selection`,
    relationship: 'responds_to',
    cohortId: c.cohortId,
    cohortVersion: 1,
  },
]).filter((e) =>
  KNOWLEDGE_NODES.some((n) => n.nodeId === e.fromNodeId)
  && KNOWLEDGE_NODES.some((n) => n.nodeId === e.toNodeId)
);
