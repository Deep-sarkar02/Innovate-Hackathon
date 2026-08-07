import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  mongodbUri: required('MONGODB_URI', 'mongodb://localhost:27017/ai-sales-copilot'),
  jwtSecret: required('JWT_SECRET', 'dev-secret-change-in-production-min-32-chars'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  livekit: {
    url: process.env.LIVEKIT_URL || '',
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
  },
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
};

export function isLiveKitConfigured() {
  return Boolean(env.livekit.url && env.livekit.apiKey && env.livekit.apiSecret);
}

export function isOpenAiConfigured() {
  const key = env.openaiApiKey;
  return Boolean(key && key.startsWith('sk-') && !key.includes('your-openai'));
}

export function isDeepgramConfigured() {
  const key = env.deepgramApiKey;
  return Boolean(key && !key.includes('your-deepgram'));
}
