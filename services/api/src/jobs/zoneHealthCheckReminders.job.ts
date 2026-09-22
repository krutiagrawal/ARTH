import { PrismaClient } from '@plant/db';
import { notify } from '../services/notification.service';

// Mirrors treeMilestones.job.ts: 30/90/180/365-day-since-planting thresholds, but anchored to a
// PlantationZone's earliest tree rather than a single nursery-sourced Tree, since a zone's "due
// for a check" reminder is a zone-wide event, not a per-tree one.
const MILESTONE_DAYS = [30, 90, 180, 365];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Zones crossing a 30/90/180/365-day-since-earliest-planting milestone. Deduped exactly-once
 * per (zone, threshold) — not a time window — via Notification.data, so a slow scheduler restart
 * or a missed tick can never cause a duplicate send for the same milestone. */
export async function runZoneHealthCheckRemindersJob(prisma: PrismaClient): Promise<void> {
  try {
    const zones = await prisma.plantationZone.findMany({
      select: {
        id: true,
        name: true,
        drive: { select: { title: true } },
        ngo: { select: { userId: true } },
        trees: { select: { plantedAt: true }, orderBy: { plantedAt: 'asc' }, take: 1 },
      },
    });

    const now = Date.now();
    for (const zone of zones) {
      const earliestPlantedAt = zone.trees[0]?.plantedAt;
      if (!earliestPlantedAt) continue;

      const daysSincePlanted = Math.floor((now - earliestPlantedAt.getTime()) / MS_PER_DAY);
      const threshold = MILESTONE_DAYS.find((d) => d === daysSincePlanted);
      if (!threshold) continue;

      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          type: 'ngo_health_check_due',
          AND: [{ data: { path: ['zoneId'], equals: zone.id } }, { data: { path: ['thresholdDays'], equals: threshold } }],
        },
        select: { id: true },
      });
      if (alreadyNotified) continue;

      await notify(prisma, {
        userId: zone.ngo.userId,
        type: 'ngo_health_check_due',
        data: { zoneId: zone.id, thresholdDays: threshold, zoneName: zone.name, driveTitle: zone.drive.title },
        push: {
          title: `${zone.name} is due for a health check`,
          body: `It's been ${threshold} days since planting in ${zone.name} (${zone.drive.title}) — time to check on those trees.`,
        },
      });
    }
  } catch (error) {
    console.warn('[jobs] zone-health-check-reminders failed:', error);
  }
}
