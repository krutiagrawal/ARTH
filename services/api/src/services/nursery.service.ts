import { PrismaClient } from '@plant/db';
import { ForbiddenError, NotFoundError, BadRequestError } from '../utils/errors';
import { notify } from './notification.service';
import { recordNurseryActiveToday } from './nurseryStreak.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';
import { startOfUtcDay, addDays } from './streak.service';

interface UpdateProfileInput {
  nurseryName?: string;
  description?: string;
  logoUrl?: string;
  coverPhotoUrl?: string;
  city?: string;
  contactPhone?: string;
  lat?: number;
  lng?: number;
  offersDelivery?: boolean;
  deliveryRadiusKm?: number | null;
  followPolicy?: 'open' | 'approval';
}

interface StockInput {
  species: string;
  quantity: number;
  isFree?: boolean;
  priceCents?: number;
  photoUrl?: string;
}

export async function getOwnProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.nurseryProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('Nursery profile not found');
  return profile;
}

export async function updateOwnProfile(prisma: PrismaClient, userId: string, input: UpdateProfileInput) {
  const profile = await getOwnProfile(prisma, userId);
  return prisma.nurseryProfile.update({ where: { id: profile.id }, data: input });
}

// Mirrors ngo.service.ts's resubmitProfile — a rejected nursery edits its details, then
// explicitly resubmits for another review pass rather than a PATCH silently reopening it.
export async function resubmitProfile(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  if (profile.status !== 'rejected') throw new ForbiddenError('Only a rejected application can be resubmitted');

  return prisma.nurseryProfile.update({
    where: { id: profile.id },
    data: { status: 'pending', rejectionReason: null, approvedAt: null, approvedByUserId: null },
  });
}

export async function requireApprovedNurseryProfile(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  if (profile.status !== 'approved') throw new ForbiddenError('Your nursery account is not yet approved');
  return profile;
}

export async function getOwnStats(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  const stock = await prisma.saplingStock.findMany({ where: { nurseryId: profile.id } });

  return {
    speciesCount: stock.length,
    totalQuantity: stock.reduce((sum, s) => sum + s.quantity, 0),
    freeSpeciesCount: stock.filter((s) => s.isFree).length,
    streakCurrent: profile.streakCurrent,
    streakMax: profile.streakMax,
    badgesCount: profile.badgesCount,
  };
}

export async function listStock(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  return prisma.saplingStock.findMany({ where: { nurseryId: profile.id }, orderBy: { createdAt: 'desc' } });
}

export async function createStock(prisma: PrismaClient, userId: string, input: StockInput) {
  const profile = await getOwnProfile(prisma, userId);

  return prisma.$transaction(async (tx) => {
    const item = await tx.saplingStock.create({ data: { nurseryId: profile.id, ...input } });
    if (item.quantity > 0) {
      await tx.saplingStockLedger.create({
        data: {
          nurseryId: profile.id,
          stockId: item.id,
          species: item.species,
          delta: item.quantity,
          reason: 'manual_add',
        },
      });
    }
    await recordNurseryActiveToday(tx, profile.id);
    return item;
  });
}

export async function updateStock(prisma: PrismaClient, userId: string, stockId: string, input: Partial<StockInput>) {
  const profile = await getOwnProfile(prisma, userId);

  const { updated, wishlisterIds } = await prisma.$transaction(async (tx) => {
    const existing = await tx.saplingStock.findFirst({ where: { id: stockId, nurseryId: profile.id } });
    if (!existing) throw new NotFoundError('Stock item not found');

    const updated = await tx.saplingStock.update({ where: { id: stockId }, data: input });

    if (input.quantity !== undefined && input.quantity !== existing.quantity) {
      await tx.saplingStockLedger.create({
        data: {
          nurseryId: profile.id,
          stockId: updated.id,
          species: updated.species,
          delta: input.quantity - existing.quantity,
          reason: 'manual_adjust',
        },
      });
      await recordNurseryActiveToday(tx, profile.id);
    }

    // Back-in-stock: only fires on the 0 -> positive transition, never on every restock bump, so
    // wishlisting a perpetually-low-stock item doesn't spam the wishlister daily. Notifications are
    // sent after the transaction commits (see reservation.service.ts's pattern), not inside it.
    let wishlisterIds: string[] = [];
    if (existing.quantity <= 0 && updated.quantity > 0) {
      const wishlisters = await tx.wishlistItem.findMany({ where: { stockId }, select: { userId: true } });
      wishlisterIds = wishlisters.map((w) => w.userId);
    }

    return { updated, wishlisterIds };
  });

  for (const userId of wishlisterIds) {
    await notify(prisma, {
      userId,
      type: 'wishlist_back_in_stock',
      data: { stockId, species: updated.species, nurseryName: profile.nurseryName },
      push: { title: `${updated.species} is back in stock!`, body: `${profile.nurseryName} just restocked ${updated.species}.` },
    });
  }

  return updated;
}

/** Nursery responds once to a review left on one of their orders. */
export async function respondToReview(prisma: PrismaClient, userId: string, reviewId: string, response: string) {
  const profile = await getOwnProfile(prisma, userId);
  const review = await prisma.orderReview.findFirst({ where: { id: reviewId, nurseryId: profile.id } });
  if (!review) throw new NotFoundError('Review not found');
  if (review.nurseryResponse) throw new BadRequestError('You already responded to this review');

  return prisma.orderReview.update({
    where: { id: reviewId },
    data: { nurseryResponse: response, nurseryRespondedAt: new Date() },
  });
}

export async function listReviews(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  return prisma.orderReview.findMany({
    where: { nurseryId: profile.id },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { id: true, name: true, avatarEmoji: true } } },
  });
}

export async function deleteStock(prisma: PrismaClient, userId: string, stockId: string) {
  const profile = await getOwnProfile(prisma, userId);
  const result = await prisma.saplingStock.deleteMany({ where: { id: stockId, nurseryId: profile.id } });
  if (result.count === 0) throw new NotFoundError('Stock item not found');
}

// ---------- Streak calendar ----------

export async function getStreakCalendar(prisma: PrismaClient, userId: string, weeksCount: number) {
  const profile = await getOwnProfile(prisma, userId);
  const today = startOfUtcDay(new Date());
  const startDate = addDays(today, -(weeksCount * 7 - 1));

  const rows = await prisma.nurseryStreakHistory.findMany({
    where: { nurseryId: profile.id, activityDate: { gte: startDate } },
  });
  const plantedDates = new Set(rows.filter((r) => r.planted).map((r) => r.activityDate.toISOString().slice(0, 10)));

  const weeks = [];
  for (let w = 0; w < weeksCount; w++) {
    const days: boolean[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(startDate, w * 7 + d);
      days.push(plantedDates.has(date.toISOString().slice(0, 10)));
    }
    weeks.push({ week: `Week ${w + 1}`, days });
  }
  return weeks;
}

// ---------- Badges ----------

export async function getBadges(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  return getPublicBadges(prisma, profile.id);
}

export async function getPublicBadges(prisma: PrismaClient, nurseryId: string) {
  const achievements = await prisma.nurseryAchievement.findMany({ orderBy: { sortOrder: 'asc' } });
  const unlocks = await prisma.nurseryAchievementUnlock.findMany({ where: { nurseryId } });
  const unlockById = new Map(unlocks.map((u) => [u.achievementId, u]));

  return achievements.map((a) => {
    const unlock = unlockById.get(a.id);
    return {
      id: a.id,
      key: a.key,
      title: a.title,
      description: a.description,
      icon: a.icon,
      rarity: a.rarity,
      criteriaTarget: a.criteriaTarget,
      progress: unlock?.progress ?? 0,
      unlocked: unlock?.unlocked ?? false,
      unlockedAt: unlock?.unlockedAt ?? null,
    };
  });
}

// ---------- Reservations (nursery-side inbox) ----------

export async function listReservations(prisma: PrismaClient, userId: string, status?: string) {
  const profile = await getOwnProfile(prisma, userId);
  return prisma.saplingReservation.findMany({
    where: { nurseryId: profile.id, ...(status ? { status: status as any } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { stock: { select: { species: true } }, user: { select: { id: true, name: true, avatarEmoji: true } } },
  });
}

export async function fulfillReservation(prisma: PrismaClient, userId: string, reservationId: string) {
  const profile = await getOwnProfile(prisma, userId);

  const updated = await prisma.$transaction(async (tx) => {
    const reservation = await tx.saplingReservation.findFirst({
      where: { id: reservationId, nurseryId: profile.id },
      include: { stock: true },
    });
    if (!reservation) throw new NotFoundError('Reservation not found');
    if (reservation.status !== 'pending') throw new BadRequestError('This reservation has already been responded to');

    const newQuantity = Math.max(0, reservation.stock.quantity - reservation.quantity);
    await tx.saplingStock.update({ where: { id: reservation.stockId }, data: { quantity: newQuantity } });

    await tx.saplingStockLedger.create({
      data: {
        nurseryId: profile.id,
        stockId: reservation.stockId,
        species: reservation.stock.species,
        delta: -reservation.quantity,
        reason: 'reservation_fulfilled',
      },
    });

    const result = await tx.saplingReservation.update({
      where: { id: reservationId },
      data: { status: 'fulfilled', respondedAt: new Date() },
    });

    await recordNurseryActiveToday(tx, profile.id);
    await evaluateNurseryAchievements(tx, profile.id);

    return { ...result, species: reservation.stock.species, quantity: reservation.quantity };
  });

  await notify(prisma, {
    userId: updated.userId,
    type: 'reservation_fulfilled',
    actorUserId: userId,
    data: { species: updated.species, quantity: updated.quantity, nurseryName: profile.nurseryName },
    push: { title: profile.nurseryName, body: `Your request for ${updated.species} saplings was fulfilled!` },
  });

  return updated;
}

export async function declineReservation(prisma: PrismaClient, userId: string, reservationId: string) {
  const profile = await getOwnProfile(prisma, userId);

  const reservation = await prisma.saplingReservation.findFirst({
    where: { id: reservationId, nurseryId: profile.id },
    include: { stock: true },
  });
  if (!reservation) throw new NotFoundError('Reservation not found');
  if (reservation.status !== 'pending') throw new BadRequestError('This reservation has already been responded to');

  const updated = await prisma.saplingReservation.update({
    where: { id: reservationId },
    data: { status: 'declined', respondedAt: new Date() },
  });

  await notify(prisma, {
    userId: reservation.userId,
    type: 'reservation_declined',
    actorUserId: userId,
    data: { species: reservation.stock.species, quantity: reservation.quantity, nurseryName: profile.nurseryName },
    push: { title: profile.nurseryName, body: `Your request for ${reservation.stock.species} saplings was declined.` },
  });

  return updated;
}

// ---------- Stock ledger / analytics ----------

export async function getStockLedger(prisma: PrismaClient, userId: string, page = 1, take = 30) {
  const profile = await getOwnProfile(prisma, userId);
  const capped = Math.min(take, 50);
  return prisma.saplingStockLedger.findMany({
    where: { nurseryId: profile.id },
    orderBy: { createdAt: 'desc' },
    take: capped,
    skip: (Math.max(page, 1) - 1) * capped,
  });
}

export async function getStockAnalytics(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);

  const [addedAgg, givenOutAgg, reservationsFulfilled, stats] = await Promise.all([
    prisma.saplingStockLedger.aggregate({
      where: { nurseryId: profile.id, reason: { in: ['manual_add', 'manual_adjust'] }, delta: { gt: 0 } },
      _sum: { delta: true },
    }),
    prisma.saplingStockLedger.aggregate({
      where: { nurseryId: profile.id, reason: 'reservation_fulfilled' },
      _sum: { delta: true },
    }),
    prisma.saplingReservation.count({ where: { nurseryId: profile.id, status: 'fulfilled' } }),
    getOwnStats(prisma, userId),
  ]);

  return {
    totalAddedLifetime: addedAgg._sum.delta ?? 0,
    totalGivenOutLifetime: Math.abs(givenOutAgg._sum.delta ?? 0),
    reservationsFulfilled,
    currentSpeciesCount: stats.speciesCount,
    currentTotalQuantity: stats.totalQuantity,
  };
}
