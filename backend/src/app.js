import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { rateLimit } from './middleware/rateLimit.middleware.js';
import { getAiStatus, isOpenAiConfigured } from './modules/agents/openai.client.js';
import { getKimiStatus, isKimiConfigured } from './modules/agents/kimi.client.js';
import { isBedrockConfigured, isLlmConfigured } from './modules/agents/llm.client.js';
import { isPollyConfigured, isTranscribeConfigured, isSarvamConfigured } from './config/env.js';
import { isLiveKitConfigured } from './config/env.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      const allowed = new Set([
        env.corsOrigin,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
      ]);
      if (
        !origin
        || allowed.has(origin)
        || (env.nodeEnv === 'development' && /^http:\/\/localhost:\d+$/.test(origin))
      ) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked origin: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '3mb' }));

// Health now reports AI degradation LOUDLY. A dead OpenAI key used to fail
// silently into mock scoring — the demo looked fine while producing fakes.
app.get('/health', (_req, res) => {
  const ai = getAiStatus();
  const kimi = getKimiStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai: {
      kimiConfigured: isKimiConfigured(),
      kimiModel: kimi.model,
      bedrockConfigured: isBedrockConfigured(),
      openaiConfigured: isOpenAiConfigured(),
      pollyTts: isPollyConfigured(),
      sarvamTts: isSarvamConfigured(),
      transcribeStt: isTranscribeConfigured(),
      sarvamStt: isSarvamConfigured(),
      livekitConfigured: isLiveKitConfigured(),
      mode: isLlmConfigured() ? 'llm' : 'mock',
      lastKimiError: kimi.lastError,
      lastOpenAiError: ai.lastError,
      lastErrorAt: kimi.lastErrorAt || ai.lastErrorAt,
    },
  });
});

app.use('/api/v1', rateLimit({ windowMs: 60_000, max: 240 }), routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
