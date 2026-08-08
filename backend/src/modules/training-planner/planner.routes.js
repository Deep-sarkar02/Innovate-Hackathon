import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../../middleware/validate.middleware.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { previewPlan, generateSessionBrief } from './planner.service.js';

const router = Router();

const planSchema = Joi.object({
  repId: Joi.string(),
  profileId: Joi.string(),
});

router.post('/plan', authenticate, validate(planSchema), async (req, res, next) => {
  try {
    const repId = req.body.repId ?? req.user.id;
    const plan = await previewPlan(repId, { profileId: req.body.profileId });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

router.get('/plan/today', authenticate, async (req, res, next) => {
  try {
    const plan = await previewPlan(req.user.id, { profileId: req.query.profileId });
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

export default router;
