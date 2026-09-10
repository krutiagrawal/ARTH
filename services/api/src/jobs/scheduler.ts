import { FastifyInstance } from 'fastify';
import { runStreakAtRiskJob, runStreakBrokenJob } from './streaks.job';
import { runReengagementJob } from './reengagement.job';
import { runCartAbandonedJob } from './cartAbandoned.job';

const TICK_INTERVAL_MS = 15 * 60 * 1000;
const INITIAL_DELAY_MS = 10 * 1000;

/**
 * The only scheduler this backend has — there's no cron lib, worker process, or external
 * trigger (Vercel cron, GitHub Actions, etc) anywhere in the deploy setup, so an in-process
 * interval loop is what runs every non-transactional ("has time passed?") notification.
 *
 * Each job is independently try/caught (jobs themselves also guard internally — see their own
 * files) so one failing job never takes down the others or the tick loop itself, same
 * never-throw philosophy as notification.service.ts's notify().
 */
export function startScheduler(app: FastifyInstance): void {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runStreakAtRiskJob(app.prisma);
      await runStreakBrokenJob(app.prisma);
      await runReengagementJob(app.prisma);
      await runCartAbandonedJob(app.prisma);
    } catch (error) {
      app.log.warn({ error }, '[scheduler] tick failed');
    } finally {
      running = false;
    }
  };

  const initialTimer = setTimeout(() => void tick(), INITIAL_DELAY_MS);
  const interval = setInterval(() => void tick(), TICK_INTERVAL_MS);

  app.addHook('onClose', async () => {
    clearTimeout(initialTimer);
    clearInterval(interval);
  });
}
