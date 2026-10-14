import { PrismaClient } from '@arth/db';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { cursorArgs, toCursorPage, type CursorQuery } from '../utils/pagination';

/**
 * Blocks are stored one-directionally (who pressed the button) but enforced symmetrically: once
 * A blocks B, neither sees the other's posts or stories. Feeds therefore need both "people I
 * blocked" and "people who blocked me", which is what `getBlockedIds` returns.
 *
 * Callers should fetch this once per request and reuse it — it's two indexed queries, and doing
 * it per feed row is what makes a block filter expensive.
 */
export interface BlockedIds {
  userIds: string[];
  ngoIds: string[];
  nurseryIds: string[];
}

export async function getBlockedIds(prisma: PrismaClient, viewerId: string): Promise<BlockedIds> {
  const [outgoing, incoming] = await Promise.all([
    prisma.block.findMany({
      where: { blockerId: viewerId },
      select: { blockedUserId: true, blockedNgoId: true, blockedNurseryId: true },
    }),
    prisma.block.findMany({
      where: { blockedUserId: viewerId },
      select: { blockerId: true },
    }),
  ]);

  const userIds = new Set<string>();
  const ngoIds = new Set<string>();
  const nurseryIds = new Set<string>();

  for (const b of outgoing) {
    if (b.blockedUserId) userIds.add(b.blockedUserId);
    if (b.blockedNgoId) ngoIds.add(b.blockedNgoId);
    if (b.blockedNurseryId) nurseryIds.add(b.blockedNurseryId);
  }
  // Someone who blocked me also disappears from my feed — otherwise blocking is a one-way
  // mute that still leaves the blocker's content visible to the person they blocked.
  for (const b of incoming) userIds.add(b.blockerId);

  return { userIds: [...userIds], ngoIds: [...ngoIds], nurseryIds: [...nurseryIds] };
}

/** Prisma `where` fragment that removes blocked authors from a Post query. */
export function blockFilter(blocked: BlockedIds) {
  const clauses: Record<string, unknown>[] = [];
  if (blocked.userIds.length) clauses.push({ userId: { notIn: blocked.userIds } });
  if (blocked.ngoIds.length) clauses.push({ OR: [{ ngoId: null }, { ngoId: { notIn: blocked.ngoIds } }] });
  if (blocked.nurseryIds.length) clauses.push({ OR: [{ nurseryId: null }, { nurseryId: { notIn: blocked.nurseryIds } }] });
  return clauses;
}

export async function listBlocks(prisma: PrismaClient, viewerId: string, q: CursorQuery = {}) {
  const { take, args } = cursorArgs(q, 30);
  const blocks = await prisma.block.findMany({
    where: { blockerId: viewerId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    ...args,
    include: {
      blockedUser: { select: { id: true, name: true, handle: true, avatarEmoji: true } },
      blockedNgo: { select: { id: true, orgName: true, logoUrl: true } },
      blockedNursery: { select: { id: true, nurseryName: true, logoUrl: true } },
    },
  });

  return toCursorPage(blocks, take, (b) => ({
    id: b.id,
    createdAt: b.createdAt,
    kind: b.blockedNgoId ? ('ngo' as const) : b.blockedNurseryId ? ('nursery' as const) : ('user' as const),
    targetId: b.blockedNgoId ?? b.blockedNurseryId ?? b.blockedUserId,
    name: b.blockedNgo?.orgName ?? b.blockedNursery?.nurseryName ?? b.blockedUser?.name ?? 'Unknown',
    handle: b.blockedUser?.handle ?? null,
    avatarEmoji: b.blockedUser?.avatarEmoji ?? null,
    logoUrl: b.blockedNgo?.logoUrl ?? b.blockedNursery?.logoUrl ?? null,
  }));
}

export async function blockTarget(
  prisma: PrismaClient,
  viewerId: string,
  input: { userId?: string; ngoId?: string; nurseryId?: string },
) {
  if ([input.userId, input.ngoId, input.nurseryId].filter(Boolean).length !== 1) {
    throw new BadRequestError('Block exactly one of userId, ngoId or nurseryId');
  }
  if (input.userId === viewerId) throw new BadRequestError('You cannot block yourself');

  if (input.userId) {
    const exists = await prisma.user.findFirst({ where: { id: input.userId, isDeleted: false } });
    if (!exists) throw new NotFoundError('User not found');
    await prisma.block.upsert({
      where: { blockerId_blockedUserId: { blockerId: viewerId, blockedUserId: input.userId } },
      create: { blockerId: viewerId, blockedUserId: input.userId },
      update: {},
    });
    // Blocking is also an implicit unfollow in the other direction where one exists.
    await prisma.follow.deleteMany({ where: { followerId: input.userId, ngo: { userId: viewerId } } });
    return;
  }

  if (input.nurseryId) {
    const nursery = await prisma.nurseryProfile.findUnique({ where: { id: input.nurseryId } });
    if (!nursery) throw new NotFoundError('Nursery not found');
    if (nursery.userId === viewerId) throw new BadRequestError('You cannot block yourself');
    await prisma.block.upsert({
      where: { blockerId_blockedNurseryId: { blockerId: viewerId, blockedNurseryId: input.nurseryId } },
      create: { blockerId: viewerId, blockedNurseryId: input.nurseryId },
      update: {},
    });
    await prisma.follow.deleteMany({ where: { followerId: viewerId, nurseryId: input.nurseryId } });
    return;
  }

  const ngo = await prisma.ngoProfile.findUnique({ where: { id: input.ngoId } });
  if (!ngo) throw new NotFoundError('NGO not found');
  await prisma.block.upsert({
    where: { blockerId_blockedNgoId: { blockerId: viewerId, blockedNgoId: input.ngoId! } },
    create: { blockerId: viewerId, blockedNgoId: input.ngoId! },
    update: {},
  });
  await prisma.follow.deleteMany({ where: { followerId: viewerId, ngoId: input.ngoId! } });
}

export async function unblockTarget(
  prisma: PrismaClient,
  viewerId: string,
  input: { userId?: string; ngoId?: string; nurseryId?: string },
) {
  await prisma.block.deleteMany({
    where: {
      blockerId: viewerId,
      ...(input.userId ? { blockedUserId: input.userId } : {}),
      ...(input.ngoId ? { blockedNgoId: input.ngoId } : {}),
      ...(input.nurseryId ? { blockedNurseryId: input.nurseryId } : {}),
    },
  });
}
