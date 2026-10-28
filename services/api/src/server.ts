import { buildApp } from './app';
import { env } from './config/env';
import { startScheduler } from './jobs/scheduler';
import { initSentry } from './lib/sentry';

async function main() {
  initSentry();
  const app = await buildApp();
  startScheduler(app);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
