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
    const durationSec = pcmBuffer.length / (req.body.sampleRate * 2);

    if (durationSec > 30) {
      return res.status(413).json({
        error: 'Utterance too long for server STT (max 28s). Pause briefly between sentences.',
        provider: getSttProvider(),
        code: 'audio_too_long',
      });
    }

    const text = await transcribePcm(pcmBuffer, {
      language: req.body.language,
      sampleRate: req.body.sampleRate,
    });

    if (!text) {
      return res.status(503).json({
        error: 'No speech detected or STT temporarily unavailable. Try speaking again or type your message.',
        provider: getSttProvider(),
        code: 'stt_unavailable',
      });
    }

    res.json({ text, provider: getSttProvider() });
  } catch (err) {
    next(err);
  }
});

export default router;
