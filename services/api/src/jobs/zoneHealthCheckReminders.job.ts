import { PrismaClient } from '@arth/db';
import { notify } from '../services/notification.service';

// 30/90/180/365-day follow-up checkpoints, counted from each tree's own planting date (the same
// checkpoints the tree detail page shows).
const MILESTONE_DAYS = [30, 90, 180, 365];
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_TREE_IDS_IN_PAYLOAD = 20;

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Tells each NGO which trees hit a follow-up checkpoint today and still have no health check on or
 * after it. Trees due on the same day in the same place are grouped into one notification – a
 * zone, a plantation's unzoned trees, or independent plantings – so a bulk planting gives one nudge,
 * not hundreds. A single due tree links straight to that tree. Deduped exactly once per
 * (place, checkpoint, day) via Notification.data, so a restart or an extra tick can't repeat it.
 */
export async function runZoneHealthCheckRemindersJob(prisma: PrismaClient): Promise<void> {
  try {
    const now = Date.now();
    const today = startOfDay(now);
    // Anything planted 30–365 days ago can be due today; narrow in memory.
    const candidates = await prisma.plantedTree.findMany({
      where: { plantedAt: { gte: new Date(now - 366 * MS_PER_DAY), lte: new Date(now - 29 * MS_PER_DAY) } },
      select: {
        id: true,
        plantedAt: true,
        zoneId: true,
        driveId: true,
        zone: { select: { name: true } },
        drive: { select: { title: true } },
        ngo: { select: { userId: true } },
        healthChecks: { orderBy: { checkedAt: 'desc' }, take: 1, select: { checkedAt: true } },
      },
    });

    type Group = {
      userId: string;
      zoneId: string | null;
      driveId: string | null;
      placeName: string;
      thresholdDays: number;
      dueDate: string;
      treeIds: string[];
    };
    const groups = new Map<string, Group>();

    for (const tree of candidates) {
      const daysSincePlanted = Math.floor((now - tree.plantedAt.getTime()) / MS_PER_DAY);
      const thresholdDays = MILESTONE_DAYS.find((d) => d === daysSincePlanted);
      if (!thresholdDays) continue;

      // Already checked on or after the due day (the whole day counts) – nothing to remind about.
      const dueDayStart = startOfDay(tree.plantedAt.getTime() + thresholdDays * MS_PER_DAY);
      const lastCheck = tree.healthChecks[0]?.checkedAt;
      if (lastCheck && lastCheck.getTime() >= dueDayStart) continue;

      const place = tree.zoneId ?? (tree.driveId ? `drive:${tree.driveId}` : 'independent');
      const dueDate = new Date(today).toISOString().slice(0, 10);
      const key = `${tree.ngo.userId}|${place}|${thresholdDays}|${dueDate}`;
      const placeName = tree.zone?.name ?? (tree.drive ? `${tree.drive.title} (unzoned)` : 'Independent plantings');
      const group = groups.get(key) ?? {
        userId: tree.ngo.userId,
        zoneId: tree.zoneId,
        driveId: tree.driveId,
        placeName,
        thresholdDays,
        dueDate,
        treeIds: [],
      };
      group.treeIds.push(tree.id);
      groups.set(key, group);
    }

    for (const [dedupeKey, g] of groups) {
      const alreadyNotified = await prisma.notification.findFirst({
        where: { type: 'ngo_health_check_due', data: { path: ['dedupeKey'], equals: dedupeKey } },
        select: { id: true },
      });
      if (alreadyNotified) continue;

      const count = g.treeIds.length;
      await notify(prisma, {
        userId: g.userId,
        type: 'ngo_health_check_due',
        data: {
          dedupeKey,
          thresholdDays: g.thresholdDays,
          count,
          placeName: g.placeName,
          zoneId: g.zoneId,
          driveId: g.driveId,
          // A lone tree opens its own page; a group opens the zone / plantation list.
          treeId: count === 1 ? g.treeIds[0] : null,
          plantedTreeIds: g.treeIds.slice(0, MAX_TREE_IDS_IN_PAYLOAD),
        },
        push: {
          title: count === 1 ? `A tree is due for its ${g.thresholdDays}-day health check` : `${count} trees are due for their ${g.thresholdDays}-day health check`,
          body: `${g.placeName} – tap to check on ${count === 1 ? 'it' : 'them'}.`,
        },
      });
    }
  } catch (error) {
    console.warn('[jobs] tree-health-check-reminders failed:', error);
  }
}
