import app from './app.js';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import { seedDemoUser } from './modules/auth/auth.controller.js';
import { seedDatabase } from './seed/index.js';
import { seedDemoRepProfile } from './modules/rep-profile/rep-profile.service.js';
import { getDemoSalesExecutiveId } from './config/demoUser.js';

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

  app.listen(env.port, () => {
    console.log(`[server] Adaptive Sales Training Platform API on http://localhost:${env.port}`);
    console.log(`[server] Demo login: sales@infinitylearn.com / demo1234`);
  });
}

start().catch((err) => {
  console.error('[server] Failed to start:', err);
  process.exit(1);
});
