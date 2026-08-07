import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { v4 as uuidv4 } from 'uuid';
import { env, isLiveKitConfigured } from '../../config/env.js';
import { Meeting } from '../../models/Meeting.js';

function getRoomService() {
  if (!isLiveKitConfigured()) return null;
  const host = env.livekit.url.replace('wss://', 'https://').replace('ws://', 'http://');
  return new RoomServiceClient(host, env.livekit.apiKey, env.livekit.apiSecret);
}

function createParticipantToken(roomName, identity, name, metadata = {}) {
  const at = new AccessToken(env.livekit.apiKey, env.livekit.apiSecret, {
    identity,
    name,
    metadata: JSON.stringify(metadata),
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return at.toJwt();
}

export async function createRoom({ salesExecutiveId, customerName, language, voiceGender, voicePersona }) {
  const roomId = `meeting-${uuidv4().slice(0, 8)}`;
  const roomName = roomId;
  const inviteToken = uuidv4();

  const roomService = getRoomService();
  if (roomService) {
    await roomService.createRoom({
      name: roomName,
      emptyTimeout: 600,
      maxParticipants: 10,
    });
  }

  const meeting = await Meeting.create({
    roomId,
    roomName,
    salesExecutiveId,
    customerName: customerName || 'Customer',
    status: 'active',
    inviteToken,
    language: language || 'en',
    voiceGender: voiceGender || 'female',
    voicePersona: voicePersona || 'arbor',
  });

  const salesIdentity = `sales-${salesExecutiveId}`;
  const customerIdentity = `customer-${inviteToken.slice(0, 8)}`;
  const aiIdentity = `ai-agent-${roomId}`;

  let token, participantToken, customerToken, aiToken;

  if (isLiveKitConfigured()) {
    token = await createParticipantToken(roomName, salesIdentity, 'Sales Executive', {
      role: 'sales_executive',
      meetingId: meeting._id.toString(),
    });
    customerToken = await createParticipantToken(roomName, customerIdentity, customerName || 'Customer', {
      role: 'customer',
      meetingId: meeting._id.toString(),
    });
    aiToken = await createParticipantToken(roomName, aiIdentity, 'AI Assistant', {
      role: 'ai',
      meetingId: meeting._id.toString(),
    });
    participantToken = customerToken;
  } else {
    token = 'demo-token-sales';
    participantToken = 'demo-token-customer';
    customerToken = participantToken;
    aiToken = 'demo-token-ai';
  }

  return {
    meetingId: meeting._id,
    roomId,
    roomName,
    token,
    participantToken,
    customerToken,
    aiToken,
    livekitUrl: env.livekit.url,
    inviteLink: `/join/${inviteToken}`,
    inviteToken,
    language: meeting.language,
    voiceGender: meeting.voiceGender,
    voicePersona: meeting.voicePersona,
  };
}

export async function getJoinToken(inviteToken, customerName) {
  const meeting = await Meeting.findOne({ inviteToken, status: 'active' });
  if (!meeting) {
    const err = new Error('Meeting not found or has ended');
    err.statusCode = 404;
    throw err;
  }

  const customerIdentity = `customer-${inviteToken.slice(0, 8)}`;
  const name = customerName || meeting.customerName;

  let token;
  if (isLiveKitConfigured()) {
    token = await createParticipantToken(meeting.roomName, customerIdentity, name, {
      role: 'customer',
      meetingId: meeting._id.toString(),
    });
  } else {
    token = 'demo-token-customer';
  }

  return {
    meetingId: meeting._id,
    roomId: meeting.roomId,
    roomName: meeting.roomName,
    token,
    livekitUrl: env.livekit.url,
    customerName: name,
    language: meeting.language,
    voiceGender: meeting.voiceGender,
    voicePersona: meeting.voicePersona,
  };
}

export async function endMeeting(meetingId) {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    const err = new Error('Meeting not found');
    err.statusCode = 404;
    throw err;
  }

  meeting.status = 'ended';
  meeting.endTime = new Date();

  const roomService = getRoomService();
  if (roomService) {
    try {
      await roomService.deleteRoom(meeting.roomName);
    } catch {
      // Room may already be closed
    }
  }

  await meeting.save();
  return meeting;
}

export async function getMeetingById(meetingId) {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    const err = new Error('Meeting not found');
    err.statusCode = 404;
    throw err;
  }
  return meeting;
}

export async function listMeetingsForUser(userId) {
  return Meeting.find({ salesExecutiveId: userId }).sort({ createdAt: -1 }).limit(50);
}

export async function getSalesToken(meetingId) {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    const err = new Error('Meeting not found');
    err.statusCode = 404;
    throw err;
  }

  if (meeting.status !== 'active') {
    const err = new Error('Meeting has ended');
    err.statusCode = 400;
    throw err;
  }

  const salesIdentity = `sales-${meeting.salesExecutiveId}`;
  let token;

  if (isLiveKitConfigured()) {
    token = await createParticipantToken(meeting.roomName, salesIdentity, 'Sales Executive', {
      role: 'sales_executive',
      meetingId: meeting._id.toString(),
    });
  } else {
    token = 'demo-token-sales';
  }

  return {
    meetingId: meeting._id,
    roomId: meeting.roomId,
    roomName: meeting.roomName,
    token,
    livekitUrl: env.livekit.url,
    inviteLink: `/join/${meeting.inviteToken}`,
    inviteToken: meeting.inviteToken,
    customerName: meeting.customerName,
    startTime: meeting.startTime,
    language: meeting.language,
    voiceGender: meeting.voiceGender,
    voicePersona: meeting.voicePersona,
  };
}

export async function getActiveMeetingsCount(userId) {
  return Meeting.countDocuments({ salesExecutiveId: userId, status: 'active' });
}

export async function getTodayMeetingsCount(userId) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Meeting.countDocuments({ salesExecutiveId: userId, startTime: { $gte: start } });
}
