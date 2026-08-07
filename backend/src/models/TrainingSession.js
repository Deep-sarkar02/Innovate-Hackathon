import mongoose from 'mongoose';

const difficultySchema = new mongoose.Schema(
  {
    knowledge: { type: Number, min: 1, max: 5 },
    emotion: { type: Number, min: 1, max: 5 },
    budget: { type: Number, min: 1, max: 5 },
    timePressure: { type: Number, min: 1, max: 5 },
    competitorLoyalty: { type: Number, min: 1, max: 5 },
    decisionAuthority: { type: Number, min: 1, max: 5 },
  },
  { _id: false }
);

const sessionBriefSchema = new mongoose.Schema(
  {
    objective: { type: String, required: true },
    difficulty: difficultySchema,
    persona: { type: String, required: true },
    mood: { type: String, default: 'neutral' },
    primaryObjection: { type: String },
    goal: { type: String },
    cohortId: { type: String, required: true },
    cohortVersion: { type: Number, required: true },
  },
  { _id: false }
);

const customerStateSchema = new mongoose.Schema(
  {
    belief: { type: Number, default: 50, min: 0, max: 100 },
    trust: { type: Number, default: 40, min: 0, max: 100 },
    urgency: { type: Number, default: 30, min: 0, max: 100 },
    financialComfort: { type: Number, default: 30, min: 0, max: 100 },
    emotionalConfidence: { type: Number, default: 50, min: 0, max: 100 },
    academicAnxiety: { type: Number, default: 60, min: 0, max: 100 },
    competitorAffinity: { type: Number, default: 40, min: 0, max: 100 },
    decisionReadiness: { type: Number, default: 20, min: 0, max: 100 },
  },
  { _id: false }
);

const transcriptEntrySchema = new mongoose.Schema(
  {
    speaker: { type: String, enum: ['customer', 'sales_executive'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const trainingSessionSchema = new mongoose.Schema(
  {
    repId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    roomId: { type: String, index: true },
    status: {
      type: String,
      enum: ['planned', 'active', 'ended'],
      default: 'planned',
    },
    mode: { type: String, enum: ['training', 'copilot'], default: 'training' },
    sessionBrief: sessionBriefSchema,
    customerState: customerStateSchema,
    transcript: [transcriptEntrySchema],
    language: { type: String, enum: ['en', 'hi'], default: 'en' },
    voiceGender: { type: String, enum: ['female', 'male'], default: 'female' },
    voicePersona: { type: String, default: 'arbor' },
    startTime: { type: Date },
    endTime: { type: Date },
    transcriptExpiresAt: { type: Date },
  },
  { timestamps: true }
);

export const TrainingSession = mongoose.model('TrainingSession', trainingSessionSchema);
