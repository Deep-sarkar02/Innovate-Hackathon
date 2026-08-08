import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware.js';
import {
  listCourses, getSyllabus, getItem, advancePage, submitCheckpoint, submitQuiz,
} from './course.service.js';

const router = Router();

router.get('/', authenticate, async (req, res, next) => {
  try {
    res.json(await listCourses(req.user.id));
  } catch (e) { next(e); }
});

router.get('/:courseId', authenticate, async (req, res, next) => {
  try {
    res.json(await getSyllabus(req.user.id, req.params.courseId));
  } catch (e) { next(e); }
});

router.get('/:courseId/items/:itemId', authenticate, async (req, res, next) => {
  try {
    res.json(await getItem(req.user.id, req.params.courseId, req.params.itemId));
  } catch (e) { next(e); }
});

router.post('/:courseId/items/:itemId/page', authenticate, async (req, res, next) => {
  try {
    res.json(await advancePage(req.user.id, req.params.courseId, req.params.itemId, Number(req.body.page)));
  } catch (e) { next(e); }
});

router.post('/:courseId/items/:itemId/checkpoint', authenticate, async (req, res, next) => {
  try {
    res.json(await submitCheckpoint(req.user.id, req.params.courseId, req.params.itemId, req.body.afterPage, req.body.answers));
  } catch (e) { next(e); }
});

router.post('/:courseId/items/:itemId/quiz', authenticate, async (req, res, next) => {
  try {
    res.json(await submitQuiz(req.user.id, req.params.courseId, req.params.itemId, req.body.answers));
  } catch (e) { next(e); }
});

export default router;
