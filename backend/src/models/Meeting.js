import mongoose from 'mongoose';

const transcriptEntrySchema = new mongoose.Schema(
  {
    speaker: { type: String, enum: ['customer', 'ai', 'sales_executive'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const emotionEntrySchema = new mongoose.Schema(
  {
    emotion: {
      type: String,
      enum: ['happy', 'interested', 'confused', 'angry', 'hesitant', 'neutral'],
      required: true,
    },
    confidence: { type: Number, min: 0, max: 100, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const meetingSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    roomName: { type: String, required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, default: 'Customer' },
    salesExecutiveId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'ended'],
      default: 'active',
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    transcript: [transcriptEntrySchema],
    summary: {
      overview: String,
      painPoints: [String],
      questionsAsked: [String],
      objections: [String],
      actionItems: [String],
      followUp: String,
      leadScore: Number,
      recommendedNextStep: String,
    },
    emotionTimeline: [emotionEntrySchema],
    currentEmotion: {
      emotion: { type: String, default: 'neutral' },
      confidence: { type: Number, default: 0 },
    },
    leadScore: { type: Number, default: 50, min: 0, max: 100 },
    leadStatus: {
      type: String,
      enum: ['cold', 'warm', 'hot'],
      default: 'warm',
    },
    leadReasons: [String],
    suggestions: [String],
    recordingURL: { type: String },
    inviteToken: { type: String, index: true },
    language: { type: String, enum: ['en', 'hi'], default: 'en' },
    voiceGender: { type: String, enum: ['female', 'male'], default: 'female' },
    voicePersona: { type: String, default: 'arbor' },
  },
  { timestamps: true }
);

export const Meeting = mongoose.model('Meeting', meetingSchema);
