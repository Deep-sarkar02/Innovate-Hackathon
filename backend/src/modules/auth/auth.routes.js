import { Router } from 'express';
import Joi from 'joi';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post(
  '/register',
  validate(
    Joi.object({
      name: Joi.string().min(2).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
      role: Joi.string().valid('sales_executive', 'admin').optional(),
    })
  ),
  async (req, res, next) => {
    try {
      res.status(201).json(await authController.register(req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/login',
  validate(
    Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    })
  ),
  async (req, res, next) => {
    try {
      res.json(await authController.login(req.body));
    } catch (err) {
      next(err);
    }
  }
);

router.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json(await authController.getMe(req.user.userId));
  } catch (err) {
    next(err);
  }
});

export default router;
