import { PrismaClient } from '@plant/db';
import { getStripeClient } from '../lib/stripe';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export { adminRefundOrder } from './order.service';

interface PaginationFilter {
  page?: number;
  take?: number;
}

// ---------- Drives ----------

export async function listDrives(prisma: PrismaClient, filter: PaginationFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const [drives, total] = await Promise.all([
    prisma.drive.findMany({
      include: { ngo: { select: { id: true, orgName: true } }, _count: { select: { rsvps: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
    }),
    prisma.drive.count(),
  ]);

  return { drives, total };
}

export async function adminCancelDrive(prisma: PrismaClient, driveId: string, input: { reason?: string; adminUserId: string }) {
  const drive = await prisma.drive.findUnique({ where: { id: driveId } });
  if (!drive) throw new NotFoundError('Drive not found');
  if (drive.status === 'cancelled') throw new ForbiddenError('This drive is already cancelled');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.drive.update({ where: { id: driveId }, data: { status: 'cancelled' } });
    await tx.adminActionLog.create({
      data: {
        actorUserId: input.adminUserId,
        action: 'drive.cancelled',
        targetType: 'Drive',
        targetId: driveId,
        reason: input.reason ?? null,
      },
    });
    return updated;
  });
}

// ---------- Donations ----------

export async function listDonations(prisma: PrismaClient, filter: PaginationFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      include: {
        campaign: { select: { id: true, title: true, ngo: { select: { orgName: true } } } },
        user: { select: { id: true, name: true, handle: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
    }),
    prisma.donation.count(),
  ]);

  return { donations, total };
}

// No existing refund path for donations (unlike orders) — this is the first
// code that ever sets DonationStatus.refunded.
export async function adminRefundDonation(prisma: PrismaClient, donationId: string, input: { reason?: string; adminUserId: string }) {
  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  if (!donation) throw new NotFoundError('Donation not found');
  if (donation.status !== 'succeeded') throw new ForbiddenError('Only a succeeded donation can be refunded');

  const stripe = getStripeClient();
  await stripe.refunds.create({ payment_intent: donation.stripePaymentIntentId });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.donation.update({ where: { id: donationId }, data: { status: 'refunded' } });
    await tx.adminActionLog.create({
      data: {
        actorUserId: input.adminUserId,
        action: 'donation.refunded',
        targetType: 'Donation',
        targetId: donationId,
        reason: input.reason ?? null,
      },
    });
    return updated;
  });
}

// ---------- Orders (marketplace) ----------

export async function listOrders(prisma: PrismaClient, filter: PaginationFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      include: {
        nursery: { select: { id: true, nurseryName: true } },
        user: { select: { id: true, name: true, handle: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
    }),
    prisma.order.count(),
  ]);

  return { orders, total };
}
