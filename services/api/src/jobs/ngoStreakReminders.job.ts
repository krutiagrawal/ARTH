import { PrismaClient } from '@plant/db';
import { notify } from '../services/notification.service';
import { startOfUtcDay, addDays } from '../services/streak.service';
import { hasRecentNotification } from './dedupe';

// Weekly analog of streaks.job.ts, scoped to the NGO Updates Streak (NgoContributionStreak,
// streakType 'updates') instead of the daily User.streakCurrent — an NGO's cadence is
// per-Monday-week, not per-day, so "at risk"/"broken" are both defined in week terms.

function mondayOf(date: Date): Date {
  const d = startOfUtcDay(date);
  const day = d.getUTCDay(); // 0 = Sun .. 6 = Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  return addDays(d, diffToMonday);
}

// Friday/Saturday/Sunday UTC — "late enough in the week that not posting yet is worth a nudge,"
// same spirit as streaks.job.ts's evening-hour window but scaled to a week instead of a day.
const AT_RISK_DAYS = new Set([5, 6, 0]);

/** NGOs who met the Updates Streak last week but haven't posted anything this week yet. */
export async function runNgoStreakAtRiskJob(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  if (!AT_RISK_DAYS.has(now.getUTCDay())) return;

  try {
    const thisWeek = mondayOf(now);
    const lastWeek = addDays(thisWeek, -7);

    const ngos = await prisma.ngoProfile.findMany({
      where: { status: 'approved' },
      select: { id: true, userId: true, orgName: true },
    });
    if (ngos.length === 0) return;

    const rows = await prisma.ngoContributionStreak.findMany({
      where: { ngoId: { in: ngos.map((n) => n.id) }, streakType: 'updates', periodStart: { in: [thisWeek, lastWeek] } },
    });
    const metThisWeek = new Set(rows.filter((r) => r.metCriteria && r.periodStart.getTime() === thisWeek.getTime()).map((r) => r.ngoId));
    const metLastWeek = new Set(rows.filter((r) => r.metCriteria && r.periodStart.getTime() === lastWeek.getTime()).map((r) => r.ngoId));

    const since = addDays(now, -3);
    for (const ngo of ngos) {
      if (!metLastWeek.has(ngo.id) || metThisWeek.has(ngo.id)) continue;
      if (await hasRecentNotification(prisma, ngo.userId, 'ngo_streak_at_risk', since)) continue;

      await notify(prisma, {
        userId: ngo.userId,
        type: 'ngo_streak_at_risk',
        push: { title: '🔥 Your Updates Streak is at risk!', body: 'Post an update before the week ends to keep it alive.' },
      });
    }
  } catch (error) {
    console.warn('[jobs] ngo-streak-at-risk failed:', error);
  }
}

/** NGOs who let a full week pass with no update posted, i.e. the streak has actually broken.
 * Dedup compares against the last-met week (not a time window), same convention as
 * streaks.job.ts's runStreakBrokenJob. */
export async function runNgoStreakBrokenJob(prisma: PrismaClient): Promise<void> {
  try {
    const thisWeek = mondayOf(new Date());
    const lastWeek = addDays(thisWeek, -7);

    const ngos = await prisma.ngoProfile.findMany({ where: { status: 'approved' }, select: { id: true, userId: true } });

    for (const ngo of ngos) {
      const lastMet = await prisma.ngoContributionStreak.findFirst({
        where: { ngoId: ngo.id, streakType: 'updates', metCriteria: true },
        orderBy: { periodStart: 'desc' },
        select: { periodStart: true },
      });
      // No streak ever started, or it's still alive (met this week or last week) — nothing broke.
      if (!lastMet || lastMet.periodStart.getTime() >= lastWeek.getTime()) continue;

      if (await hasRecentNotification(prisma, ngo.userId, 'ngo_streak_broken', lastMet.periodStart)) continue;

      await notify(prisma, {
        userId: ngo.userId,
        type: 'ngo_streak_broken',
        push: { title: 'Your Updates Streak broke 💔', body: 'Post an update to start a new one.' },
      });
    }
  } catch (error) {
    console.warn('[jobs] ngo-streak-broken failed:', error);
  }
}
