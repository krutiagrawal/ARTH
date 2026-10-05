import { PrismaClient } from '@arth/db';
import { notify } from '../services/notification.service';

// Mirrors zoneHealthCheckReminders.job.ts's shape, but for an individual Tree's owner rather
// than an NGO zone: nudge at 90/180/365 days since the tree's most recent activity (its latest
// TreeObservation, or plantedAt if it's never had one).
const MILESTONE_DAYS = [90, 180, 365];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Trees crossing a 90/180/365-day-since-last-activity milestone with no check-in since. Deduped
 * exactly-once per (tree, threshold, baseline timestamp) — the baseline is included so a fresh
 * check-in (which moves the baseline forward) lets the same threshold value fire again for the
 * next period, rather than being permanently suppressed after the first time. */
export async function runOwnerHealthCheckRemindersJob(prisma: PrismaClient): Promise<void> {
  try {
    const trees = await prisma.tree.findMany({
      where: { isDeleted: false, healthStatus: { notIn: ['dead', 'removed'] } },
      select: {
        id: true,
        userId: true,
        nickname: true,
        plantedAt: true,
        observations: { orderBy: { createdAt: 'desc' }, take: 1, select: { createdAt: true } },
      },
    });

    const now = Date.now();
    for (const tree of trees) {
      const baselineAt = tree.observations[0]?.createdAt ?? tree.plantedAt;
      const daysSinceActivity = Math.floor((now - baselineAt.getTime()) / MS_PER_DAY);
      const threshold = MILESTONE_DAYS.find((d) => d === daysSinceActivity);
      if (!threshold) continue;

      const baselineKey = baselineAt.toISOString();
      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          type: 'tree_health_check_reminder',
          AND: [
            { data: { path: ['treeId'], equals: tree.id } },
            { data: { path: ['thresholdDays'], equals: threshold } },
            { data: { path: ['baselineAt'], equals: baselineKey } },
          ],
        },
        select: { id: true },
      });
      if (alreadyNotified) continue;

      await notify(prisma, {
        userId: tree.userId,
        type: 'tree_health_check_reminder',
        data: { treeId: tree.id, thresholdDays: threshold, baselineAt: baselineKey, nickname: tree.nickname },
        push: {
          title: `How's your ${tree.nickname} doing?`,
          body: `It's been ${threshold} days since you last checked on it — take a quick look and log how it's doing.`,
        },
      });
    }
  } catch (error) {
    console.warn('[jobs] owner-health-check-reminders failed:', error);
  }
}
