import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  startTrainingSession,
  appendTrainingTurn,
  endTrainingSession,
  getTrainingSession,
  getDebrief,
  listSessionsForRep,
} from './simulation.service.js';

const router = Router();

const startSchema = Joi.object({
  language: Joi.string().valid('en', 'hi'),
  voiceGender: Joi.string().valid('female', 'male'),
  voicePersona: Joi.string(),
});

const transcriptSchema = Joi.object({
  speaker: Joi.string().valid('sales_executive', 'customer').required(),
  text: Joi.string().required().min(1),
});

router.post('/start', authenticate, validate(startSchema), async (req, res, next) => {
  try {
    const result = await startTrainingSession(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/sessions', authenticate, async (req, res, next) => {
  try {
    const sessions = await listSessionsForRep(req.user.id);
    res.json(sessions);
  } catch (err) {
    next(err);
  }
});

router.get('/:sessionId', authenticate, async (req, res, next) => {
  try {
    const session = await getTrainingSession(req.params.sessionId);
    res.json(session);
  } catch (err) {
    next(err);
  }
});

router.post('/:sessionId/transcript', authenticate, validate(transcriptSchema), async (req, res, next) => {
  try {
    const result = await appendTrainingTurn(req.params.sessionId, req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/:sessionId/end', authenticate, async (req, res, next) => {
  try {
    const result = await endTrainingSession(req.params.sessionId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:sessionId/debrief', authenticate, async (req, res, next) => {
  try {
    const debrief = await getDebrief(req.params.sessionId);
    res.json(debrief);
  } catch (err) {
    next(err);
  }
});

export default router;
