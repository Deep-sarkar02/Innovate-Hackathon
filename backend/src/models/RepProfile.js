import mongoose from 'mongoose';

const quizOutcomeSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 100 },
    completedAt: { type: Date },
    attempts: { type: Number, default: 0 },
  },
  { _id: false }
);

const dailyPerformanceSchema = new mongoose.Schema(
  {
    day: { type: Number },
    title: { type: String },
    score: { type: Number, min: 0, max: 100 },
    status: { type: String },
  },
  { _id: false }
);

const lmsContextSchema = new mongoose.Schema(
  {
    completed: { type: Boolean, default: false },
    overallScore: { type: Number, min: 0, max: 100 },
    overallPercentage: { type: Number, min: 0, max: 100 },
    completionRate: { type: Number, min: 0, max: 100 },
    knowledgeLevel: { type: String },
    productKnowledge: { type: Map, of: Number, default: {} },
    strongAreas: [{ type: String }],
    weakAreas: [{ type: String }],
    conceptsToRevise: [{ type: String }],
    dailyPerformance: [dailyPerformanceSchema],
    recommendedTrainingModules: [{ type: String }],
    salesReadinessScore: { type: Number, min: 0, max: 100 },
    certificationStatus: { type: String },
    llmSummary: { type: String },
    syncedAt: { type: Date },
  },
  { _id: false }
);

const repProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    city: { type: String, default: 'Hyderabad' },
    region: { type: String, default: 'South' },
    language: { type: String, enum: ['en', 'hi'], default: 'en' },
    cohortAssignments: [{ type: String }],
    quizOutcomes: {
      type: Map,
      of: quizOutcomeSchema,
      default: {},
    },
    lmsContext: lmsContextSchema,
    learningVelocity: { type: Number, default: 0 },
    lastSessionAt: { type: Date },
  },
  { timestamps: true }
);

export const RepProfile = mongoose.model('RepProfile', repProfileSchema);
