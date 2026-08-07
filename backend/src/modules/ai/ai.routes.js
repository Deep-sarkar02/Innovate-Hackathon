import { Router } from 'express';
import Joi from 'joi';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as aiService from './ai.service.js';

const router = Router();

router.post(
  '/transcript/:meetingId',
  validate(
    Joi.object({
      speaker: Joi.string().valid('customer', 'ai', 'sales_executive').required(),
      text: Joi.string().min(1).required(),
    })
  ),
  async (req, res, next) => {
    try {
      const result = await aiService.appendTranscript(req.params.meetingId, req.body);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

router.post('/analyze/:meetingId', async (req, res, next) => {
  try {
    const analysis = await aiService.analyzeConversation(req.params.meetingId);
    res.json(analysis);
  } catch (err) {
    next(err);
  }
});

router.get('/transcript/:meetingId', async (req, res, next) => {
  try {
    res.json(await aiService.getTranscript(req.params.meetingId));
  } catch (err) {
    next(err);
  }
});

router.get('/summary/:meetingId', async (req, res, next) => {
  try {
    res.json(await aiService.getSummary(req.params.meetingId));
  } catch (err) {
    next(err);
  }
});

router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    res.json(await aiService.getDashboardStats(req.user.userId));
  } catch (err) {
    next(err);
  }
});

export default router;
