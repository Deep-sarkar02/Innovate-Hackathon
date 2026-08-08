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
  // Demo accounts are auto-created at boot; password comes from env so the
  // hardcoded default cannot leak into a deployed instance.
  demoUserPassword: process.env.DEMO_USER_PASSWORD || 'demo1234',
  seedDemoUsers: process.env.SEED_DEMO_USERS !== 'false',
  deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
  sarvamApiKey: process.env.SARVAM_API_KEY || '',
  kimiApiKey: process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY || '',
  kimiModel: process.env.KIMI_MODEL || 'kimi-k3',
  bedrockApiKey:
    process.env.BEDROCK_API_KEY || process.env.AWS_BEARER_TOKEN_BEDROCK || '',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  awsSessionToken: process.env.AWS_SESSION_TOKEN || '',
  awsProfile: process.env.AWS_PROFILE || '',
  awsRegion: process.env.AWS_REGION || 'us-west-2',
  bedrockModel: process.env.BEDROCK_MODEL || 'mistral.mistral-large-3-675b-instruct',
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

export function isBedrockConfigured() {
  return env.bedrockApiKey.startsWith('bedrock-api-key-');
}

export function isPollyConfigured() {
  return Boolean(env.awsAccessKeyId && env.awsSecretAccessKey);
}

export function isTranscribeConfigured() {
  return Boolean(env.awsAccessKeyId && env.awsSecretAccessKey);
}

export function isSarvamConfigured() {
  const key = (env.sarvamApiKey ?? '').trim();
  // Only reject the empty string and the .env.example placeholder. This used to
  // also require an 'sk_' prefix, which silently rejects Sarvam's UUID-style
  // subscription keys — the server would fall back to Polly with no error and
  // every father persona would speak in an American voice for no visible reason.
  // A wrong key should fail loudly at the API call, not be guessed at here.
  return Boolean(key) && !key.includes('your-sarvam');
}

export function isKimiConfigured() {
  const key = env.kimiApiKey;
  return Boolean(key && key.startsWith('sk-') && !key.includes('your-kimi') && !key.includes('your-openai'));
}
