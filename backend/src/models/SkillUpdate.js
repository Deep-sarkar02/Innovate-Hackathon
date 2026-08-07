import mongoose from 'mongoose';

const skillUpdateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TrainingSession', required: true },
    skillId: { type: String, required: true },
    previousScore: { type: Number, required: true },
    newScore: { type: Number, required: true },
    delta: { type: Number, required: true },
    reason: { type: String },
  },
  { timestamps: true }
);

export const SkillUpdate = mongoose.model('SkillUpdate', skillUpdateSchema);
