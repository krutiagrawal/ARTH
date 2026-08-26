import { PrismaClient } from '@plant/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { notify } from './notification.service';

// User-facing half of the reservation flow — the nursery-side inbox (fulfil/decline) lives in
// nursery.service.ts, mirroring how follow requests are created from follow.service.ts but
// responded to from ngo.service.ts.
export async function createReservation(
  prisma: PrismaClient,
  userId: string,
  stockId: string,
  quantity: number,
  message?: string
) {
  const stock = await prisma.saplingStock.findUnique({
    where: { id: stockId },
    include: { nursery: true },
  });
  if (!stock || stock.nursery.status !== 'approved') throw new NotFoundError('Sapling stock not found');
  if (quantity < 1) throw new BadRequestError('Quantity must be at least 1');
  if (quantity > stock.quantity) throw new BadRequestError('Not enough stock available');

  const reservation = await prisma.saplingReservation.create({
    data: { stockId, nurseryId: stock.nurseryId, userId, quantity, message },
  });

  const requester = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

  await notify(prisma, {
    userId: stock.nursery.userId,
    type: 'reservation_requested',
    actorUserId: userId,
    data: { species: stock.species, quantity, requesterName: requester?.name },
    push: { title: requester?.name ?? 'Someone', body: `requested ${quantity} ${stock.species} saplings` },
  });

  return reservation;
}

export async function listMyReservations(prisma: PrismaClient, userId: string) {
  return prisma.saplingReservation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      stock: { select: { species: true } },
      nursery: { select: { id: true, nurseryName: true, logoUrl: true } },
    },
  });
}

export async function cancelReservation(prisma: PrismaClient, userId: string, reservationId: string) {
  const reservation = await prisma.saplingReservation.findFirst({ where: { id: reservationId, userId } });
  if (!reservation) throw new NotFoundError('Reservation not found');
  if (reservation.status !== 'pending') throw new ForbiddenError('Only a pending reservation can be cancelled');

  return prisma.saplingReservation.update({
    where: { id: reservationId },
    data: { status: 'cancelled', respondedAt: new Date() },
  });
}
