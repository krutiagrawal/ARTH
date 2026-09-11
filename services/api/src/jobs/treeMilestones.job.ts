import { PrismaClient } from '@plant/db';
import { notify } from '../services/notification.service';

// Tree.growthStage is set once at creation and never advanced anywhere in this backend, so
// "reached a milestone" (section 11) can't hook into a growth-advance code path — it's defined
// instead as elapsed-time-since-planted thresholds for nursery-sourced trees.
const MILESTONE_DAYS = [30, 90, 180, 365];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Nursery-sourced trees crossing a 30/90/180/365-day-since-planted milestone. Deduped
 * exactly-once per (tree, threshold) — not a time window — via Notification.data, so a slow
 * scheduler restart or a missed tick can never cause a duplicate send for the same milestone. */
export async function runTreeMilestonesJob(prisma: PrismaClient): Promise<void> {
  try {
    const trees = await prisma.tree.findMany({
      where: { nurseryId: { not: null }, isDeleted: false, aiVerificationStatus: 'verified' },
      select: { id: true, plantedAt: true, locationLabel: true, nurseryId: true, species: { select: { commonName: true } } },
    });
    if (trees.length === 0) return;

    const nurseries = await prisma.nurseryProfile.findMany({
      where: { id: { in: trees.map((t) => t.nurseryId!) } },
      select: { id: true, userId: true, nurseryName: true },
    });
    const nurseryById = new Map(nurseries.map((n) => [n.id, n]));

    const now = Date.now();
    for (const tree of trees) {
      const daysSincePlanted = Math.floor((now - tree.plantedAt.getTime()) / MS_PER_DAY);
      const threshold = MILESTONE_DAYS.find((d) => d === daysSincePlanted);
      if (!threshold) continue;

      const nursery = nurseryById.get(tree.nurseryId!);
      if (!nursery) continue;

      const alreadyNotified = await prisma.notification.findFirst({
        where: {
          type: 'nursery_tree_milestone',
          AND: [{ data: { path: ['treeId'], equals: tree.id } }, { data: { path: ['thresholdDays'], equals: threshold } }],
        },
        select: { id: true },
      });
      if (alreadyNotified) continue;

      await notify(prisma, {
        userId: nursery.userId,
        type: 'nursery_tree_milestone',
        data: { treeId: tree.id, thresholdDays: threshold, species: tree.species.commonName, locationLabel: tree.locationLabel },
        push: {
          title: `${threshold}-day milestone 🌳`,
          body: `A ${tree.species.commonName} you supplied has been thriving for ${threshold} days${tree.locationLabel ? ` in ${tree.locationLabel}` : ''}.`,
        },
      });
    }
  } catch (error) {
    console.warn('[jobs] tree-milestones failed:', error);
  }
}
