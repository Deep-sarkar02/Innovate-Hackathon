import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import { getSkillGraphForUser, getTeamSkillRollup } from './skill-graph.service.js';

const router = Router();

router.get('/team/rollup', authenticate, async (req, res, next) => {
  try {
    const rollup = await getTeamSkillRollup();
    res.json(rollup);
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const graph = await getSkillGraphForUser(req.user.id);
    res.json(graph);
  } catch (err) {
    next(err);
  }
});

router.get('/:userId', authenticate, async (req, res, next) => {
  try {
    const graph = await getSkillGraphForUser(req.params.userId);
    res.json(graph);
  } catch (err) {
    next(err);
  }
});

export default router;
