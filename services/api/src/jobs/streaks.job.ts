import { PrismaClient } from '@plant/db';
import { notify } from '../services/notification.service';
import { startOfUtcDay, addDays } from '../services/streak.service';
import { hasRecentNotification } from './dedupe';

// No per-user timezone is stored anywhere in this schema, so the "evening nudge" feel is
// approximated with a fixed UTC window rather than a real per-user local evening.
// ~12:00-17:00 UTC is ~17:30-22:30 IST.
const EVENING_START_UTC_HOUR = 12;
const EVENING_END_UTC_HOUR = 17;

const individualWithReminders = {
  role: 'user' as const,
  isDeleted: false,
  streakCurrent: { gt: 0 },
  OR: [{ settings: null }, { settings: { streakReminders: true, notifications: true } }],
};

/**
 * Users whose streak is still alive (planted yesterday) but who haven't planted yet today —
 * genuinely "at risk" of losing it, not already-broken stale data.
 */
export async function runStreakAtRiskJob(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  const hour = now.getUTCHours();
  if (hour < EVENING_START_UTC_HOUR || hour > EVENING_END_UTC_HOUR) return;

  try {
    const today = startOfUtcDay(now);
    const yesterday = addDays(today, -1);

    const candidates = await prisma.user.findMany({
      where: individualWithReminders,
      select: { id: true, streakCurrent: true },
    });
    if (candidates.length === 0) return;
    const ids = candidates.map((c) => c.id);

    const history = await prisma.streakHistory.findMany({
      where: { userId: { in: ids }, activityDate: { in: [today, yesterday] }, planted: true },
      select: { userId: true, activityDate: true },
    });
    const plantedToday = new Set(
      history.filter((h) => h.activityDate.getTime() === today.getTime()).map((h) => h.userId)
    );
    const plantedYesterday = new Set(
      history.filter((h) => h.activityDate.getTime() === yesterday.getTime()).map((h) => h.userId)
    );
    const atRisk = candidates.filter((c) => plantedYesterday.has(c.id) && !plantedToday.has(c.id));

    const since = new Date(now.getTime() - 20 * 60 * 60 * 1000);
    for (const user of atRisk) {
      if (await hasRecentNotification(prisma, user.id, 'streak_at_risk', since)) continue;
      await notify(prisma, {
        userId: user.id,
        type: 'streak_at_risk',
        data: { streakCurrent: user.streakCurrent },
        push: {
          title: `🔥 ${user.streakCurrent}-day streak alert!`,
          body: 'Plant something today or watch it wilt.',
        },
      });
    }
  } catch (error) {
    console.warn('[jobs] streak-at-risk failed:', error);
  }
}

/**
 * Users who let a full day pass with no planted row, i.e. the streak has actually broken.
 * `User.streakCurrent` stays stale (only recomputed lazily by recordPlantedToday on their next
 * plant — see streak.service.ts), so this is detected independently from the StreakHistory
 * ledger. Dedup compares against the last-planted date (not a time window) so the same break
 * is only ever notified once, no matter how many ticks pass before they plant again.
 */
export async function runStreakBrokenJob(prisma: PrismaClient): Promise<void> {
  try {
    const today = startOfUtcDay(new Date());
    const yesterday = addDays(today, -1);

    const candidates = await prisma.user.findMany({
      where: individualWithReminders,
      select: { id: true, streakCurrent: true },
    });

    for (const user of candidates) {
      const lastPlanted = await prisma.streakHistory.findFirst({
        where: { userId: user.id, planted: true },
        orderBy: { activityDate: 'desc' },
        select: { activityDate: true },
      });
      // Planted today or yesterday — streak is still alive, nothing broke.
      if (lastPlanted && lastPlanted.activityDate.getTime() >= yesterday.getTime()) continue;

      const sinceLastPlanted = lastPlanted?.activityDate ?? new Date(0);
      if (await hasRecentNotification(prisma, user.id, 'streak_broken', sinceLastPlanted)) continue;

      await notify(prisma, {
        userId: user.id,
        type: 'streak_broken',
        data: { previousStreak: user.streakCurrent },
        push: {
          title: 'Your streak took an L 💔',
          body: `Your ${user.streakCurrent}-day streak broke — start a new one today. We believe in you.`,
        },
      });
    }
  } catch (error) {
    console.warn('[jobs] streak-broken failed:', error);
  }
}
