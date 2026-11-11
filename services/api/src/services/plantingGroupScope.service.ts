import { Prisma, PrismaClient } from '@arth/db';

/**
 * What counts as a group's work.
 *
 * A group's forest, totals, streak, XP, drives, adoptions and donations are the sum of:
 *   1. anything done FOR the group (an admin planted, adopted or donated in its name), and
 *   2. everything its members do on ARTH from the day they joined, for members who share
 *      (PlantingGroupMember.shareActivity, on by default, switchable off per group).
 *
 * Everything is worked out from the real records on every read, so it cannot drift, and a member who
 * leaves or switches sharing off takes their share with them going forward.
 */

type Db = PrismaClient | Prisma.TransactionClient;

export const COUNTED_TREE = {
  isDeleted: false,
  aiVerificationStatus: { in: ['verified', 'unverified'] as ('verified' | 'unverified')[] },
};

export interface GroupScope {
  groupId: string;
  memberCount: number;
  /** Members whose own ARTH activity counts, with the date it starts counting from. */
  sharing: { userId: string; joinedAt: Date }[];
}

export async function loadScope(db: Db, groupId: string): Promise<GroupScope> {
  const members = await db.plantingGroupMember.findMany({
    where: { groupId },
    select: { userId: true, joinedAt: true, shareActivity: true },
  });
  return {
    groupId,
    memberCount: members.length,
    sharing: members.filter((m) => m.shareActivity).map((m) => ({ userId: m.userId, joinedAt: m.joinedAt })),
  };
}

/** Trees that count for the group (not deleted, not rejected). */
export function treeScopeWhere(scope: GroupScope): Prisma.TreeWhereInput {
  return {
    ...COUNTED_TREE,
    OR: [{ plantingGroupId: scope.groupId }, ...scope.sharing.map((m) => ({ userId: m.userId, plantedAt: { gte: m.joinedAt } }))],
  };
}

export function adoptionScopeWhere(scope: GroupScope): Prisma.AdoptionWhereInput {
  return {
    OR: [{ plantingGroupId: scope.groupId }, ...scope.sharing.map((m) => ({ userId: m.userId, createdAt: { gte: m.joinedAt } }))],
  };
}

/** Settled donations only: money counts once it has really arrived. */
export function donationScopeWhere(scope: GroupScope): Prisma.DonationWhereInput {
  return {
    status: 'succeeded',
    OR: [{ plantingGroupId: scope.groupId }, ...scope.sharing.map((m) => ({ userId: m.userId, createdAt: { gte: m.joinedAt } }))],
  };
}

/** Drive sign-ups that are still on. Drives are joined by people, so only sharing members count. */
export function rsvpScopeWhere(scope: GroupScope): Prisma.DriveRsvpWhereInput {
  return {
    status: 'confirmed',
    OR: scope.sharing.map((m) => ({ userId: m.userId, createdAt: { gte: m.joinedAt } })),
  };
}

export const XP_PER_LEVEL = 500;

/** Same rule as an individual: a level every 500 XP. */
export function levelForXp(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  return { xp, level, xpIntoLevel: xp - (level - 1) * XP_PER_LEVEL, xpPerLevel: XP_PER_LEVEL };
}

/** The group's XP: what its sharing members have earned since they joined. */
export async function groupXp(db: Db, scope: GroupScope): Promise<number> {
  if (scope.sharing.length === 0) return 0;
  const { _sum } = await db.xpTransaction.aggregate({
    where: { OR: scope.sharing.map((m) => ({ userId: m.userId, createdAt: { gte: m.joinedAt } })) },
    _sum: { amount: true },
  });
  return Math.max(0, _sum.amount ?? 0);
}

/**
 * Members' personal trees show only as an approximate area (about 1 km), so nobody's home garden is
 * pinpointed. Trees planted for the group, and a person's own trees, show exactly.
 */
export function visibleCoordinates(
  tree: { lat: unknown; lng: unknown; plantingGroupId: string | null; userId: string },
  groupId: string,
  viewerId: string,
) {
  const lat = Number(tree.lat);
  const lng = Number(tree.lng);
  const exact = tree.plantingGroupId === groupId || tree.userId === viewerId;
  if (exact) return { lat, lng, approximate: false };
  const round = (n: number) => Math.round(n * 100) / 100;
  return { lat: round(lat), lng: round(lng), approximate: true };
}
