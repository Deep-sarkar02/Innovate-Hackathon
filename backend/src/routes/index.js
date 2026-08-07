import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import livekitRoutes from '../modules/livekit/livekit.routes.js';
import aiRoutes from '../modules/ai/ai.routes.js';
import repProfileRoutes from '../modules/rep-profile/rep-profile.routes.js';
import skillGraphRoutes from '../modules/skill-graph/skill-graph.routes.js';
import plannerRoutes from '../modules/training-planner/planner.routes.js';
import cohortRoutes from '../modules/cohort-kb/cohort-kb.routes.js';
import simulationRoutes from '../modules/simulation/simulation.routes.js';
import analyticsRoutes from '../modules/analytics/analytics.routes.js';
import lmsRoutes from '../modules/lms-recommend/recommend.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/livekit', livekitRoutes);
router.use('/rep', repProfileRoutes);
router.use('/skills', skillGraphRoutes);
router.use('/training', plannerRoutes);
router.use('/training', simulationRoutes);
router.use('/cohorts', cohortRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/lms', lmsRoutes);
router.use('/', aiRoutes);

export default router;
