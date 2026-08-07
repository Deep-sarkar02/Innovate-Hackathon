import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { rateLimit } from './middleware/rateLimit.middleware.js';
import { getAiStatus, isOpenAiConfigured } from './modules/agents/openai.client.js';
import { isLiveKitConfigured } from './config/env.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Health now reports AI degradation LOUDLY. A dead OpenAI key used to fail
// silently into mock scoring — the demo looked fine while producing fakes.
app.get('/health', (_req, res) => {
  const ai = getAiStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    ai: {
      openaiConfigured: isOpenAiConfigured(),
      livekitConfigured: isLiveKitConfigured(),
      mode: isOpenAiConfigured() && !ai.lastError ? 'llm' : 'mock',
      lastError: ai.lastError,
      lastErrorAt: ai.lastErrorAt,
    },
  });
});

app.use('/api/v1', rateLimit({ windowMs: 60_000, max: 240 }), routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
