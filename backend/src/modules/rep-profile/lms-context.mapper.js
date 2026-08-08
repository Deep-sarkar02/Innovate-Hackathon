/**
 * Maps Frappe LMS CRT profile payloads into quiz outcomes, skill priors,
 * and training objectives the planner/agents already understand.
 */

export const PRODUCT_KNOWLEDGE_TO_QUIZ_KEY = {
  'Target Exams': 'target_exams',
  'Target Exam': 'target_exams',
  'CBSE Foundation': 'cbse_foundation',
  'Math Champ': 'math_champ',
  'Test Prep': 'test_prep',
  'Test Prep Foundation': 'test_prep',
  LeadSquared: 'leadsquared',
  LSQ: 'leadsquared',
  'Sales Process': 'sales_process',
};

export const QUIZ_KEY_TO_SKILLS = {
  target_exams: ['academic_knowledge', 'jee_specific', 'neet_specific'],
  cbse_foundation: ['course_structure', 'value_proposition', 'demo_pitch'],
  math_champ: ['value_proposition', 'demo_pitch'],
  test_prep: ['academic_knowledge', 'demo_pitch', 'value_proposition'],
  leadsquared: ['crm_documentation', 'follow_up'],
  sales_process: ['need_discovery', 'objection_handling', 'closing', 'demo_pitch'],
};

export const WEAK_AREA_TO_SKILLS = {
  'jee eligibility': ['jee_specific', 'academic_knowledge'],
  'jee main eligibility': ['jee_specific', 'academic_knowledge'],
  'neet attempt rules': ['neet_specific', 'academic_knowledge'],
  'neet exam pattern': ['neet_specific', 'academic_knowledge'],
  'test prep books': ['academic_knowledge', 'value_proposition'],
  'objection handling': ['objection_handling'],
  'customer objection resolution': ['objection_handling'],
  'demo booking flow': ['demo_pitch', 'closing'],
  'ranker series': ['academic_knowledge', 'value_proposition'],
  'customer discovery': ['need_discovery'],
  'customer follow-up': ['follow_up'],
};

export const RECOMMENDED_MODULE_TO_SKILL = {
  'competitive exam refresher': ['academic_knowledge', 'jee_specific', 'neet_specific'],
  'advanced test prep products': ['academic_knowledge', 'value_proposition'],
  'sales objection handling': ['objection_handling'],
  'customer discovery techniques': ['need_discovery'],
};

const WEAK_SCORE_THRESHOLD = 80;

function slugKey(label) {
  return String(label).trim().toLowerCase();
}

export function quizKeyForProduct(label) {
  return PRODUCT_KNOWLEDGE_TO_QUIZ_KEY[label]
    ?? String(label).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

/** Flatten productKnowledge + dailyPerformance into quizOutcomes map entries. */
export function normalizeQuizOutcomes(lmsContext = {}) {
  const outcomes = {};
  const now = new Date();

  if (lmsContext.productKnowledge && typeof lmsContext.productKnowledge === 'object') {
    for (const [label, score] of Object.entries(lmsContext.productKnowledge)) {
      const key = quizKeyForProduct(label);
      outcomes[key] = {
        score: Number(score),
        completedAt: now,
        attempts: 1,
        source: 'lms_product_knowledge',
        label,
      };
    }
  }

  if (Array.isArray(lmsContext.dailyPerformance)) {
    for (const day of lmsContext.dailyPerformance) {
      if (day?.score == null) continue;
      const key = quizKeyForProduct(day.title ?? `day_${day.day}`);
      if (!outcomes[key] || day.score < outcomes[key].score) {
        outcomes[key] = {
          score: Number(day.score),
          completedAt: now,
          attempts: 1,
          source: 'lms_daily_performance',
          label: day.title,
          day: day.day,
          status: day.status,
        };
      }
    }
  }

  return outcomes;
}

/** Skills that should be prioritised for remediation from LMS weak signals. */
export function deriveWeakSkills(lmsContext = {}) {
  const skillScores = new Map();

  const bump = (skillId, amount, reason) => {
    const prev = skillScores.get(skillId) ?? { priority: 0, reasons: [] };
    skillScores.set(skillId, {
      priority: prev.priority + amount,
      reasons: [...prev.reasons, reason],
    });
  };

  for (const area of lmsContext.weakAreas ?? []) {
    const skills = WEAK_AREA_TO_SKILLS[slugKey(area)] ?? ['academic_knowledge'];
    for (const skillId of skills) bump(skillId, 25, `weak_area:${area}`);
  }

  for (const concept of lmsContext.conceptsToRevise ?? []) {
    const skills = WEAK_AREA_TO_SKILLS[slugKey(concept)] ?? [];
    for (const skillId of skills.length ? skills : ['academic_knowledge']) {
      bump(skillId, 15, `concept:${concept}`);
    }
  }

  if (lmsContext.productKnowledge) {
    for (const [label, score] of Object.entries(lmsContext.productKnowledge)) {
      if (Number(score) >= WEAK_SCORE_THRESHOLD) continue;
      const key = quizKeyForProduct(label);
      for (const skillId of QUIZ_KEY_TO_SKILLS[key] ?? []) {
        bump(skillId, WEAK_SCORE_THRESHOLD - Number(score), `product:${label}`);
      }
    }
  }

  for (const mod of lmsContext.recommendedTrainingModules ?? []) {
    for (const skillId of RECOMMENDED_MODULE_TO_SKILL[slugKey(mod)] ?? []) {
      bump(skillId, 10, `recommended:${mod}`);
    }
  }

  return [...skillScores.entries()]
    .map(([skillId, meta]) => ({ skillId, ...meta }))
    .sort((a, b) => b.priority - a.priority);
}

/** Pick a simulation objective skillId from LMS context (falls back to null). */
export function pickObjectiveFromLms(lmsContext) {
  if (!lmsContext) return null;
  const ranked = deriveWeakSkills(lmsContext);
  return ranked[0]?.skillId ?? null;
}

/** Merge LMS-derived quiz outcomes into an existing Map/object without dropping manual entries. */
export function mergeQuizOutcomes(existing, lmsOutcomes) {
  const merged = {};

  if (existing instanceof Map) {
    for (const [k, v] of existing.entries()) merged[k] = v;
  } else if (existing && typeof existing === 'object') {
    Object.assign(merged, existing);
  }

  for (const [key, outcome] of Object.entries(lmsOutcomes)) {
    const prev = merged[key];
    if (!prev || outcome.score <= (prev.score ?? 100)) {
      merged[key] = outcome;
    }
  }

  return merged;
}

/** Sanitize incoming LMS payload — strip unknown fields, coerce types. */
export function sanitizeLmsContext(raw = {}) {
  const productKnowledge = raw.productKnowledge && typeof raw.productKnowledge === 'object'
    ? Object.fromEntries(
      Object.entries(raw.productKnowledge).map(([k, v]) => [k, Number(v)]),
    )
    : undefined;

  return {
    completed: Boolean(raw.completed),
    overallScore: raw.overallScore != null ? Number(raw.overallScore) : undefined,
    overallPercentage: raw.overallPercentage != null ? Number(raw.overallPercentage) : undefined,
    completionRate: raw.completionRate != null ? Number(raw.completionRate) : undefined,
    knowledgeLevel: raw.knowledgeLevel ? String(raw.knowledgeLevel) : undefined,
    productKnowledge,
    strongAreas: Array.isArray(raw.strongAreas) ? raw.strongAreas.map(String) : [],
    weakAreas: Array.isArray(raw.weakAreas) ? raw.weakAreas.map(String) : [],
    conceptsToRevise: Array.isArray(raw.conceptsToRevise) ? raw.conceptsToRevise.map(String) : [],
    dailyPerformance: Array.isArray(raw.dailyPerformance)
      ? raw.dailyPerformance.map((d) => ({
        day: Number(d.day),
        title: String(d.title ?? ''),
        score: d.score != null ? Number(d.score) : undefined,
        status: d.status ? String(d.status) : undefined,
      }))
      : [],
    recommendedTrainingModules: Array.isArray(raw.recommendedTrainingModules)
      ? raw.recommendedTrainingModules.map(String)
      : [],
    salesReadinessScore: raw.salesReadinessScore != null ? Number(raw.salesReadinessScore) : undefined,
    certificationStatus: raw.certificationStatus ? String(raw.certificationStatus) : undefined,
    llmSummary: raw.llmSummary ? String(raw.llmSummary) : undefined,
    syncedAt: new Date(),
  };
}
