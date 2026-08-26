import { NgoApprovalStatus, PrismaClient } from '@plant/db';
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

interface ListOrgFilter {
  status?: NgoApprovalStatus;
  q?: string;
  page?: number;
  take?: number;
}

// Nursery/Corporate share NGO's exact approval workflow (NgoApprovalStatus, same
// pending/approved/rejected/suspended lifecycle) — these mirror listNgos/setNgoStatus
// verbatim, just against a different profile table.
export async function listNurseries(prisma: PrismaClient, filter: ListOrgFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const where = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.q ? { nurseryName: { contains: filter.q, mode: 'insensitive' as const } } : {}),
  };

  const [nurseries, total] = await Promise.all([
    prisma.nurseryProfile.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true, handle: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
    }),
    prisma.nurseryProfile.count({ where }),
  ]);

  return { nurseries, total };
}

export async function setNurseryStatus(prisma: PrismaClient, nurseryId: string, input: SetStatusInput) {
  const profile = await prisma.nurseryProfile.findUnique({ where: { id: nurseryId } });
  if (!profile) throw new NotFoundError('Nursery not found');

  const action =
    input.status === 'approved' && profile.status === 'suspended' ? 'nursery.reinstated' : `nursery.${input.status}`;
  const carriesReason = input.status === 'rejected' || input.status === 'suspended';

  return prisma.$transaction(async (tx) => {
    const updated = await tx.nurseryProfile.update({
      where: { id: nurseryId },
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
        targetType: 'NurseryProfile',
        targetId: nurseryId,
        reason: carriesReason ? (input.rejectionReason ?? null) : null,
      },
    });

    return updated;
  });
}

export async function listCorporates(prisma: PrismaClient, filter: ListOrgFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const where = {
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.q ? { companyName: { contains: filter.q, mode: 'insensitive' as const } } : {}),
  };

  const [corporates, total] = await Promise.all([
    prisma.corporateProfile.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true, handle: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
    }),
    prisma.corporateProfile.count({ where }),
  ]);

  return { corporates, total };
}

export async function setCorporateStatus(prisma: PrismaClient, corporateId: string, input: SetStatusInput) {
  const profile = await prisma.corporateProfile.findUnique({ where: { id: corporateId } });
  if (!profile) throw new NotFoundError('Corporate account not found');

  const action =
    input.status === 'approved' && profile.status === 'suspended' ? 'corporate.reinstated' : `corporate.${input.status}`;
  const carriesReason = input.status === 'rejected' || input.status === 'suspended';

  return prisma.$transaction(async (tx) => {
    const updated = await tx.corporateProfile.update({
      where: { id: corporateId },
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
        targetType: 'CorporateProfile',
        targetId: corporateId,
        reason: carriesReason ? (input.rejectionReason ?? null) : null,
      },
    });

    return updated;
  });
}

interface ListGroupsFilter {
  q?: string;
  page?: number;
  take?: number;
}

// Groups have no approval workflow (see GroupProfile's schema comment) — admin's
// only lever is suspend/reinstate, logged the same way as NGO status changes.
export async function listGroups(prisma: PrismaClient, filter: ListGroupsFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const where = filter.q ? { groupName: { contains: filter.q, mode: 'insensitive' as const } } : {};

  const [groups, total] = await Promise.all([
    prisma.groupProfile.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true, handle: true, createdAt: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
    }),
    prisma.groupProfile.count({ where }),
  ]);

  return { groups, total };
}

export async function setGroupStatus(prisma: PrismaClient, groupId: string, status: 'active' | 'suspended', adminUserId: string) {
  const group = await prisma.groupProfile.findUnique({ where: { id: groupId } });
  if (!group) throw new NotFoundError('Group not found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.groupProfile.update({
      where: { id: groupId },
      data: { status },
      include: { user: { select: { id: true, email: true, name: true, handle: true } } },
    });

    await tx.adminActionLog.create({
      data: {
        actorUserId: adminUserId,
        action: status === 'suspended' ? 'group.suspended' : 'group.reinstated',
        targetType: 'GroupProfile',
        targetId: groupId,
      },
    });

    return updated;
  });
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
  const [usersByRole, ngosByStatus, groupsCount, drivesCount, adoptedTreesCount, succeededDonations] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.ngoProfile.groupBy({ by: ['status'], _count: true }),
    prisma.groupProfile.count(),
    prisma.drive.count(),
    prisma.adoptableTree.count({ where: { status: 'adopted' } }),
    prisma.donation.findMany({ where: { status: 'succeeded' }, select: { amountCents: true } }),
  ]);

  return {
    usersByRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count])),
    ngosByStatus: Object.fromEntries(ngosByStatus.map((r) => [r.status, r._count])),
    groupsCount,
    drivesCount,
    adoptedTreesCount,
    totalDonatedCents: succeededDonations.reduce((sum, d) => sum + d.amountCents, 0),
  };
}
