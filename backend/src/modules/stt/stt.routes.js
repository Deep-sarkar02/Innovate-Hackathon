import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../../middleware/validate.middleware.js';
import { getSttProvider, transcribePcm } from './stt.service.js';

const router = Router();

const transcribeSchema = Joi.object({
  audio: Joi.string().base64().required(),
  language: Joi.string().valid('en', 'hi').default('en'),
  sampleRate: Joi.number().integer().valid(16000).default(16000),
});

router.get('/status', (_req, res) => {
  res.json({ provider: getSttProvider() });
});

router.post('/transcribe', validate(transcribeSchema), async (req, res, next) => {
  try {
    const pcmBuffer = Buffer.from(req.body.audio, 'base64');
    const text = await transcribePcm(pcmBuffer, {
      language: req.body.language,
      sampleRate: req.body.sampleRate,
    });

    if (!text) {
      return res.status(503).json({
        error: 'STT unavailable or no speech detected. Configure AWS IAM credentials for Amazon Transcribe, or use browser speech.',
        provider: getSttProvider(),
      });
    }

    res.json({ text, provider: 'transcribe' });
  } catch (err) {
    next(err);
  }
});

export default router;
