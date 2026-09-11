import { Prisma, NurseryAchievementCriteriaType } from '@plant/db';

// Fulfilment-rate/cancellation-streak criteria only start counting once a nursery has a
// meaningful sample of orders — otherwise a brand-new nursery could read "100% fulfilment" off
// a single order.
const MIN_ORDERS_FOR_RATE_CRITERIA = 10;
const MONSOON_MONTHS = [6, 7, 8, 9]; // Jun-Sep

async function computeNurseryProgress(
  tx: Prisma.TransactionClient,
  nurseryId: string,
  type: NurseryAchievementCriteriaType
): Promise<number> {
  switch (type) {
    case 'species_listed': {
      return tx.saplingStock.count({ where: { nurseryId } });
    }
    case 'saplings_given_out': {
      const result = await tx.saplingStockLedger.aggregate({
        where: { nurseryId, reason: 'reservation_fulfilled' },
        _sum: { delta: true },
      });
      return Math.abs(result._sum.delta ?? 0);
    }
    case 'reservations_fulfilled': {
      return tx.saplingReservation.count({ where: { nurseryId, status: 'fulfilled' } });
    }
    case 'streak_days': {
      const nursery = await tx.nurseryProfile.findUniqueOrThrow({ where: { id: nurseryId } });
      return nursery.streakCurrent;
    }
    case 'native_species_listed': {
      return tx.saplingStock.count({ where: { nurseryId, speciesRef: { isNative: true } } });
    }
    case 'saplings_supplied_via_arth': {
      return tx.arthSaplingUnit.count({ where: { nurseryId, status: { in: ['collected', 'planted'] } } });
    }
    case 'ngo_requirements_fulfilled': {
      return tx.bulkRequirementResponse.count({ where: { nurseryId, status: 'fulfilled' } });
    }
    case 'ngo_repeat_partners': {
      const fulfilled = await tx.bulkRequirementResponse.findMany({
        where: { nurseryId, status: 'fulfilled' },
        select: { requirement: { select: { ngoId: true } } },
      });
      return new Set(fulfilled.map((r) => r.requirement.ngoId)).size;
    }
    case 'fulfilment_rate_pct': {
      const total = await tx.order.count({ where: { nurseryId, status: { not: 'pending_payment' } } });
      if (total < MIN_ORDERS_FOR_RATE_CRITERIA) return 0;
      const fulfilled = await tx.order.count({ where: { nurseryId, status: { in: ['picked_up', 'delivered', 'plantation_verified'] } } });
      return Math.round((fulfilled / total) * 100);
    }
    case 'cancellation_free_order_streak': {
      const total = await tx.order.count({ where: { nurseryId, status: { not: 'pending_payment' } } });
      if (total < MIN_ORDERS_FOR_RATE_CRITERIA) return 0;
      const lastCancelled = await tx.order.findFirst({
        where: { nurseryId, status: 'cancelled' },
        orderBy: { cancelledAt: 'desc' },
        select: { cancelledAt: true },
      });
      return tx.order.count({
        where: {
          nurseryId,
          status: { notIn: ['pending_payment', 'cancelled'] },
          ...(lastCancelled?.cancelledAt ? { createdAt: { gt: lastCancelled.cancelledAt } } : {}),
        },
      });
    }
    case 'monsoon_saplings_supplied': {
      const units = await tx.arthSaplingUnit.findMany({
        where: { nurseryId, status: { in: ['collected', 'planted'] } },
        select: { supplyDate: true },
      });
      return units.filter((u) => MONSOON_MONTHS.includes(u.supplyDate.getUTCMonth() + 1)).length;
    }
    default:
      return 0;
  }
}

// Mirrors groupAchievement.service.ts's evaluateGroupAchievements, scoped to NurseryProfile.
export async function evaluateNurseryAchievements(tx: Prisma.TransactionClient, nurseryId: string) {
  const achievements = await tx.nurseryAchievement.findMany();

  for (const achievement of achievements) {
    const existing = await tx.nurseryAchievementUnlock.findUnique({
      where: { nurseryId_achievementId: { nurseryId, achievementId: achievement.id } },
    });
    if (existing?.unlocked) continue;

    const progress = await computeNurseryProgress(tx, nurseryId, achievement.criteriaType);
    const target = achievement.criteriaTarget ?? 0;
    const unlocked = target > 0 && progress >= target;

    await tx.nurseryAchievementUnlock.upsert({
      where: { nurseryId_achievementId: { nurseryId, achievementId: achievement.id } },
      update: { progress, unlocked, unlockedAt: unlocked ? new Date() : existing?.unlockedAt ?? null },
      create: { nurseryId, achievementId: achievement.id, progress, unlocked, unlockedAt: unlocked ? new Date() : null },
    });

    if (unlocked && !existing?.unlocked) {
      await tx.nurseryProfile.update({ where: { id: nurseryId }, data: { badgesCount: { increment: 1 } } });
    }
  }
}
