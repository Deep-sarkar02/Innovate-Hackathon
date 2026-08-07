/**
 * Skill catalog.
 *
 * `grounded: true` marks the 12 skills whose scores can be tied to observable
 * evidence in the real call corpus (761 closed sales / 5,472 non-sales,
 * 5 labelled non-closure reasons, winning-call structural markers).
 *
 * WHY THIS MATTERS: the Observer scores ONLY grounded skills. With ~761
 * positive outcomes, scoring all 46 skills means ~17 examples per skill —
 * that is fitting noise and the scores would be LLM opinion wearing a number.
 * Ungrounded skills stay in the catalog (schema unchanged, radar can show
 * them as "not yet measured") and graduate to grounded as transcript volume
 * accumulates. Do not flip a skill to grounded without a validation set.
 */
export const SKILLS = [
  // ── Grounded: observable in transcripts + tied to labelled outcomes ──
  { skillId: 'greeting', name: 'Greeting', category: 'opening', weight: 6, grounded: true, relatedModules: ['opening_basics'] },
  { skillId: 'need_discovery', name: 'Need Discovery', category: 'discovery', weight: 9, grounded: true, relatedModules: ['discovery_techniques'] },
  { skillId: 'trust_building', name: 'Trust Building', category: 'soft_skills', weight: 8, grounded: true, relatedModules: ['rapport_building'] },
  { skillId: 'scholarship', name: 'Scholarship', category: 'product_knowledge', weight: 9, grounded: true, relatedModules: ['scholarship_basics'] },
  { skillId: 'pricing', name: 'Pricing', category: 'product_knowledge', weight: 10, grounded: true, relatedModules: ['pricing_emi'] },
  { skillId: 'emi_plans', name: 'EMI Plans', category: 'product_knowledge', weight: 8, grounded: true, prerequisites: ['pricing'], relatedModules: ['pricing_emi'] },
  { skillId: 'demo_pitch', name: 'Demo Pitch', category: 'product_knowledge', weight: 7, grounded: true, relatedModules: ['demo_mastery'] },
  { skillId: 'objection_handling', name: 'Objection Handling', category: 'objection', weight: 10, grounded: true, relatedModules: ['objection_handling'] },
  { skillId: 'competitor_comparison', name: 'Competitor Comparison', category: 'objection', weight: 8, grounded: true, relatedModules: ['competitor_comparison'] },
  { skillId: 'urgency_creation', name: 'Urgency Creation', category: 'closing', weight: 7, grounded: true, relatedModules: ['closing_techniques'] },
  { skillId: 'closing', name: 'Closing', category: 'closing', weight: 10, grounded: true, relatedModules: ['closing_techniques'] },
  { skillId: 'value_proposition', name: 'Value Proposition', category: 'product_knowledge', weight: 8, grounded: true, relatedModules: ['value_selling'] },

  // ── Not yet grounded: kept in catalog, not scored by the Observer ──
  { skillId: 'rapport', name: 'Rapport Building', category: 'opening', weight: 7, prerequisites: ['greeting'], relatedModules: ['rapport_building'] },
  { skillId: 'need_mapping', name: 'Need Mapping', category: 'discovery', weight: 8, prerequisites: ['need_discovery'], relatedModules: ['discovery_techniques'] },
  { skillId: 'active_listening', name: 'Active Listening', category: 'soft_skills', weight: 8, relatedModules: ['soft_skills_101'] },
  { skillId: 'empathy', name: 'Empathy', category: 'soft_skills', weight: 7, relatedModules: ['soft_skills_101'] },
  { skillId: 'confidence', name: 'Confidence', category: 'soft_skills', weight: 6, relatedModules: ['soft_skills_101'] },
  { skillId: 'storytelling', name: 'Storytelling', category: 'soft_skills', weight: 6, relatedModules: ['storytelling_success'] },
  { skillId: 'interruptions', name: 'Handling Interruptions', category: 'soft_skills', weight: 5, relatedModules: ['soft_skills_101'] },
  { skillId: 'academic_knowledge', name: 'Academic Knowledge', category: 'product_knowledge', weight: 8, relatedModules: ['academic_overview'] },
  { skillId: 'ranks', name: 'Ranks & Results', category: 'product_knowledge', weight: 7, relatedModules: ['results_showcase'] },
  { skillId: 'faculty', name: 'Faculty Pitch', category: 'product_knowledge', weight: 7, relatedModules: ['faculty_excellence'] },
  { skillId: 'course_structure', name: 'Course Structure', category: 'product_knowledge', weight: 6, relatedModules: ['academic_overview'] },
  { skillId: 'price_objection', name: 'Price Objection', category: 'objection', weight: 9, prerequisites: ['pricing', 'objection_handling'], relatedModules: ['pricing_emi'] },
  { skillId: 'timing_objection', name: 'Timing Objection', category: 'objection', weight: 7, relatedModules: ['objection_handling'] },
  { skillId: 'competitor_objection', name: 'Competitor Objection', category: 'objection', weight: 8, relatedModules: ['competitor_comparison'] },
  { skillId: 'parent_objection', name: 'Parent Objection', category: 'objection', weight: 8, relatedModules: ['parent_engagement'] },
  { skillId: 'trial_close', name: 'Trial Close', category: 'closing', weight: 8, prerequisites: ['closing'], relatedModules: ['closing_techniques'] },
  { skillId: 'next_steps', name: 'Next Steps', category: 'closing', weight: 7, relatedModules: ['closing_techniques'] },
  { skillId: 'follow_up', name: 'Follow Up', category: 'follow_up', weight: 7, relatedModules: ['follow_up_mastery'] },
  { skillId: 'crm_documentation', name: 'CRM Documentation', category: 'follow_up', weight: 5, relatedModules: ['crm_basics'] },
  { skillId: 'neet_specific', name: 'NEET Specific Pitch', category: 'product_knowledge', weight: 8, relatedModules: ['neet_mastery'] },
  { skillId: 'jee_specific', name: 'JEE Specific Pitch', category: 'product_knowledge', weight: 8, relatedModules: ['jee_mastery'] },
  { skillId: 'parent_engagement', name: 'Parent Engagement', category: 'discovery', weight: 9, relatedModules: ['parent_engagement'] },
  { skillId: 'regional_context', name: 'Regional Context', category: 'soft_skills', weight: 6, relatedModules: ['regional_selling'] },
  { skillId: 'hindi_communication', name: 'Hindi Communication', category: 'soft_skills', weight: 7, relatedModules: ['hindi_sales'] },
  { skillId: 'english_communication', name: 'English Communication', category: 'soft_skills', weight: 7, relatedModules: ['english_sales'] },
  { skillId: 'question_framing', name: 'Question Framing', category: 'discovery', weight: 7, relatedModules: ['discovery_techniques'] },
  { skillId: 'pain_amplification', name: 'Pain Amplification', category: 'discovery', weight: 7, relatedModules: ['discovery_techniques'] },
  { skillId: 'social_proof', name: 'Social Proof', category: 'product_knowledge', weight: 7, relatedModules: ['results_showcase'] },
  { skillId: 'scholarship_negotiation', name: 'Scholarship Negotiation', category: 'objection', weight: 8, prerequisites: ['scholarship'], relatedModules: ['scholarship_basics'] },
  { skillId: 'batch_timing', name: 'Batch Timing Pitch', category: 'product_knowledge', weight: 5, relatedModules: ['academic_overview'] },
  { skillId: 'online_vs_offline', name: 'Online vs Offline', category: 'objection', weight: 6, relatedModules: ['product_comparison'] },
  { skillId: 'decision_maker_identification', name: 'Decision Maker ID', category: 'discovery', weight: 8, relatedModules: ['discovery_techniques'] },
];

export const GROUNDED_SKILLS = SKILLS.filter((s) => s.grounded);
export const GROUNDED_SKILL_IDS = GROUNDED_SKILLS.map((s) => s.skillId);

// Note: 'dropper_handling' was removed — droppers are 0% of the real funnel.
