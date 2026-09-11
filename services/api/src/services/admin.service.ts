import { NgoApprovalStatus, Prisma, PrismaClient, UserRole } from '@plant/db';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { addXp } from './xp.service';
import { getAdminNgoProfile } from './ngoPublic.service';
import { getAdminNurseryProfile } from './nurseryPublic.service';
import { serializePost, viewerInclude } from './post.service';
import { evaluateNurseryAchievements } from './nurseryAchievement.service';
import { maybeMarkOrderPlantationVerified } from './order.service';
import { notify } from './notification.service';

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
  const [
    usersByRole,
    ngosByStatus,
    nurseriesByStatus,
    corporatesByStatus,
    groupsCount,
    drivesCount,
    adoptedTreesCount,
    succeededDonations,
    blockedUsersCount,
    openReportsCount,
    treesPendingReviewCount,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.ngoProfile.groupBy({ by: ['status'], _count: true }),
    prisma.nurseryProfile.groupBy({ by: ['status'], _count: true }),
    prisma.corporateProfile.groupBy({ by: ['status'], _count: true }),
    prisma.groupProfile.count(),
    prisma.drive.count(),
    prisma.adoptableTree.count({ where: { status: 'adopted' } }),
    prisma.donation.findMany({ where: { status: 'succeeded' }, select: { amountCents: true } }),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.contentReport.count({ where: { status: 'open' } }),
    prisma.tree.count({ where: { aiVerificationStatus: { in: ['unverified', 'rejected'] }, reviewedAt: null } }),
  ]);

  return {
    usersByRole: Object.fromEntries(usersByRole.map((r) => [r.role, r._count])),
    ngosByStatus: Object.fromEntries(ngosByStatus.map((r) => [r.status, r._count])),
    nurseriesByStatus: Object.fromEntries(nurseriesByStatus.map((r) => [r.status, r._count])),
    corporatesByStatus: Object.fromEntries(corporatesByStatus.map((r) => [r.status, r._count])),
    groupsCount,
    drivesCount,
    adoptedTreesCount,
    totalDonatedCents: succeededDonations.reduce((sum, d) => sum + d.amountCents, 0),
    blockedUsersCount,
    openReportsCount,
    treesPendingReviewCount,
  };
}

// ---------- Account search & blocking (User/NGO/Nursery/Corporate — Group is
// out of scope, it keeps its own separate suspend/active workflow above) ----------

interface SearchAccountsFilter {
  q?: string;
  type?: 'user' | 'ngo' | 'nursery' | 'corporate';
  isBlocked?: boolean;
  page?: number;
  take?: number;
}

const ROLE_BY_ACCOUNT_TYPE: Record<NonNullable<SearchAccountsFilter['type']>, UserRole> = {
  user: 'user',
  ngo: 'ngo',
  nursery: 'nursery',
  corporate: 'corporate',
};

const ACCOUNT_SELECT = {
  id: true,
  email: true,
  name: true,
  handle: true,
  role: true,
  isBlocked: true,
  blockedAt: true,
  blockedReason: true,
  createdAt: true,
  ngoProfile: { select: { id: true, orgName: true, status: true } },
  nurseryProfile: { select: { id: true, nurseryName: true, status: true } },
  corporateProfile: { select: { id: true, companyName: true, status: true } },
  groupProfile: { select: { id: true, groupName: true, status: true } },
} satisfies Prisma.UserSelect;

// One query against User covers all four account types since NgoProfile/
// NurseryProfile/CorporateProfile are 1:1 children of User — no cross-table
// union needed.
export async function searchAccounts(prisma: PrismaClient, filter: SearchAccountsFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const where: Prisma.UserWhereInput = {
    role: filter.type ? ROLE_BY_ACCOUNT_TYPE[filter.type] : { not: 'admin' },
    isDeleted: false,
    ...(filter.isBlocked !== undefined ? { isBlocked: filter.isBlocked } : {}),
    ...(filter.q
      ? {
          OR: [
            { name: { contains: filter.q, mode: 'insensitive' } },
            { email: { contains: filter.q, mode: 'insensitive' } },
            { handle: { contains: filter.q, mode: 'insensitive' } },
            { ngoProfile: { orgName: { contains: filter.q, mode: 'insensitive' } } },
            { nurseryProfile: { nurseryName: { contains: filter.q, mode: 'insensitive' } } },
            { corporateProfile: { companyName: { contains: filter.q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  const [accounts, total] = await Promise.all([
    prisma.user.findMany({ where, select: ACCOUNT_SELECT, orderBy: { createdAt: 'desc' }, take, skip: (page - 1) * take }),
    prisma.user.count({ where }),
  ]);

  return { accounts, total };
}

// Full profile view for the Accounts page's "Profile" link — identity fields
// plus a role-specific content block (posts/images/sponsorships) so admin can
// see everything an account has published, not just moderation metadata.
export async function getAccountProfile(prisma: PrismaClient, userId: string) {
  const account = await prisma.user.findUnique({ where: { id: userId }, select: ACCOUNT_SELECT });
  if (!account) throw new NotFoundError('Account not found');

  if (account.role === 'ngo' && account.ngoProfile) {
    const ngoId = account.ngoProfile.id;
    const [content, stories, campaigns, adoptableTrees, plantedTrees, achievements] = await Promise.all([
      getAdminNgoProfile(prisma, ngoId),
      prisma.story.findMany({ where: { authorType: 'ngo', ngoId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.donationCampaign.findMany({ where: { ngoId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.adoptableTree.findMany({
        where: { ngoId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { adoption: { include: { user: { select: { name: true, handle: true } } } } },
      }),
      prisma.plantedTree.findMany({ where: { ngoId }, orderBy: { plantedAt: 'desc' }, take: 50 }),
      prisma.ngoAchievementUnlock.findMany({
        where: { ngoId, unlocked: true },
        orderBy: { unlockedAt: 'desc' },
        include: { achievement: true },
      }),
    ]);

    // Campaign rows don't carry a denormalised total, unlike the NGO dashboard's own
    // serializer — computed here the same way, so the admin view matches what the NGO sees.
    const raisedByCampaign = campaigns.length
      ? await prisma.donation.groupBy({
          by: ['campaignId'],
          where: { campaignId: { in: campaigns.map((c) => c.id) }, status: 'succeeded' },
          _sum: { amountCents: true },
        })
      : [];
    const raisedMap = new Map(raisedByCampaign.map((r) => [r.campaignId, r._sum.amountCents ?? 0]));
    const campaignsWithRaised = campaigns.map((c) => ({ ...c, raisedAmountCents: raisedMap.get(c.id) ?? 0 }));

    return {
      account,
      kind: 'ngo' as const,
      content: { ...content, stories, campaigns: campaignsWithRaised, adoptableTrees, plantedTrees, achievements },
    };
  }

  if (account.role === 'nursery' && account.nurseryProfile) {
    const nurseryId = account.nurseryProfile.id;
    const [content, stories, achievements] = await Promise.all([
      getAdminNurseryProfile(prisma, nurseryId),
      prisma.story.findMany({ where: { authorType: 'nursery', nurseryId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.nurseryAchievementUnlock.findMany({
        where: { nurseryId, unlocked: true },
        orderBy: { unlockedAt: 'desc' },
        include: { achievement: true },
      }),
    ]);
    return { account, kind: 'nursery' as const, content: { ...content, stories, achievements } };
  }

  if (account.role === 'corporate' && account.corporateProfile) {
    const corporate = await prisma.corporateProfile.findUnique({ where: { id: account.corporateProfile.id } });
    const sponsorships = await prisma.csrSponsorship.findMany({
      where: { corporateId: account.corporateProfile.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { drive: { select: { id: true, title: true } } },
    });
    return { account, kind: 'corporate' as const, content: { ...corporate, sponsorships } };
  }

  // Groups have their own profile row (unlike the old assumption that only ngo/nursery/
  // corporate do) — members/challenges/posts-shared-to-the-group/stories/achievements,
  // not a user's personal posts/trees.
  if (account.role === 'group' && account.groupProfile) {
    const groupId = account.groupProfile.id;
    const [groupProfile, members, challenges, posts, stories, achievements] = await Promise.all([
      prisma.groupProfile.findUnique({ where: { id: groupId } }),
      prisma.groupMember.findMany({
        where: { groupId },
        include: { user: { select: { id: true, name: true, handle: true, avatarEmoji: true } } },
        orderBy: { joinedAt: 'asc' },
        take: 100,
      }),
      prisma.groupChallenge.findMany({ where: { groupId }, orderBy: { startsAt: 'desc' }, take: 50 }),
      prisma.post.findMany({
        where: { groupId, isHidden: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: viewerInclude(),
      }),
      // Story (unlike Post) supports real group authorship via authorType: 'group'.
      prisma.story.findMany({ where: { authorType: 'group', groupId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.groupAchievementUnlock.findMany({
        where: { groupId, unlocked: true },
        orderBy: { unlockedAt: 'desc' },
        include: { achievement: true },
      }),
    ]);

    return {
      account,
      kind: 'group' as const,
      content: { ...groupProfile, members, challenges, posts: posts.map((p) => serializePost(p as any)), stories, achievements },
    };
  }

  // Individual accounts: no dedicated profile row — surface their post history, trees,
  // stories, and achievements directly.
  const [posts, trees, stories, achievements] = await Promise.all([
    prisma.post.findMany({
      where: { authorType: 'user', userId, isHidden: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: viewerInclude(),
    }),
    prisma.tree.findMany({
      where: { userId, isDeleted: false },
      orderBy: { plantedAt: 'desc' },
      take: 50,
      include: { species: { select: { commonName: true, emoji: true } } },
    }),
    prisma.story.findMany({ where: { authorType: 'user', userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.userAchievement.findMany({
      where: { userId, unlocked: true },
      orderBy: { unlockedAt: 'desc' },
      include: { achievement: true },
    }),
  ]);

  return {
    account,
    kind: 'user' as const,
    content: { posts: posts.map((p) => serializePost(p as any)), trees, stories, achievements },
  };
}

interface BlockAccountInput {
  reason?: string;
  adminUserId: string;
}

export async function blockAccount(prisma: PrismaClient, targetUserId: string, input: BlockAccountInput) {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError('Account not found');
  if (target.role === 'admin') throw new ForbiddenError('Admin accounts cannot be blocked');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: {
        isBlocked: true,
        blockedAt: new Date(),
        blockedReason: input.reason ?? null,
        blockedByUserId: input.adminUserId,
      },
      select: ACCOUNT_SELECT,
    });

    await tx.adminActionLog.create({
      data: {
        actorUserId: input.adminUserId,
        action: 'user.blocked',
        targetType: 'User',
        targetId: targetUserId,
        reason: input.reason ?? null,
      },
    });

    return updated;
  });
}

export async function unblockAccount(prisma: PrismaClient, targetUserId: string, adminUserId: string) {
  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) throw new NotFoundError('Account not found');

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: { isBlocked: false, blockedAt: null, blockedReason: null, blockedByUserId: null },
      select: ACCOUNT_SELECT,
    });

    await tx.adminActionLog.create({
      data: { actorUserId: adminUserId, action: 'user.unblocked', targetType: 'User', targetId: targetUserId },
    });

    return updated;
  });
}

// ---------- AI tree-photo verification review queue ----------

export async function listTreesForReview(prisma: PrismaClient, filter: PaginationFilter = {}) {
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  const where: Prisma.TreeWhereInput = {
    aiVerificationStatus: { in: ['unverified', 'rejected'] },
    reviewedAt: null,
    isDeleted: false,
  };

  const [trees, total] = await Promise.all([
    prisma.tree.findMany({
      where,
      include: {
        species: { select: { commonName: true, emoji: true } },
        user: { select: { id: true, name: true, handle: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
    }),
    prisma.tree.count({ where }),
  ]);

  return { trees, total };
}

export async function reviewTree(
  prisma: PrismaClient,
  treeId: string,
  input: { decision: 'approve' | 'reject'; adminUserId: string },
) {
  const tree = await prisma.tree.findUnique({ where: { id: treeId } });
  if (!tree) throw new NotFoundError('Tree not found');
  if (tree.reviewedAt) throw new ForbiddenError('This submission has already been reviewed');

  // 'unverified'/'verified' trees already received XP at creation time
  // (plantTree() awards it unconditionally). Only a 'rejected' tree had its
  // XP withheld — approving one now is the one case that must award it.
  const shouldAwardWithheldXp = input.decision === 'approve' && tree.aiVerificationStatus === 'rejected';

  const { updated, provenanceFollowUp } = await prisma.$transaction(async (tx) => {
    const updated = await tx.tree.update({
      where: { id: treeId },
      data: {
        aiVerificationStatus: input.decision === 'approve' ? 'verified' : tree.aiVerificationStatus,
        reviewedAt: new Date(),
        reviewedByAdminId: input.adminUserId,
      },
    });

    if (shouldAwardWithheldXp) {
      await addXp(tx, tree.userId, tree.xpEarned, 'tree_planted', 'tree', tree.id);
      await tx.user.update({
        where: { id: tree.userId },
        data: { treesPlantedCount: { increment: 1 }, totalCo2Absorbed: { increment: tree.co2Absorbed } },
      });
    }

    await tx.adminActionLog.create({
      data: {
        actorUserId: input.adminUserId,
        action: input.decision === 'approve' ? 'tree.review_approved' : 'tree.review_rejected',
        targetType: 'Tree',
        targetId: treeId,
      },
    });

    // Delayed-verification provenance follow-up (mirrors tree.service.ts's plantTree): a
    // nursery-sourced tree that was unverified/rejected at submit time skipped the nursery
    // achievement/order-completion hooks then — approving it now is the one place that must not
    // silently skip them too.
    let provenanceFollowUp: { nurseryUserId: string; species: string; locationLabel: string | null; orderId: string | null } | null = null;
    if (input.decision === 'approve') {
      const unit = await tx.arthSaplingUnit.findUnique({
        where: { treeId },
        include: { nursery: { select: { userId: true } }, orderItem: { select: { orderId: true } } },
      });
      if (unit) {
        await evaluateNurseryAchievements(tx, unit.nurseryId);
        let orderCompleted = false;
        if (unit.orderItem) {
          orderCompleted = await maybeMarkOrderPlantationVerified(tx, unit.orderItem.orderId);
        }
        const species = await tx.treeSpecies.findUnique({ where: { id: updated.speciesId }, select: { commonName: true } });
        provenanceFollowUp = {
          nurseryUserId: unit.nursery.userId,
          species: species?.commonName ?? 'sapling',
          locationLabel: updated.locationLabel,
          orderId: orderCompleted && unit.orderItem ? unit.orderItem.orderId : null,
        };
      }
    }

    return { updated, provenanceFollowUp };
  });

  if (provenanceFollowUp) {
    await notify(prisma, {
      userId: provenanceFollowUp.nurseryUserId,
      type: 'sapling_planted',
      data: { treeId, species: provenanceFollowUp.species, locationLabel: provenanceFollowUp.locationLabel },
      push: { title: '🌱 One of your saplings just became an ARTH Tree', body: `A ${provenanceFollowUp.species} you supplied was just verified.` },
    });
    if (provenanceFollowUp.orderId) {
      await notify(prisma, {
        userId: provenanceFollowUp.nurseryUserId,
        type: 'order_plantation_verified',
        data: { orderId: provenanceFollowUp.orderId },
        push: { title: '🌳 Plantation verified', body: 'Every sapling in this order is now a verified ARTH Tree.' },
      });
    }
  }

  return updated;
}
