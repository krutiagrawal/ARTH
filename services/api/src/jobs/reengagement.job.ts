import { PrismaClient } from '@plant/db';
import { notify } from '../services/notification.service';
import { hasRecentNotification } from './dedupe';

const DAY_MS = 24 * 60 * 60 * 1000;

interface Tier {
  days: number;
  title: string;
  body: string;
}

// Ordered longest-inactive first so a user who happens to match two windows (shouldn't normally
// happen given each is a ~1-day-wide crossing point, but a missed tick could widen it) gets the
// stronger, more current copy rather than an older one.
const TIERS: Tier[] = [
  { days: 30, title: 'We planted a reminder just for you 🌱', body: "Come back and see how your forest's doing." },
  { days: 14, title: "It's been a while...", body: 'Your streak trophy is collecting dust 🏆' },
  { days: 7, title: 'Your forest called 🌳', body: 'It says it misses you.' },
];

const individualWithNotifications = {
  role: 'user' as const,
  isDeleted: false,
  OR: [{ settings: null }, { settings: { notifications: true } }],
};

/**
 * Win-back nudges keyed off `User.lastActiveAt` (kept fresh on every authenticated request by
 * plugins/auth.ts, not just login — see that file's comment). Each tier only matches a ~1-day
 * crossing window so it fires once per user as time passes; the dedup check below is a safety
 * net against the 15-minute scheduler tick re-matching the same window many times over.
 */
export async function runReengagementJob(prisma: PrismaClient): Promise<void> {
  const now = new Date();

  for (const tier of TIERS) {
    try {
      const windowStart = new Date(now.getTime() - (tier.days + 1) * DAY_MS);
      const windowEnd = new Date(now.getTime() - tier.days * DAY_MS);

      const candidates = await prisma.user.findMany({
        where: {
          ...individualWithNotifications,
          lastActiveAt: { gte: windowStart, lt: windowEnd },
        },
        select: { id: true },
      });
      if (candidates.length === 0) continue;

      const since = new Date(now.getTime() - 2 * DAY_MS);
      for (const user of candidates) {
        if (await hasRecentNotification(prisma, user.id, 'reengagement_nudge', since)) continue;
        await notify(prisma, {
          userId: user.id,
          type: 'reengagement_nudge',
          data: { tier: tier.days },
          push: { title: tier.title, body: tier.body },
        });
      }
    } catch (error) {
      console.warn(`[jobs] reengagement (${tier.days}d) failed:`, error);
    }
  }
}
