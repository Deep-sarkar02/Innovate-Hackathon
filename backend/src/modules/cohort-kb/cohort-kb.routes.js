import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import {
  listCohorts,
  getActiveCohort,
  createCohortVersion,
  getRelevantKnowledge,
} from './cohort-kb.service.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    const cohorts = await listCohorts();
    res.json(cohorts);
  } catch (err) {
    next(err);
  }
});

router.get('/:cohortId', authenticate, async (req, res, next) => {
  try {
    const version = req.query.version ? parseInt(req.query.version, 10) : undefined;
    const cohort = await getActiveCohort(req.params.cohortId, version);
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
    res.json(cohort);
  } catch (err) {
    next(err);
  }
});

router.get('/:cohortId/knowledge', authenticate, async (req, res, next) => {
  try {
    const version = parseInt(req.query.version ?? '2', 10);
    const objection = req.query.objection ?? 'high_fees';
    const knowledge = await getRelevantKnowledge(objection, req.params.cohortId, version);
    res.json(knowledge);
  } catch (err) {
    next(err);
  }
});

const versionSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string(),
  pitchPoints: Joi.array().items(Joi.string()),
  commonObjections: Joi.array().items(Joi.string()),
  personas: Joi.array().items(Joi.string()),
  targetSkills: Joi.array().items(Joi.string()),
});

router.post(
  '/:cohortId/version',
  authenticate,
  authorize('admin'),
  validate(versionSchema),
  async (req, res, next) => {
    try {
      const cohort = await createCohortVersion(req.params.cohortId, req.body);
      res.status(201).json(cohort);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
