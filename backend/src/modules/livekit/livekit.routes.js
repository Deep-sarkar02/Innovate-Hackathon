import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { getDemoSalesExecutiveId } from '../../config/demoUser.js';
import * as livekitService from './livekit.service.js';
import { generateMeetingSummary } from '../ai/ai.service.js';

const router = Router();

router.post(
  '/create-room',
  validate(
    Joi.object({
      customerName: Joi.string().min(1).max(100).optional().allow(''),
      language: Joi.string().valid('en', 'hi').optional(),
      voiceGender: Joi.string().valid('female', 'male').optional(),
      voicePersona: Joi.string().optional(),
    })
  ),
  async (req, res, next) => {
    try {
      const salesExecutiveId = await getDemoSalesExecutiveId();
      const result = await livekitService.createRoom({
        salesExecutiveId,
        customerName: req.body.customerName,
        language: req.body.language,
        voiceGender: req.body.voiceGender,
        voicePersona: req.body.voicePersona,
      });
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/join/:inviteToken',
  validate(
    Joi.object({
      customerName: Joi.string().min(1).max(100).optional(),
    })
  ),
  async (req, res, next) => {
    try {
      const result = await livekitService.getJoinToken(req.params.inviteToken, req.body.customerName);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/end',
  validate(
    Joi.object({
      meetingId: Joi.string().required(),
    })
  ),
  async (req, res, next) => {
    try {
      const meeting = await livekitService.endMeeting(req.body.meetingId);
      const summary = await generateMeetingSummary(meeting._id);
      res.json({ meeting, summary });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/meeting/:meetingId/token', async (req, res, next) => {
  try {
    const result = await livekitService.getSalesToken(req.params.meetingId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/meeting/:meetingId', async (req, res, next) => {
  try {
    const meeting = await livekitService.getMeetingById(req.params.meetingId);
    res.json({
      meetingId: meeting._id,
      status: meeting.status,
      language: meeting.language,
      voiceGender: meeting.voiceGender,
      voicePersona: meeting.voicePersona,
      customerName: meeting.customerName,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/meetings', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId ?? req.user.id;
    const meetings = await livekitService.listMeetingsForUser(userId);
    res.json(meetings);
  } catch (err) {
    next(err);
  }
});

export default router;
