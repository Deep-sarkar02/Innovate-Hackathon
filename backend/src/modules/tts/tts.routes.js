import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../../middleware/validate.middleware.js';
import {
  getTtsProvider,
  getTtsVoiceCatalog,
  resolveTtsVoice,
  synthesizeSpeech,
} from './tts.service.js';

const router = Router();

const speakSchema = Joi.object({
  text: Joi.string().required().min(1).max(3000),
  language: Joi.string().valid('en', 'hi').default('en'),
  voiceGender: Joi.string().valid('female', 'male').default('female'),
  persona: Joi.string().valid('father', 'mother', 'student', 'both_parents').optional(),
});

router.get('/status', (req, res) => {
  const { language = 'en', voiceGender = 'female', persona } = req.query;
  const voice = resolveTtsVoice(String(language), String(voiceGender), persona ? String(persona) : null);
  res.json({
    provider: getTtsProvider(),
    accent: 'indian',
    voice,
    catalog: getTtsVoiceCatalog(),
  });
});

router.post('/speak', validate(speakSchema), async (req, res, next) => {
  try {
    const result = await synthesizeSpeech(req.body.text, {
      language: req.body.language,
      voiceGender: req.body.voiceGender,
      persona: req.body.persona,
    });

    if (!result?.audio) {
      return res.status(503).json({
        error: 'TTS unavailable. Configure SARVAM_API_KEY or AWS IAM credentials for Polly, or use browser speech.',
        provider: 'browser',
      });
    }

    res.set('Content-Type', result.contentType ?? 'audio/mpeg');
    res.send(result.audio);
  } catch (err) {
    next(err);
  }
});

export default router;
