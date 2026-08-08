import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../../middleware/validate.middleware.js';
import { getTtsProvider, synthesizeSpeech } from './tts.service.js';

const router = Router();

const speakSchema = Joi.object({
  text: Joi.string().required().min(1).max(3000),
  language: Joi.string().valid('en', 'hi').default('en'),
  voiceGender: Joi.string().valid('female', 'male').default('female'),
});

router.get('/status', (_req, res) => {
  res.json({ provider: getTtsProvider() });
});

router.post('/speak', validate(speakSchema), async (req, res, next) => {
  try {
    const audio = await synthesizeSpeech(req.body.text, {
      language: req.body.language,
      voiceGender: req.body.voiceGender,
    });

    if (!audio) {
      return res.status(503).json({
        error: 'TTS unavailable. Bedrock has no text-to-speech models — configure AWS IAM credentials for Amazon Polly, or use browser speech.',
        provider: 'browser',
      });
    }

    res.set('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (err) {
    next(err);
  }
});

export default router;
