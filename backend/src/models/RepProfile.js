import mongoose from 'mongoose';

const quizOutcomeSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 100 },
    completedAt: { type: Date },
    attempts: { type: Number, default: 0 },
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
    learningVelocity: { type: Number, default: 0 },
    lastSessionAt: { type: Date },
  },
  { timestamps: true }
);

export const RepProfile = mongoose.model('RepProfile', repProfileSchema);
