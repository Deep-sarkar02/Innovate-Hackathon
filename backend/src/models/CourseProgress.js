import mongoose from 'mongoose';

/**
 * Per-user course progress. The server is the single source of truth for
 * what is unlocked:
 *  - unlockedDay: highest day the user may open (starts at 1)
 *  - per item: maxPage reached (slides advance one at a time),
 *    checkpoints passed (by afterPage), completion + quiz score
 */

const itemProgressSchema = new mongoose.Schema(
  {
    maxPage: { type: Number, default: 0 },
    checkpointsPassed: { type: [Number], default: [] },
    completed: { type: Boolean, default: false },
    score: { type: Number },
    attempts: { type: Number, default: 0 },
    completedAt: { type: Date },
  },
  { _id: false }
);

const courseProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    courseId: { type: String, required: true },
    unlockedDay: { type: Number, default: 1 },
    items: { type: Map, of: itemProgressSchema, default: {} },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

courseProgressSchema.index({ userId: 1, courseId: 1 }, { unique: true });

export const CourseProgress = mongoose.model('CourseProgress', courseProgressSchema);
