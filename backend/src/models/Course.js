import mongoose from 'mongoose';

/**
 * A drip-gated course (e.g. the 5-day CRT).
 *
 * Structure mirrors how corporate classroom training actually runs:
 *   Course → days → items. An item is a slide deck ("embedded PPT"), a quiz,
 *   or an activity. Decks carry CHECKPOINTS — short quizzes injected mid-deck
 *   (e.g. after page 7 of 14) that must be passed before later pages unlock.
 *   Each day ends with a final quiz; passing it unlocks the next day.
 *
 * All gating is enforced SERVER-SIDE in course.service.js — the client never
 * receives content for locked days/pages, so skipping cannot be done from
 * the browser console.
 */

const questionSchema = new mongoose.Schema(
  {
    q: { type: String, required: true },
    options: { type: [String], required: true },
    // index into options — stripped from API responses before grading
    answer: { type: Number, required: true },
  },
  { _id: false }
);

const slideSchema = new mongoose.Schema(
  {
    page: { type: Number, required: true },
    title: { type: String, default: '' },
    bullets: { type: [String], default: [] },
    note: { type: String }, // e.g. reference to the source PPT link
    // true = this page is a rendered image of the real PPT/PDF, streamed
    // per-page through the gated slide endpoint (originals are never served)
    image: { type: Boolean, default: false },
  },
  { _id: false }
);

const checkpointSchema = new mongoose.Schema(
  {
    afterPage: { type: Number, required: true },
    questions: { type: [questionSchema], required: true },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    type: { type: String, enum: ['deck', 'quiz', 'activity'], required: true },
    title: { type: String, required: true },
    durationMinutes: { type: Number, default: 15 },
    required: { type: Boolean, default: true },
    deck: {
      slides: { type: [slideSchema], default: undefined },
      checkpoints: { type: [checkpointSchema], default: undefined },
      sourceLink: { type: String },
    },
    quiz: {
      questions: { type: [questionSchema], default: undefined },
      passPct: { type: Number, default: 70 },
    },
    activity: {
      instructions: { type: String },
    },
  },
  { _id: false }
);

const daySchema = new mongoose.Schema(
  {
    day: { type: Number, required: true },
    title: { type: String, required: true },
    summary: { type: String },
    items: { type: [itemSchema], default: [] },
  },
  { _id: false }
);

const courseSchema = new mongoose.Schema(
  {
    courseId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    days: { type: [daySchema], default: [] },
  },
  { timestamps: true }
);

export const Course = mongoose.model('Course', courseSchema);
