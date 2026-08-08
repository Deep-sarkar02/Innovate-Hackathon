/**
 * Sample CRT rep profile as returned by Frappe LMS after partial completion.
 * Day 1 of 5 scored; used for demo seed and integration tests.
 */
export const SAMPLE_LMS_CONTEXT = {
  completed: true,
  overallScore: 84,
  overallPercentage: 84,
  completionRate: 100,
  knowledgeLevel: 'Intermediate',
  productKnowledge: {
    'Target Exams': 78,
    'CBSE Foundation': 91,
    'Math Champ': 87,
    'Test Prep': 74,
    'LeadSquared': 96,
    'Sales Process': 82,
  },
  strongAreas: [
    'LeadSquared CRM',
    'CBSE Foundation',
    'Math Champ',
    'Customer Follow-up',
  ],
  weakAreas: [
    'JEE Eligibility',
    'NEET Attempt Rules',
    'Test Prep Books',
    'Objection Handling',
  ],
  conceptsToRevise: [
    'JEE Main Eligibility',
    'NEET Exam Pattern',
    'Ranker Series',
    'Demo Booking Flow',
    'Customer Objection Resolution',
  ],
  dailyPerformance: [
    { day: 1, title: 'Target Exam', score: 75, status: 'Needs Improvement' },
    { day: 2, title: 'CBSE Foundation & Math Champ', score: 89, status: 'Good' },
    { day: 3, title: 'Test Prep', score: 78, status: 'Average' },
    { day: 4, title: 'LeadSquared', score: 95, status: 'Excellent' },
    { day: 5, title: 'Sales Process', score: 83, status: 'Good' },
  ],
  recommendedTrainingModules: [
    'Competitive Exam Refresher',
    'Advanced Test Prep Products',
    'Sales Objection Handling',
    'Customer Discovery Techniques',
  ],
  salesReadinessScore: 86,
  certificationStatus: 'PASS',
  llmSummary:
    'The employee demonstrates strong operational knowledge of LeadSquared CRM and has a solid understanding of the CBSE Foundation and Math Champ products. Performance in competitive exam counselling is inconsistent, with repeated mistakes around JEE Main eligibility, NEET attempt rules, and Test Prep offerings. Sales process knowledge is satisfactory but objection handling and customer discovery require additional practice. The employee is ready to handle customer interactions with periodic coaching focused on competitive exam guidance and consultative selling.',
};
