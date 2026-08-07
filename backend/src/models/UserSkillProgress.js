import mongoose from 'mongoose';

const userSkillProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    skillId: { type: String, required: true, index: true },
    score: { type: Number, default: 50, min: 0, max: 100 },
    trend: { type: Number, default: 0 },
    sessionCount: { type: Number, default: 0 },
    attemptCount: { type: Number, default: 0 },
    improvementStreak: { type: Number, default: 0 },
    lastScore: { type: Number },
    masteredAt: { type: Date },
    deprioritizedUntil: { type: Date },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSkillProgressSchema.index({ userId: 1, skillId: 1 }, { unique: true });

export const UserSkillProgress = mongoose.model('UserSkillProgress', userSkillProgressSchema);
