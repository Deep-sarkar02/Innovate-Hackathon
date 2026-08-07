import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  getRepProfileWithSkills,
  updateRepProfile,
  updateQuizOutcomes,
} from './rep-profile.service.js';

const router = Router();

const updateProfileSchema = Joi.object({
  city: Joi.string(),
  region: Joi.string(),
  language: Joi.string().valid('en', 'hi'),
  cohortAssignments: Joi.array().items(Joi.string()),
});

const quizOutcomesSchema = Joi.object().pattern(
  Joi.string(),
  Joi.object({
    score: Joi.number().min(0).max(100).required(),
    completedAt: Joi.date().allow(null),
    attempts: Joi.number().min(0),
  })
);

function resolveUserId(req) {
  return req.user.userId ?? req.user.id;
}

router.get('/me/profile', authenticate, async (req, res, next) => {
  try {
    const profile = await getRepProfileWithSkills(resolveUserId(req));
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/profile', authenticate, async (req, res, next) => {
  try {
    const profile = await getRepProfileWithSkills(req.params.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.put('/me/profile', authenticate, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const profile = await updateRepProfile(resolveUserId(req), req.body);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/profile', authenticate, validate(updateProfileSchema), async (req, res, next) => {
  try {
    const profile = await updateRepProfile(req.params.id, req.body);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/me/quiz-outcomes',
  authenticate,
  validate(quizOutcomesSchema),
  async (req, res, next) => {
    try {
      const profile = await updateQuizOutcomes(resolveUserId(req), req.body);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/:id/quiz-outcomes',
  authenticate,
  validate(quizOutcomesSchema),
  async (req, res, next) => {
    try {
      const profile = await updateQuizOutcomes(req.params.id, req.body);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
