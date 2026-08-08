import { v4 as uuidv4 } from 'uuid';
import { TrainingSession } from '../../models/TrainingSession.js';
import { SessionInsight } from '../../models/SessionInsight.js';
import { generateSessionBrief } from '../training-planner/planner.service.js';
import { generateCustomerReply, updateCustomerState } from '../agents/customer.agent.js';
import { observeSession } from '../agents/observer.agent.js';
import { coachSession } from '../agents/coach.agent.js';
import { getSkillGraphForUser } from '../skill-graph/skill-graph.service.js';
import { env, isLiveKitConfigured } from '../../config/env.js';
import { AccessToken } from 'livekit-server-sdk';

const TRANSCRIPT_TTL_HOURS = 24;

function initialCustomerState(sessionBrief) {
  const d = sessionBrief.difficulty ?? {};
  return {
    belief: 50,
    trust: Math.max(0, 40 - (d.emotion ?? 0) * 5),
    urgency: Math.min(100, 30 + (d.timePressure ?? 0) * 8),
    financialComfort: Math.max(0, 30 - (d.budget ?? 0) * 8),
    emotionalConfidence: 50,
    academicAnxiety: Math.min(100, 60 + (d.emotion ?? 0) * 5),
    competitorAffinity: Math.min(100, 40 + (d.competitorLoyalty ?? 0) * 10),
    decisionReadiness: Math.min(100, 20 + (d.decisionAuthority ?? 0) * 5),
  };
}

async function createLiveKitToken(roomId, identity, name) {
  if (!isLiveKitConfigured()) return 'demo-token';

  const at = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity,
    name,
    metadata: JSON.stringify({ role: identity }),
  });
  at.addGrant({ roomJoin: true, room: roomId, canPublish: true, canSubscribe: true });
  return at.toJwt();
}

export async function startTrainingSession(repId, options = {}) {
  const sessionBrief = options.sessionBrief ?? (await generateSessionBrief(repId));
  const language = options.language ?? sessionBrief.language ?? 'en';
  sessionBrief.language = language;
  const roomId = `train-${uuidv4().slice(0, 8)}`;

  const expires = new Date();
  expires.setHours(expires.getHours() + TRANSCRIPT_TTL_HOURS);

  const session = await TrainingSession.create({
    repId,
    roomId,
    status: 'active',
    mode: 'training',
    sessionBrief,
    customerState: initialCustomerState(sessionBrief),
    language,
    voiceGender: options.voiceGender ?? 'female',
    voicePersona: options.voicePersona ?? 'arbor',
    startTime: new Date(),
    transcriptExpiresAt: expires,
    transcript: [],
  });

  const salesToken = await createLiveKitToken(roomId, `rep-${repId}`, 'Sales Rep');
  const customerToken = await createLiveKitToken(roomId, `customer-agent-${roomId}`, sessionBrief.customerName ?? 'Customer');

  return {
    sessionId: session._id,
    roomId,
    sessionBrief,
    customerState: session.customerState,
    tokens: { salesToken, customerToken },
    livekitUrl: env.livekit?.url,
  };
}

export async function appendTrainingTurn(sessionId, { speaker, text }) {
  const session = await TrainingSession.findById(sessionId);
  if (!session) {
    const err = new Error('Training session not found');
    err.statusCode = 404;
    throw err;
  }

  session.transcript.push({ speaker, text, timestamp: new Date() });

  let customerReply = null;
  if (speaker === 'sales_executive') {
    session.customerState = updateCustomerState(session.customerState, text, session.sessionBrief);
    const replyText = await generateCustomerReply(session, text);
    if (replyText) {
      customerReply = { speaker: 'customer', text: replyText, timestamp: new Date() };
      session.transcript.push(customerReply);
    }
  }

  await session.save();

  return {
    transcript: session.transcript,
    customerReply,
    customerState: session.customerState,
  };
}

export async function getTrainingSession(sessionId) {
  const session = await TrainingSession.findById(sessionId).lean();
  if (!session) {
    const err = new Error('Training session not found');
    err.statusCode = 404;
    throw err;
  }
  return session;
}

export async function endTrainingSession(sessionId) {
  const session = await TrainingSession.findById(sessionId);
  if (!session) {
    const err = new Error('Training session not found');
    err.statusCode = 404;
    throw err;
  }

  session.status = 'ended';
  session.endTime = new Date();
  await session.save();

  const durationMinutes = session.startTime
    ? Math.round((session.endTime - session.startTime) / 60000)
    : 0;

  const observerOutput = await observeSession(session.sessionBrief, session.transcript);
  const currentGraph = await getSkillGraphForUser(session.repId);

  const coachResult = await coachSession({
    repId: session.repId,
    sessionId: session._id,
    sessionBrief: session.sessionBrief,
    observerOutput,
    currentGraph,
    durationMinutes,
  });

  session.transcript = [];
  await session.save();

  return {
    sessionId: session._id,
    durationMinutes,
    observerOutput,
    ...coachResult,
  };
}

export async function getDebrief(sessionId) {
  const insight = await SessionInsight.findOne({ sessionId }).lean();
  if (!insight) {
    const err = new Error('Debrief not found — session may not be ended yet');
    err.statusCode = 404;
    throw err;
  }
  return insight;
}

export async function listSessionsForRep(repId, limit = 20) {
  const insights = await SessionInsight.find({ repId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return insights;
}
