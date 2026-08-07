import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { getModuleCatalog, getRecommendationsForRep } from './recommend.service.js';
import { getSkillGraphForUser } from '../skill-graph/skill-graph.service.js';

const router = Router();

router.get('/catalog', authenticate, async (_req, res) => {
  res.json(getModuleCatalog());
});

router.get('/me/recommendations', authenticate, async (req, res, next) => {
  try {
    const userId = req.user.userId ?? req.user.id;
    const skillGraph = await getSkillGraphForUser(userId);
    const recommendations = getRecommendationsForRep(skillGraph, req.query.objective);
    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

router.get('/:repId/recommendations', authenticate, async (req, res, next) => {
  try {
    const skillGraph = await getSkillGraphForUser(req.params.repId);
    const objective = req.query.objective;
    const recommendations = getRecommendationsForRep(skillGraph, objective);
    res.json(recommendations);
  } catch (err) {
    next(err);
  }
});

export default router;
