import mongoose from 'mongoose';

const skillDeltaSchema = new mongoose.Schema(
  {
    skillId: { type: String, required: true },
    previousScore: { type: Number, required: true },
    newScore: { type: Number, required: true },
    delta: { type: Number, required: true },
  },
  { _id: false }
);

const sessionInsightSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrainingSession',
      required: true,
      unique: true,
      index: true,
    },
    repId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    objective: { type: String, required: true },
    cohortId: { type: String, required: true },
    cohortVersion: { type: Number, required: true },
    skillDeltas: [skillDeltaSchema],
    mistakes: [{ type: String }],
    highlights: [{ type: String }],
    keyQuotes: [{ type: String }],
    confidence: { type: Number, min: 0, max: 100 },
    durationMinutes: { type: Number },
    overallScore: { type: Number, min: 0, max: 100 },
    coachFeedback: { type: String },
    lmsRecommendations: [
      {
        moduleId: String,
        reason: String,
        priority: { type: String, enum: ['low', 'medium', 'high'] },
      },
    ],
    observerScores: { type: Map, of: Number },
  },
  { timestamps: true }
);

export const SessionInsight = mongoose.model('SessionInsight', sessionInsightSchema);
