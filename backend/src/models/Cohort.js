import mongoose from 'mongoose';

const difficultyPresetSchema = new mongoose.Schema(
  {
    knowledge: { type: Number, min: 1, max: 5, default: 3 },
    emotion: { type: Number, min: 1, max: 5, default: 2 },
    budget: { type: Number, min: 1, max: 5, default: 3 },
    timePressure: { type: Number, min: 1, max: 5, default: 3 },
    competitorLoyalty: { type: Number, min: 1, max: 5, default: 2 },
    decisionAuthority: { type: Number, min: 1, max: 5, default: 3 },
  },
  { _id: false }
);

const cohortSchema = new mongoose.Schema(
  {
    cohortId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
    effectiveFrom: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    description: { type: String },
    pitchPoints: [{ type: String }],
    commonObjections: [{ type: String }],
    personas: [{ type: String }],
    difficultyPresets: difficultyPresetSchema,
    targetSkills: [{ type: String }],
  },
  { timestamps: true }
);

cohortSchema.index({ cohortId: 1, version: 1 }, { unique: true });

export const Cohort = mongoose.model('Cohort', cohortSchema);
