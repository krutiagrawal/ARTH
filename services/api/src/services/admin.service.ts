import { NgoApprovalStatus, PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors';

interface ListNgosFilter {
  status?: NgoApprovalStatus;
  q?: string;
  page?: number;
  take?: number;
}

export async function listNgos(prisma: PrismaClient, filter: ListNgosFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const where = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.q ? { orgName: { contains: filter.q, mode: 'insensitive' as const } } : {}),
  };

  const [ngos, total] = await Promise.all([
    prisma.ngoProfile.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true, handle: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
    }),
    prisma.ngoProfile.count({ where }),
  ]);

  return { ngos, total };
}

interface SetStatusInput {
  status: NgoApprovalStatus;
  rejectionReason?: string;
  adminUserId: string;
}

const ACTION_BY_STATUS: Record<NgoApprovalStatus, string> = {
  pending: 'ngo.reset_pending',
  approved: 'ngo.approved',
  rejected: 'ngo.rejected',
  suspended: 'ngo.suspended',
};

export async function setNgoStatus(prisma: PrismaClient, ngoId: string, input: SetStatusInput) {
  const profile = await prisma.ngoProfile.findUnique({ where: { id: ngoId } });
  if (!profile) throw new NotFoundError('NGO not found');

  // 'approved' from a 'suspended' state is a reinstatement, not a fresh
  // approval — logged distinctly so the audit trail reads accurately.
  const action =
    input.status === 'approved' && profile.status === 'suspended' ? 'ngo.reinstated' : ACTION_BY_STATUS[input.status];

  const carriesReason = input.status === 'rejected' || input.status === 'suspended';

  return prisma.$transaction(async (tx) => {
    const updated = await tx.ngoProfile.update({
      where: { id: ngoId },
      data: {
        status: input.status,
        rejectionReason: carriesReason ? (input.rejectionReason ?? null) : null,
        approvedAt: input.status === 'approved' ? new Date() : null,
        approvedByUserId: input.status === 'approved' ? input.adminUserId : null,
      },
      include: { user: { select: { id: true, email: true, name: true, handle: true } } },
    });

    await tx.adminActionLog.create({
      data: {
        actorUserId: input.adminUserId,
        action,
        targetType: 'NgoProfile',
        targetId: ngoId,
        reason: carriesReason ? (input.rejectionReason ?? null) : null,
      },
    });

    return updated;
  });
}

export async function getNgoSummary(prisma: PrismaClient, ngoId: string) {
  const profile = await prisma.ngoProfile.findUnique({ where: { id: ngoId } });
  if (!profile) throw new NotFoundError('NGO not found');

  const [drivesCount, campaignsCount, treesCount, donations] = await Promise.all([
    prisma.drive.count({ where: { ngoId } }),
    prisma.donationCampaign.count({ where: { ngoId } }),
    prisma.adoptableTree.count({ where: { ngoId } }),
    prisma.donation.findMany({ where: { status: 'succeeded', campaign: { ngoId } }, select: { amountCents: true } }),
  ]);

  return {
    drivesCount,
    campaignsCount,
    treesCount,
    totalRaisedCents: donations.reduce((sum, d) => sum + d.amountCents, 0),
  };
}

interface PaginationFilter {
  page?: number;
  take?: number;
}

export async function listActionLogs(prisma: PrismaClient, filter: PaginationFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const [logs, total] = await Promise.all([
    prisma.adminActionLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
      include: { actor: { select: { name: true, handle: true } } },
    }),
    prisma.adminActionLog.count(),
  ]);

  return { logs, total };
}

export async function getOverviewStats(prisma: PrismaClient) {
  const [usersByRole, ngosByStatus, drivesCount, adoptedTreesCount, succeededDonations] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.ngoProfile.groupBy({ by: ['status'], _count: true }),
    prisma.drive.count(),
    prisma.adoptableTree.count({ where: { status: 'adopted' } }),
    prisma.donation.findMany({ where: { status: 'succeeded' }, select: { amountCents: true } }),
  ]);

  return {
    usersByRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count])),
    ngosByStatus: Object.fromEntries(ngosByStatus.map((r) => [r.status, r._count])),
    drivesCount,
    adoptedTreesCount,
    totalDonatedCents: succeededDonations.reduce((sum, d) => sum + d.amountCents, 0),
  };
}
