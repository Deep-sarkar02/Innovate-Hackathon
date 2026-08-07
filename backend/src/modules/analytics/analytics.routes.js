import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.middleware.js';
import { getTeamAnalytics, getRepAnalytics, getRepLeaderboard } from './analytics.service.js';

const router = Router();

router.get('/team', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const analytics = await getTeamAnalytics();
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

router.get('/rep/:repId', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const analytics = await getRepAnalytics(req.params.repId);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
});

router.get('/leaderboard', authenticate, authorize('admin'), async (_req, res, next) => {
  try {
    const leaderboard = await getRepLeaderboard();
    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
});

export default router;
