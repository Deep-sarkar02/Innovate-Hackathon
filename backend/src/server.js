import app from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { seedDemoUser } from './modules/auth/auth.controller.js';
import { seedDatabase } from './seed/index.js';
import { seedDemoRepProfile } from './modules/rep-profile/rep-profile.service.js';
import { getDemoSalesExecutiveId } from './config/demoUser.js';

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
  if (env.nodeEnv !== 'production') {
    console.log('[server] Demo login: sales@infinitylearn.com (password: DEMO_USER_PASSWORD, default demo1234)');
  }
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
