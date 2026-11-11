import { Prisma, PrismaClient } from '@arth/db';
import { MAX_GROUPS_CREATED_PER_USER, MAX_GROUP_MEMBERS } from '../constants/plantingGroups';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { cursorArgs, toCursorPage, type CursorQuery } from '../utils/pagination';
import { getBlockedIds } from './block.service';
import { notify } from './notification.service';
import { deleteUploadedFiles } from './upload.service';

/**
 * Planting groups.
 *
 * A group is an entity owned by users, not a login: people act for it through their own account,
 * and the server derives what they may do from their membership row. Nothing the phone sends
 * ("I am an admin") is trusted.
 *
 * Capacity (MAX_GROUP_MEMBERS) and the "always keep one admin" rule are checked inside a
 * transaction that first locks the group row, so two approvals or two demotions arriving together
 * cannot both pass the check and break the rule.
 */

type Tx = Prisma.TransactionClient;

const USER_BRIEF = { id: true, name: true, handle: true, avatarEmoji: true, avatarUrl: true } as const;

// ---------- helpers ----------

/** Only individual accounts take part in groups (not NGO, nursery, corporate, admin ...). */
async function assertIndividual(prisma: Tx, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false, isBlocked: false },
    select: { id: true, role: true },
  });
  if (!user) throw new NotFoundError('User not found');
  if (user.role !== 'user') throw new ForbiddenError('Only individual accounts can use groups');
  return user;
}

/** Takes a row lock on the group for the rest of the transaction. */
async function lockGroup(tx: Tx, groupId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM planting_groups WHERE id = ${groupId} FOR UPDATE`;
  if (rows.length === 0) throw new NotFoundError('Group not found');
}

async function requireMember(prisma: Tx, groupId: string, userId: string) {
  const membership = await prisma.plantingGroupMember.findFirst({ where: { groupId, userId } });
  // A non-member learns nothing about member-only data, so this reads as "not found".
  if (!membership) throw new NotFoundError('Group not found');
  return membership;
}

async function requireAdmin(prisma: Tx, groupId: string, userId: string) {
  const membership = await requireMember(prisma, groupId, userId);
  if (membership.role !== 'admin') throw new ForbiddenError('Only group admins can do this');
  return membership;
}

async function assertHasRoom(tx: Tx, groupId: string) {
  const count = await tx.plantingGroupMember.count({ where: { groupId } });
  if (count >= MAX_GROUP_MEMBERS) throw new ConflictError(`This group is full (${MAX_GROUP_MEMBERS} members)`);
}

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

async function adminIds(prisma: Tx, groupId: string) {
  const admins = await prisma.plantingGroupMember.findMany({ where: { groupId, role: 'admin' }, select: { userId: true } });
  return admins.map((a) => a.userId);
}

export function serializeGroup(group: any) {
  return {
    id: group.id,
    name: group.name,
    handle: group.handle,
    groupType: group.groupType,
    description: group.description,
    logoUrl: group.logoUrl,
    city: group.city,
    memberCount: group._count?.members ?? 0,
    maxMembers: MAX_GROUP_MEMBERS,
    createdAt: group.createdAt,
  };
}

// ---------- groups ----------

export async function createGroup(
  prisma: PrismaClient,
  userId: string,
  input: { name: string; handle: string; groupType: 'family' | 'school' | 'club' | 'other'; description: string; city?: string | null },
) {
  await assertIndividual(prisma, userId);

  try {
    return await prisma.$transaction(async (tx) => {
      // Serialise one person's creations so two requests at once cannot both slip under the cap.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`planting-group-create:${userId}`}))`;
      const created = await tx.plantingGroup.count({ where: { createdById: userId } });
      if (created >= MAX_GROUPS_CREATED_PER_USER) {
        throw new ConflictError(`You can create up to ${MAX_GROUPS_CREATED_PER_USER} groups`);
      }

      const group = await tx.plantingGroup.create({
        data: {
          createdById: userId,
          name: input.name,
          handle: input.handle,
          groupType: input.groupType,
          description: input.description,
          city: input.city || null,
          members: { create: { userId, role: 'admin' } },
        },
        include: { _count: { select: { members: true } } },
      });
      return group;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError('That group handle is already taken');
    throw error;
  }
}

export async function listMyGroups(prisma: PrismaClient, userId: string) {
  const memberships = await prisma.plantingGroupMember.findMany({
    where: { userId },
    orderBy: [{ joinedAt: 'desc' }, { id: 'desc' }],
    include: { group: { include: { _count: { select: { members: true } } } } },
  });
  return memberships.map((m) => ({ ...serializeGroup(m.group), myRole: m.role, joinedAt: m.joinedAt }));
}

export async function searchGroups(prisma: PrismaClient, q: string) {
  const groups = await prisma.plantingGroup.findMany({
    where: {
      OR: [{ name: { contains: q, mode: 'insensitive' } }, { handle: { contains: q.toLowerCase() } }],
    },
    orderBy: [{ name: 'asc' }, { id: 'asc' }],
    take: 20,
    include: { _count: { select: { members: true } } },
  });
  return groups.map(serializeGroup);
}

export async function getGroup(prisma: PrismaClient, viewerId: string, groupId: string) {
  const group = await prisma.plantingGroup.findUnique({
    where: { id: groupId },
    include: { _count: { select: { members: true } } },
  });
  if (!group) throw new NotFoundError('Group not found');

  const [membership, request] = await Promise.all([
    prisma.plantingGroupMember.findFirst({ where: { groupId, userId: viewerId }, select: { role: true } }),
    prisma.plantingGroupRequest.findFirst({
      where: { groupId, userId: viewerId, status: 'pending' },
      select: { id: true, kind: true },
    }),
  ]);

  return {
    ...serializeGroup(group),
    viewer: {
      role: membership?.role ?? null,
      pendingRequest: request ? { id: request.id, kind: request.kind } : null,
      isCreator: group.createdById === viewerId,
    },
  };
}

/** Lets the route reject a non-admin before any uploaded file is written to disk. */
export async function assertAdminForUpload(prisma: PrismaClient, groupId: string, userId: string) {
  await requireAdmin(prisma, groupId, userId);
}

export async function updateGroup(
  prisma: PrismaClient,
  viewerId: string,
  groupId: string,
  input: { name?: string; groupType?: 'family' | 'school' | 'club' | 'other'; description?: string; city?: string | null; logoUrl?: string },
) {
  await requireAdmin(prisma, groupId, viewerId);

  const previous = input.logoUrl ? await prisma.plantingGroup.findUnique({ where: { id: groupId }, select: { logoUrl: true } }) : null;

  const group = await prisma.plantingGroup.update({
    where: { id: groupId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.groupType !== undefined ? { groupType: input.groupType } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.city !== undefined ? { city: input.city || null } : {}),
      ...(input.logoUrl ? { logoUrl: input.logoUrl } : {}),
    },
    include: { _count: { select: { members: true } } },
  });

  if (previous?.logoUrl) await deleteUploadedFiles([previous.logoUrl]);
  return group;
}

/** Only the founder can delete the group. Members, requests and invitations go with it. */
export async function deleteGroup(prisma: PrismaClient, viewerId: string, groupId: string) {
  const group = await prisma.plantingGroup.findFirst({ where: { id: groupId, createdById: viewerId } });
  if (!group) {
    // Distinguish "not yours" from "doesn't exist" only for members, who can already see the group.
    const membership = await prisma.plantingGroupMember.findFirst({ where: { groupId, userId: viewerId } });
    if (membership) throw new ForbiddenError('Only the person who created the group can delete it');
    throw new NotFoundError('Group not found');
  }
  await prisma.plantingGroup.delete({ where: { id: groupId } });
  await deleteUploadedFiles([group.logoUrl]);
}

// ---------- members ----------

export async function listMembers(prisma: PrismaClient, viewerId: string, groupId: string, query: CursorQuery) {
  await requireMember(prisma, groupId, viewerId);

  const { take, args } = cursorArgs(query, 30);
  const rows = await prisma.plantingGroupMember.findMany({
    where: { groupId },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }, { id: 'asc' }],
    include: { user: { select: USER_BRIEF } },
    ...args,
  });

  return toCursorPage(rows, take, (m) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
    user: m.user,
  }));
}

export async function setMemberRole(
  prisma: PrismaClient,
  actorId: string,
  groupId: string,
  targetUserId: string,
  role: 'admin' | 'member',
) {
  const result = await prisma.$transaction(async (tx) => {
    await lockGroup(tx, groupId);
    await requireAdmin(tx, groupId, actorId);

    const target = await tx.plantingGroupMember.findFirst({ where: { groupId, userId: targetUserId } });
    if (!target) throw new NotFoundError('That person is not in this group');
    if (target.role === role) return { changed: false, groupName: '' };

    if (target.role === 'admin' && role === 'member') {
      const admins = await tx.plantingGroupMember.count({ where: { groupId, role: 'admin' } });
      if (admins <= 1) throw new ConflictError('A group needs at least one admin. Make someone else an admin first.');
    }

    await tx.plantingGroupMember.update({ where: { id: target.id }, data: { role } });
    const group = await tx.plantingGroup.findUnique({ where: { id: groupId }, select: { name: true } });
    return { changed: true, groupName: group?.name ?? '' };
  });

  if (result.changed) {
    await notify(prisma, {
      userId: targetUserId,
      type: 'group_role_changed',
      actorUserId: actorId,
      data: { groupId, groupName: result.groupName, role },
      push: {
        title: result.groupName,
        body: role === 'admin' ? 'You are now an admin of this group.' : 'You are no longer an admin of this group.',
      },
    });
  }
  return { ok: true };
}

/**
 * Removes a member, or lets someone leave (when `targetUserId` is the caller).
 *  - An admin can remove ordinary members; to remove another admin, demote them first.
 *  - The last admin cannot leave while others remain; if they are the only member the group goes with them.
 */
export async function removeMember(prisma: PrismaClient, actorId: string, groupId: string, targetUserId: string) {
  const leaving = actorId === targetUserId;

  const outcome = await prisma.$transaction(async (tx) => {
    await lockGroup(tx, groupId);
    const actor = await requireMember(tx, groupId, actorId);

    const target = leaving ? actor : await tx.plantingGroupMember.findFirst({ where: { groupId, userId: targetUserId } });
    if (!target) throw new NotFoundError('That person is not in this group');

    if (!leaving) {
      if (actor.role !== 'admin') throw new ForbiddenError('Only group admins can remove members');
      if (target.role === 'admin') throw new ConflictError('Make this admin a regular member before removing them.');
    } else if (actor.role === 'admin') {
      const [admins, members] = await Promise.all([
        tx.plantingGroupMember.count({ where: { groupId, role: 'admin' } }),
        tx.plantingGroupMember.count({ where: { groupId } }),
      ]);
      if (admins <= 1 && members > 1) throw new ConflictError('Make someone else an admin before you leave.');
    }

    const group = await tx.plantingGroup.findUnique({ where: { id: groupId }, select: { name: true, logoUrl: true } });
    await tx.plantingGroupMember.delete({ where: { id: target.id } });

    const remaining = await tx.plantingGroupMember.count({ where: { groupId } });
    let groupDeleted = false;
    if (remaining === 0) {
      await tx.plantingGroup.delete({ where: { id: groupId } });
      groupDeleted = true;
    }
    return { groupName: group?.name ?? '', logoUrl: group?.logoUrl ?? null, groupDeleted };
  });

  if (outcome.groupDeleted) await deleteUploadedFiles([outcome.logoUrl]);

  if (!leaving) {
    await notify(prisma, {
      userId: targetUserId,
      type: 'group_member_removed',
      actorUserId: actorId,
      data: { groupId, groupName: outcome.groupName },
      push: { title: outcome.groupName, body: 'You were removed from this group.' },
    });
  }
  return { ok: true, groupDeleted: outcome.groupDeleted };
}

// ---------- join requests and invitations ----------

/** A person asks to join. A group admin approves or declines. */
export async function requestToJoin(prisma: PrismaClient, userId: string, groupId: string) {
  await assertIndividual(prisma, userId);

  const group = await prisma.plantingGroup.findUnique({ where: { id: groupId }, select: { id: true, name: true } });
  if (!group) throw new NotFoundError('Group not found');

  const already = await prisma.plantingGroupMember.findFirst({ where: { groupId, userId } });
  if (already) throw new ConflictError('You are already in this group');
  await assertHasRoom(prisma, groupId);

  const existing = await prisma.plantingGroupRequest.findFirst({ where: { groupId, userId } });
  if (existing?.status === 'pending') {
    throw new ConflictError(
      existing.kind === 'invitation' ? 'You already have an invitation to this group. Accept it instead.' : 'You have already asked to join this group',
    );
  }

  const fresh = { kind: 'join_request' as const, status: 'pending' as const, initiatedById: userId, respondedById: null, respondedAt: null, createdAt: new Date() };
  const request = existing
    ? await prisma.plantingGroupRequest.update({ where: { id: existing.id }, data: fresh })
    : await prisma.plantingGroupRequest.create({ data: { groupId, userId, ...fresh } });

  for (const adminId of await adminIds(prisma, groupId)) {
    await notify(prisma, {
      userId: adminId,
      type: 'group_join_requested',
      actorUserId: userId,
      data: { groupId, groupName: group.name, requestId: request.id },
      push: { title: group.name, body: 'Someone asked to join your group.' },
    });
  }
  return { id: request.id, status: request.status };
}

/** An admin invites a person by handle. The invitee accepts or declines. */
export async function inviteUser(prisma: PrismaClient, actorId: string, groupId: string, handle: string) {
  await requireAdmin(prisma, groupId, actorId);

  const group = await prisma.plantingGroup.findUnique({ where: { id: groupId }, select: { id: true, name: true } });
  if (!group) throw new NotFoundError('Group not found');

  const target = await prisma.user.findFirst({
    where: { handle: handle.toLowerCase(), role: 'user', isDeleted: false, isBlocked: false },
    select: { id: true },
  });
  const blocked = await getBlockedIds(prisma, actorId);
  // A missing, ineligible or blocked person all read the same, so handles cannot be probed.
  if (!target || blocked.userIds.includes(target.id)) throw new NotFoundError('No ARTH user found with that handle');
  if (target.id === actorId) throw new BadRequestError('You are already in this group');

  const already = await prisma.plantingGroupMember.findFirst({ where: { groupId, userId: target.id } });
  if (already) throw new ConflictError('That person is already in this group');
  await assertHasRoom(prisma, groupId);

  const existing = await prisma.plantingGroupRequest.findFirst({ where: { groupId, userId: target.id } });
  if (existing?.status === 'pending') {
    throw new ConflictError(
      existing.kind === 'invitation' ? 'That person has already been invited' : 'That person has already asked to join. Approve their request instead.',
    );
  }

  const fresh = { kind: 'invitation' as const, status: 'pending' as const, initiatedById: actorId, respondedById: null, respondedAt: null, createdAt: new Date() };
  const request = existing
    ? await prisma.plantingGroupRequest.update({ where: { id: existing.id }, data: fresh })
    : await prisma.plantingGroupRequest.create({ data: { groupId, userId: target.id, ...fresh } });

  await notify(prisma, {
    userId: target.id,
    type: 'group_invited',
    actorUserId: actorId,
    data: { groupId, groupName: group.name, requestId: request.id },
    push: { title: group.name, body: 'You have been invited to join this group.' },
  });
  return { id: request.id, status: request.status };
}

/** Pending items an admin needs to look at: people asking in, and invitations still unanswered. */
export async function listGroupRequests(prisma: PrismaClient, viewerId: string, groupId: string, query: CursorQuery) {
  await requireAdmin(prisma, groupId, viewerId);

  const { take, args } = cursorArgs(query, 30);
  const rows = await prisma.plantingGroupRequest.findMany({
    where: { groupId, status: 'pending' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { user: { select: USER_BRIEF } },
    ...args,
  });
  return toCursorPage(rows, take, (r) => ({ id: r.id, kind: r.kind, createdAt: r.createdAt, user: r.user }));
}

/** Admin approves or declines someone's request to join. */
export async function respondToJoinRequest(
  prisma: PrismaClient,
  actorId: string,
  groupId: string,
  requestId: string,
  decision: 'approve' | 'decline',
) {
  const result = await prisma.$transaction(async (tx) => {
    await lockGroup(tx, groupId);
    await requireAdmin(tx, groupId, actorId);

    // Scoped to this group, so an admin of one group cannot act on another group's request.
    const request = await tx.plantingGroupRequest.findFirst({ where: { id: requestId, groupId, kind: 'join_request', status: 'pending' } });
    if (!request) throw new NotFoundError('Request not found');

    if (decision === 'approve') {
      await assertHasRoom(tx, groupId);
      await tx.plantingGroupMember.upsert({
        where: { groupId_userId: { groupId, userId: request.userId } },
        create: { groupId, userId: request.userId, role: 'member' },
        update: {},
      });
    }

    await tx.plantingGroupRequest.update({
      where: { id: request.id },
      data: { status: decision === 'approve' ? 'accepted' : 'declined', respondedById: actorId, respondedAt: new Date() },
    });
    const group = await tx.plantingGroup.findUnique({ where: { id: groupId }, select: { name: true } });
    return { userId: request.userId, groupName: group?.name ?? '' };
  });

  await notify(prisma, {
    userId: result.userId,
    type: decision === 'approve' ? 'group_join_approved' : 'group_join_declined',
    actorUserId: actorId,
    data: { groupId, groupName: result.groupName },
    push: {
      title: result.groupName,
      body: decision === 'approve' ? 'You are in. Welcome to the group!' : 'Your request to join was declined.',
    },
  });
  return { ok: true };
}

/** An admin withdraws an invitation that has not been answered yet. */
export async function cancelInvitation(prisma: PrismaClient, actorId: string, groupId: string, requestId: string) {
  await requireAdmin(prisma, groupId, actorId);
  const request = await prisma.plantingGroupRequest.findFirst({ where: { id: requestId, groupId, kind: 'invitation', status: 'pending' } });
  if (!request) throw new NotFoundError('Invitation not found');
  await prisma.plantingGroupRequest.update({
    where: { id: request.id },
    data: { status: 'cancelled', respondedById: actorId, respondedAt: new Date() },
  });
  return { ok: true };
}

/** What the caller still has open: invitations to answer, and join requests waiting on an admin. */
export async function listMyRequests(prisma: PrismaClient, userId: string) {
  const rows = await prisma.plantingGroupRequest.findMany({
    where: { userId, status: 'pending' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      group: { include: { _count: { select: { members: true } } } },
      initiatedBy: { select: USER_BRIEF },
    },
  });
  const shape = (r: (typeof rows)[number]) => ({
    id: r.id,
    createdAt: r.createdAt,
    group: serializeGroup(r.group),
    invitedBy: r.kind === 'invitation' ? r.initiatedBy : null,
  });
  return {
    invitations: rows.filter((r) => r.kind === 'invitation').map(shape),
    joinRequests: rows.filter((r) => r.kind === 'join_request').map(shape),
  };
}

/** The invited person accepts or declines. Only the person the invitation is for can answer it. */
export async function respondToInvitation(prisma: PrismaClient, userId: string, requestId: string, accept: boolean) {
  await assertIndividual(prisma, userId);

  const lookup = await prisma.plantingGroupRequest.findFirst({
    where: { id: requestId, userId, kind: 'invitation', status: 'pending' },
    select: { groupId: true },
  });
  if (!lookup) throw new NotFoundError('Invitation not found');
  const groupId = lookup.groupId;

  const result = await prisma.$transaction(async (tx) => {
    await lockGroup(tx, groupId);

    // Re-read under the lock: a duplicate tap must not be able to accept twice.
    const request = await tx.plantingGroupRequest.findFirst({ where: { id: requestId, userId, kind: 'invitation', status: 'pending' } });
    if (!request) throw new NotFoundError('Invitation not found');

    if (accept) {
      await assertHasRoom(tx, groupId);
      await tx.plantingGroupMember.upsert({
        where: { groupId_userId: { groupId, userId } },
        create: { groupId, userId, role: 'member' },
        update: {},
      });
    }
    await tx.plantingGroupRequest.update({
      where: { id: request.id },
      data: { status: accept ? 'accepted' : 'declined', respondedById: userId, respondedAt: new Date() },
    });
    const group = await tx.plantingGroup.findUnique({ where: { id: groupId }, select: { name: true } });
    return { inviterId: request.initiatedById, groupName: group?.name ?? '' };
  });

  if (accept) {
    await notify(prisma, {
      userId: result.inviterId,
      type: 'group_invite_accepted',
      actorUserId: userId,
      data: { groupId, groupName: result.groupName },
      push: { title: result.groupName, body: 'Your invitation was accepted.' },
    });
  }
  return { ok: true, groupId };
}

// ---------- account deletion ----------

/**
 * Called inside the account-erasure transaction. Removes the person from every group so nothing
 * of theirs lingers, and keeps each group runnable:
 *  - if they were the last admin and others remain, the longest-standing member becomes admin;
 *  - if they were the only member, the group is deleted.
 * Returns logo files to delete once the transaction has committed.
 */
export async function leaveAllGroupsForErasure(tx: Tx, userId: string): Promise<string[]> {
  const files: string[] = [];

  await tx.plantingGroupRequest.deleteMany({ where: { OR: [{ userId }, { initiatedById: userId }] } });
  await tx.plantingGroupRequest.updateMany({ where: { respondedById: userId }, data: { respondedById: null } });

  const memberships = await tx.plantingGroupMember.findMany({ where: { userId } });
  for (const membership of memberships) {
    await lockGroup(tx, membership.groupId);
    await tx.plantingGroupMember.delete({ where: { id: membership.id } });

    const remaining = await tx.plantingGroupMember.findMany({
      where: { groupId: membership.groupId },
      orderBy: [{ joinedAt: 'asc' }, { id: 'asc' }],
    });
    if (remaining.length === 0) {
      const group = await tx.plantingGroup.findUnique({ where: { id: membership.groupId }, select: { logoUrl: true } });
      if (group?.logoUrl) files.push(group.logoUrl);
      await tx.plantingGroup.delete({ where: { id: membership.groupId } });
    } else if (!remaining.some((m) => m.role === 'admin')) {
      await tx.plantingGroupMember.update({ where: { id: remaining[0].id }, data: { role: 'admin' } });
    }
  }

  // Groups they founded but no longer belong to (they left earlier) still point at their account.
  // The row is a tombstone after erasure, so nothing personal remains; nothing more to do here.
  return files;
}
