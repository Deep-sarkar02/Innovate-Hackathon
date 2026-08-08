import app from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { seedDemoUser } from './modules/auth/auth.controller.js';
import { seedDatabase } from './seed/index.js';
import { seedDemoRepProfile } from './modules/rep-profile/rep-profile.service.js';
import { getDemoSalesExecutiveId } from './config/demoUser.js';
import { getTtsProvider } from './modules/tts/tts.service.js';
import { getSttProvider } from './modules/stt/stt.service.js';

let server;
let shuttingDown = false;

function closeServer() {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => {
      server = undefined;
      resolve();
    });
  });
}

function listenOnce() {
  return new Promise((resolve, reject) => {
    const nextServer = app.listen(env.port, () => resolve(nextServer));
    nextServer.on('error', (err) => {
      nextServer.close(() => reject(err));
    });
  });
}

async function listenWithRetry(maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (shuttingDown) return;
    try {
      await closeServer();
      server = await listenOnce();
      return;
    } catch (err) {
      if (shuttingDown) return;
      if (err.code !== 'EADDRINUSE' || attempt === maxAttempts) {
        throw err;
      }
      console.warn(`[server] Port ${env.port} busy — retry ${attempt}/${maxAttempts - 1}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

async function start() {
  await connectDb();
  await seedDatabase();
  const demoUser = await seedDemoUser();
  if (demoUser) {
    await seedDemoRepProfile(demoUser._id);
  } else {
    const id = await getDemoSalesExecutiveId();
    if (id) await seedDemoRepProfile(id);
  }

  await listenWithRetry();

  console.log(`[server] Adaptive Sales Training Platform API on http://localhost:${env.port}`);
  reportVoiceProviders();
  if (env.nodeEnv !== 'production') {
    console.log('[server] Demo login: sales@infinitylearn.com (password: DEMO_USER_PASSWORD, default demo1234)');
  }
}

/**
 * Every customer in this product is an Indian parent or student. Polly has no
 * Indian male voice in any region, so on Polly the father personas fall back to
 * a US voice. That used to be invisible at boot — print it, because a silently
 * wrong voice reads as a bug in the persona rather than a missing API key.
 */
function reportVoiceProviders() {
  const tts = getTtsProvider();
  const stt = getSttProvider();
  console.log(`[voice] TTS: ${tts}  |  STT: ${stt}`);

  if (tts === 'sarvam') {
    console.log('[voice] All personas voiced with Indian voices (aditya/rahul, priya/kavya).');
    return;
  }
  if (tts === 'polly') {
    console.warn(
      '[voice] Polly has NO Indian male voice — father and male-student personas will speak\n'
      + '[voice] with a US voice (Matthew). Mothers are correct (Kajal, en-IN/hi-IN).\n'
      + '[voice] Set SARVAM_API_KEY in .env to voice every persona as Indian.',
    );
    return;
  }
  console.warn('[voice] No server TTS configured — falling back to browser voices, which on macOS have no male hi-IN voice.');
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[server] ${signal} received — shutting down`);
  await closeServer();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
