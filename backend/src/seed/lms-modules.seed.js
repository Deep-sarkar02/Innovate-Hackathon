export const LMS_MODULES = [
  {
    moduleId: 'opening_basics',
    title: 'Opening & First Impressions',
    description: 'Master the first 60 seconds of a sales call',
    skills: ['greeting', 'rapport'],
    durationMinutes: 15,
    url: '/lms/opening-basics',
  },
  {
    moduleId: 'rapport_building',
    title: 'Rapport Building Mastery',
    description: 'Build trust quickly with parents and students',
    skills: ['rapport', 'trust_building'],
    durationMinutes: 20,
    url: '/lms/rapport-building',
  },
  {
    moduleId: 'discovery_techniques',
    title: 'Discovery Call Techniques',
    description: 'Ask the right questions to uncover needs',
    skills: ['need_discovery', 'need_mapping', 'question_framing'],
    durationMinutes: 25,
    url: '/lms/discovery-techniques',
  },
  {
    moduleId: 'scholarship_basics',
    title: 'Scholarship Programs Overview',
    description: 'Know every scholarship option and eligibility criteria',
    skills: ['scholarship', 'scholarship_negotiation'],
    durationMinutes: 20,
    url: '/lms/scholarship-basics',
  },
  {
    moduleId: 'pricing_emi',
    title: 'Pricing & EMI Plans',
    description: 'Confidently explain fees, EMI options, and payment plans',
    skills: ['pricing', 'emi_plans', 'price_objection'],
    durationMinutes: 30,
    url: '/lms/pricing-emi',
  },
  {
    moduleId: 'objection_handling',
    title: 'Objection Handling Framework',
    description: 'Handle any objection with the LAER method',
    skills: ['objection_handling', 'timing_objection', 'parent_objection'],
    durationMinutes: 25,
    url: '/lms/objection-handling',
  },
  {
    moduleId: 'competitor_comparison',
    title: 'Competitor Comparison',
    description: 'Position Infinity Learn against Allen, Aakash, and others',
    skills: ['competitor_comparison', 'competitor_objection', 'value_proposition'],
    durationMinutes: 20,
    url: '/lms/competitor-comparison',
  },
  {
    moduleId: 'closing_techniques',
    title: 'Closing Techniques',
    description: 'Move from interest to enrollment',
    skills: ['closing', 'trial_close', 'urgency_creation', 'next_steps'],
    durationMinutes: 25,
    url: '/lms/closing-techniques',
  },
  {
    moduleId: 'soft_skills_101',
    title: 'Sales Soft Skills',
    description: 'Listening, empathy, confidence, and communication',
    skills: ['active_listening', 'empathy', 'confidence', 'interruptions'],
    durationMinutes: 20,
    url: '/lms/soft-skills',
  },
  {
    moduleId: 'neet_mastery',
    title: 'NEET Sales Mastery',
    description: 'Cohort-specific pitch for NEET aspirants',
    skills: ['neet_specific'],
    durationMinutes: 30,
    url: '/lms/neet-mastery',
  },
  {
    moduleId: 'parent_engagement',
    title: 'Parent Engagement',
    description: 'Engage and convince decision-making parents',
    skills: ['parent_engagement', 'parent_objection', 'decision_maker_identification'],
    durationMinutes: 20,
    url: '/lms/parent-engagement',
  },
  {
    moduleId: 'follow_up_mastery',
    title: 'Follow Up Mastery',
    description: 'Never lose a lead after the first call',
    skills: ['follow_up', 'crm_documentation'],
    durationMinutes: 15,
    url: '/lms/follow-up',
  },
];

export const SKILL_TO_MODULE_MAP = LMS_MODULES.reduce((acc, mod) => {
  mod.skills.forEach((skill) => {
    if (!acc[skill]) acc[skill] = [];
    acc[skill].push(mod.moduleId);
  });
  return acc;
}, {});
