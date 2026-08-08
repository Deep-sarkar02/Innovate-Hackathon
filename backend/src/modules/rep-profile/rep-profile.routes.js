import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  getRepProfileWithSkills,
  updateRepProfile,
  updateQuizOutcomes,
  ingestLmsContext,
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

const lmsContextSchema = Joi.object({
  completed: Joi.boolean(),
  overallScore: Joi.number().min(0).max(100),
  overallPercentage: Joi.number().min(0).max(100),
  completionRate: Joi.number().min(0).max(100),
  knowledgeLevel: Joi.string(),
  productKnowledge: Joi.object().pattern(Joi.string(), Joi.number().min(0).max(100)),
  strongAreas: Joi.array().items(Joi.string()),
  weakAreas: Joi.array().items(Joi.string()),
  conceptsToRevise: Joi.array().items(Joi.string()),
  dailyPerformance: Joi.array().items(
    Joi.object({
      day: Joi.number(),
      title: Joi.string(),
      score: Joi.number().min(0).max(100),
      status: Joi.string(),
    }),
  ),
  recommendedTrainingModules: Joi.array().items(Joi.string()),
  salesReadinessScore: Joi.number().min(0).max(100),
  certificationStatus: Joi.string(),
  llmSummary: Joi.string(),
}).unknown(true);

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

router.post(
  '/me/lms-context',
  authenticate,
  validate(lmsContextSchema),
  async (req, res, next) => {
    try {
      const profile = await ingestLmsContext(resolveUserId(req), req.body);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/:id/lms-context',
  authenticate,
  validate(lmsContextSchema),
  async (req, res, next) => {
    try {
      const profile = await ingestLmsContext(req.params.id, req.body);
      res.json(profile);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
