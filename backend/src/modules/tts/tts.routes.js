import { Router } from 'express';
import Joi from 'joi';
import { validate } from '../../middleware/validate.middleware.js';
import { getTtsProvider, synthesizeSpeech, resolveVoice } from './tts.service.js';

const router = Router();

const speakSchema = Joi.object({
  text: Joi.string().required().min(1).max(3000),
  language: Joi.string().valid('en', 'hi').default('en'),
  voiceGender: Joi.string().valid('female', 'male').default('female'),
});

router.get('/status', (_req, res) => {
  // Expose voice resolution so the UI can warn before a session starts, e.g.
  // "a Hindi-speaking father cannot be voiced by Polly".
  res.json({
    provider: getTtsProvider(),
    voices: {
      'hi/female': resolveVoice('hi', 'female'),
      'hi/male': resolveVoice('hi', 'male'),
      'en/female': resolveVoice('en', 'female'),
      'en/male': resolveVoice('en', 'male'),
    },
  });
});

router.post('/speak', validate(speakSchema), async (req, res, next) => {
  try {
    const result = await synthesizeSpeech(req.body.text, {
      language: req.body.language,
      voiceGender: req.body.voiceGender,
    });

    if (!result) {
      return res.status(503).json({
        error: 'TTS unavailable. Bedrock has no text-to-speech models — configure AWS IAM credentials for Amazon Polly, or use browser speech.',
        provider: 'browser',
      });
    }

    // Surface voice resolution in headers so a wrong-gender/accent fallback is
    // visible to the client instead of silently changing who the customer is.
    res.set('Content-Type', 'audio/mpeg');
    res.set('X-Voice-Id', result.voiceId);
    res.set('X-Voice-Language', result.languageCode);
    if (result.languageDowngrade) res.set('X-Voice-Language-Downgrade', 'true');
    if (result.warning) res.set('X-Voice-Warning', result.warning.slice(0, 200));
    res.send(result.audio);
  } catch (err) {
    next(err);
  }
});

export default router;
