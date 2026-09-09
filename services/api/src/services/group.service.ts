import { GroupMemberRole, PrismaClient } from '@plant/db';
import { generateInviteCode } from '../utils/inviteCode';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';

interface UpdateProfileInput {
  groupName?: string;
  groupType?: 'family' | 'school' | 'club' | 'other';
  description?: string;
  logoUrl?: string;
  city?: string;
  handle?: string;
  avatarEmoji?: string;
}

interface GroupLeaderboardRow {
  id: string;
  group_name: string;
  logo_url: string | null;
  trees_planted: bigint | number;
  rank: bigint | number;
}

interface GroupRankRow {
  rank: bigint | number;
}

interface CreateChallengeInput {
  title: string;
  description: string;
  goalType: 'trees_planted_count' | 'cities_count' | 'streak_days' | 'rare_species_count';
  goalTotal: number;
  startsAt: Date;
  endsAt: Date;
}

// The account created at group registration (role 'group') is the one and only
// "manager" login for the group — GroupMember.role co_admin/member is a display
// tier for the member list, not a second set of dashboard credentials, since
// members join with their own individual ('user') accounts.
export async function requireOwnGroup(prisma: PrismaClient, userId: string) {
  const group = await prisma.groupProfile.findUnique({ where: { userId } });
  if (!group) throw new NotFoundError('Group profile not found');
  return group;
}

export async function getOwnProfile(prisma: PrismaClient, userId: string) {
  return requireOwnGroup(prisma, userId);
}

export async function updateOwnProfile(prisma: PrismaClient, userId: string, input: UpdateProfileInput) {
  const group = await requireOwnGroup(prisma, userId);

  if (input.handle) {
    const existing = await prisma.groupProfile.findUnique({ where: { handle: input.handle } });
    if (existing && existing.id !== group.id) throw new ConflictError('Handle is already taken');
  }

  return prisma.groupProfile.update({ where: { id: group.id }, data: input });
}

export async function regenerateInviteCode(prisma: PrismaClient, userId: string) {
  const group = await requireOwnGroup(prisma, userId);
  return prisma.groupProfile.update({ where: { id: group.id }, data: { inviteCode: generateInviteCode() } });
}

export async function listMembers(prisma: PrismaClient, userId: string) {
  const group = await requireOwnGroup(prisma, userId);
  return prisma.groupMember.findMany({
    where: { groupId: group.id },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    include: { user: { select: { id: true, name: true, handle: true, avatarEmoji: true, treesPlantedCount: true, xp: true } } },
  });
}

export async function setMemberRole(prisma: PrismaClient, userId: string, memberUserId: string, role: GroupMemberRole) {
  const group = await requireOwnGroup(prisma, userId);
  if (memberUserId === userId) throw new BadRequestError("You can't change your own role");

  const result = await prisma.groupMember.updateMany({
    where: { groupId: group.id, userId: memberUserId },
    data: { role },
  });
  if (result.count === 0) throw new NotFoundError('Member not found');
}

export async function removeMember(prisma: PrismaClient, userId: string, memberUserId: string) {
  const group = await requireOwnGroup(prisma, userId);
  if (memberUserId === userId) throw new BadRequestError("The owner can't remove themself — transfer or delete the group instead");

  const result = await prisma.groupMember.deleteMany({ where: { groupId: group.id, userId: memberUserId } });
  if (result.count === 0) throw new NotFoundError('Member not found');
}

// Same 500-XP-per-level formula as services/api/src/services/xp.service.ts's individual User
// leveling — a group has no stored level of its own, this is a display-only figure derived from
// the same summed xpTotal below.
const XP_PER_LEVEL = 500;

export async function getOwnStats(prisma: PrismaClient, userId: string) {
  const group = await requireOwnGroup(prisma, userId);

  const members = await prisma.groupMember.findMany({
    where: { groupId: group.id },
    select: { user: { select: { treesPlantedCount: true, xp: true, totalCo2Absorbed: true } } },
  });

  const xpTotal = members.reduce((sum, m) => sum + m.user.xp, 0);

  return {
    memberCount: members.length,
    treesPlantedTotal: members.reduce((sum, m) => sum + m.user.treesPlantedCount, 0),
    xpTotal,
    level: Math.floor(xpTotal / XP_PER_LEVEL) + 1,
    co2AbsorbedTotal: members.reduce((sum, m) => sum + Number(m.user.totalCo2Absorbed), 0),
  };
}

// Ranks groups by their members' combined trees-planted count — mirrors the NGO leaderboard's
// RANK() OVER pattern (services/api/src/routes/ngo.routes.ts), joined through group_members since
// a group has no stored aggregate tree count of its own.
export async function getLeaderboard(prisma: PrismaClient, groupId: string, limit: number) {
  const rows = await prisma.$queryRaw<GroupLeaderboardRow[]>`
    SELECT g.id, g.group_name, g.logo_url, COALESCE(SUM(u.trees_planted_count), 0) AS trees_planted,
           RANK() OVER (ORDER BY COALESCE(SUM(u.trees_planted_count), 0) DESC) AS rank
    FROM group_profiles g
    LEFT JOIN group_members gm ON gm.group_id = g.id
    LEFT JOIN users u ON u.id = gm.user_id
    WHERE g.status = 'active'
    GROUP BY g.id
    ORDER BY trees_planted DESC
    LIMIT ${limit};
  `;

  const myRankRows = await prisma.$queryRaw<GroupRankRow[]>`
    SELECT rank FROM (
      SELECT g.id, RANK() OVER (ORDER BY COALESCE(SUM(u.trees_planted_count), 0) DESC) AS rank
      FROM group_profiles g
      LEFT JOIN group_members gm ON gm.group_id = g.id
      LEFT JOIN users u ON u.id = gm.user_id
      WHERE g.status = 'active'
      GROUP BY g.id
    ) ranked WHERE id = ${groupId};
  `;

  const totalGroups = await prisma.groupProfile.count({ where: { status: 'active' } });

  return {
    entries: rows.map((row) => ({
      rank: Number(row.rank),
      id: row.id,
      groupName: row.group_name,
      logoUrl: row.logo_url,
      treesPlanted: Number(row.trees_planted),
      isGroup: row.id === groupId,
    })),
    totalGroups,
    myRank: myRankRows[0] ? Number(myRankRows[0].rank) : null,
  };
}

// ---------- Member-facing (any authenticated user, not just the group's own login) ----------

export async function listMyMemberships(prisma: PrismaClient, userId: string) {
  return prisma.groupMember.findMany({
    where: { userId },
    orderBy: { joinedAt: 'desc' },
    include: { group: true },
  });
}

export async function joinByInviteCode(prisma: PrismaClient, userId: string, inviteCode: string) {
  const group = await prisma.groupProfile.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } });
  if (!group || group.status !== 'active') throw new NotFoundError('Invalid invite code');

  const existing = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: group.id, userId } } });
  if (existing) throw new ConflictError("You're already a member of this group");

  await prisma.groupMember.create({ data: { groupId: group.id, userId, role: 'member' } });
  return group;
}

export async function leaveGroup(prisma: PrismaClient, userId: string, groupId: string) {
  const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!membership) throw new NotFoundError('You are not a member of this group');
  if (membership.role === 'owner') throw new ForbiddenError("The group's owner can't leave — suspend or hand over the account instead");

  await prisma.groupMember.delete({ where: { id: membership.id } });
}

async function requireMembership(prisma: PrismaClient, userId: string, groupId: string) {
  const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!membership) throw new ForbiddenError("You're not a member of this group");
  return membership;
}

export async function getGroupForMember(prisma: PrismaClient, userId: string, groupId: string) {
  await requireMembership(prisma, userId, groupId);
  const group = await prisma.groupProfile.findUnique({ where: { id: groupId } });
  if (!group) throw new NotFoundError('Group not found');
  return group;
}

/** No membership check — for viewing any active group's profile from outside it. */
export async function getPublicGroupProfile(prisma: PrismaClient, viewerId: string, groupId: string) {
  const [group, memberCount, membership] = await Promise.all([
    prisma.groupProfile.findFirst({ where: { id: groupId, status: 'active' } }),
    prisma.groupMember.count({ where: { groupId } }),
    prisma.groupMember.findUnique({ where: { groupId_userId: { groupId, userId: viewerId } } }),
  ]);
  if (!group) throw new NotFoundError('Group not found');

  return {
    id: group.id,
    groupName: group.groupName,
    groupType: group.groupType,
    description: group.description,
    logoUrl: group.logoUrl,
    city: group.city,
    handle: group.handle,
    avatarEmoji: group.avatarEmoji,
    streakCurrent: group.streakCurrent,
    badgesCount: group.badgesCount,
    memberCount,
    isMember: !!membership,
  };
}

// ---------- Challenges ----------

export async function createChallenge(prisma: PrismaClient, userId: string, input: CreateChallengeInput) {
  const group = await requireOwnGroup(prisma, userId);
  if (input.endsAt <= input.startsAt) throw new BadRequestError('endsAt must be after startsAt');

  return prisma.groupChallenge.create({
    data: {
      groupId: group.id,
      createdById: userId,
      title: input.title,
      description: input.description,
      goalType: input.goalType,
      goalTotal: input.goalTotal,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
    },
  });
}

// Progress is computed at read time from real planting activity rather than
// incrementally tracked — a group challenge only ever measures
// trees_planted_count today (the only goal type with a direct, cheap query;
// the others reuse ChallengeGoalType for future parity with the individual
// Challenge model but aren't computed yet).
export async function listChallenges(prisma: PrismaClient, groupId: string) {
  const challenges = await prisma.groupChallenge.findMany({
    where: { groupId },
    orderBy: { startsAt: 'desc' },
    include: { participants: true },
  });

  const memberIds = (await prisma.groupMember.findMany({ where: { groupId }, select: { userId: true } })).map((m) => m.userId);

  return Promise.all(
    challenges.map(async (challenge) => {
      let progress = 0;
      if (challenge.goalType === 'trees_planted_count' && memberIds.length > 0) {
        progress = await prisma.tree.count({
          where: {
            userId: { in: memberIds },
            isDeleted: false,
            plantedAt: { gte: challenge.startsAt, lte: challenge.endsAt },
          },
        });
      }
      return { ...challenge, progress, participantCount: challenge.participants.length };
    })
  );
}

export async function joinChallenge(prisma: PrismaClient, userId: string, challengeId: string) {
  const challenge = await prisma.groupChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new NotFoundError('Challenge not found');
  await requireMembership(prisma, userId, challenge.groupId);

  const existing = await prisma.groupChallengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
  });
  if (existing) return existing;

  return prisma.groupChallengeParticipant.create({ data: { challengeId, userId } });
}
