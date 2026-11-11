import { PrismaClient } from '@arth/db';
import { estimateTreeImpact, countsTowardImpact, round1 } from '../lib/treeImpact';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { cursorArgs, toCursorPage, type CursorQuery } from '../utils/pagination';
import { sendPush } from './push.service';
import { requireAdmin, requireMember, serializeGroup } from './plantingGroup.service';

/**
 * Everything a group dashboard shows: totals, level, streak, achievements, challenge progress,
 * leaderboards and analytics. Every figure is worked out here from the real records (trees,
 * donations, adoptions, members), never taken from the phone, and nothing is stored that could
 * drift from them.
 *
 * Only trees that were not rejected and not deleted count, matching how an individual's totals work.
 */

const COUNTED_TREE = { isDeleted: false, aiVerificationStatus: { in: ['verified', 'unverified'] as ('verified' | 'unverified')[] } };

const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);

// ---------- levels ----------

export const GROUP_LEVELS = [
  { level: 1, name: 'Seedlings', minTrees: 0 },
  { level: 2, name: 'Sprouts', minTrees: 5 },
  { level: 3, name: 'Saplings', minTrees: 15 },
  { level: 4, name: 'Grove', minTrees: 40 },
  { level: 5, name: 'Woodland', minTrees: 100 },
  { level: 6, name: 'Forest', minTrees: 250 },
  { level: 7, name: 'Canopy', minTrees: 500 },
  { level: 8, name: 'Old Growth', minTrees: 1000 },
] as const;

export function levelForTrees(trees: number) {
  let current: (typeof GROUP_LEVELS)[number] = GROUP_LEVELS[0];
  for (const l of GROUP_LEVELS) if (trees >= l.minTrees) current = l;
  const next = GROUP_LEVELS.find((l) => l.minTrees > trees) ?? null;
  return {
    level: current.level,
    name: current.name,
    treesToNext: next ? next.minTrees - trees : 0,
    nextName: next?.name ?? null,
    progress: next ? (trees - current.minTrees) / (next.minTrees - current.minTrees) : 1,
  };
}

// ---------- streak ----------

/** Consecutive days with at least one planting. The current run stays alive through "yesterday". */
export function computeStreak(plantedAt: Date[], now = new Date()) {
  const days = [...new Set(plantedAt.map(dayKey))].sort();
  if (days.length === 0) return { current: 0, max: 0 };

  let max = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const gap = (Date.parse(days[i]) - Date.parse(days[i - 1])) / DAY_MS;
    run = gap === 1 ? run + 1 : 1;
    if (run > max) max = run;
  }

  const gapToToday = (Date.parse(dayKey(now)) - Date.parse(days[days.length - 1])) / DAY_MS;
  return { current: gapToToday <= 1 ? run : 0, max };
}

// ---------- shared load ----------

async function loadGroupTrees(prisma: PrismaClient, groupId: string) {
  return prisma.tree.findMany({
    where: { plantingGroupId: groupId, ...COUNTED_TREE },
    select: { id: true, userId: true, plantedAt: true, healthStatus: true, species: { select: { key: true, commonName: true } } },
    orderBy: { plantedAt: 'asc' },
  });
}

function challengeStatus(c: { startsAt: Date; endsAt: Date }, progress: number, goal: number, now: Date) {
  if (progress >= goal) return 'completed' as const;
  if (now < c.startsAt) return 'upcoming' as const;
  if (now > c.endsAt) return 'ended' as const;
  return 'active' as const;
}

async function buildStats(prisma: PrismaClient, groupId: string, now = new Date()) {
  const [trees, memberCount, adoptions, donated, challenges] = await Promise.all([
    loadGroupTrees(prisma, groupId),
    prisma.plantingGroupMember.count({ where: { groupId } }),
    prisma.adoption.count({ where: { plantingGroupId: groupId } }),
    prisma.donation.aggregate({ where: { plantingGroupId: groupId, status: 'succeeded' }, _sum: { amountCents: true } }),
    prisma.plantingGroupChallenge.findMany({ where: { groupId }, orderBy: { startsAt: 'desc' } }),
  ]);

  let co2 = 0;
  let co2Next = 0;
  for (const t of trees) {
    if (!countsTowardImpact(t.healthStatus)) continue;
    const e = estimateTreeImpact({ key: t.species.key, name: t.species.commonName }, t.plantedAt, now);
    co2 += e.co2Kg;
    co2Next += e.co2NextYearKg ?? 0;
  }

  const streak = computeStreak(trees.map((t) => t.plantedAt), now);
  const challengeRows = challenges.map((c) => {
    const progress = trees.filter((t) => t.plantedAt >= c.startsAt && t.plantedAt <= c.endsAt).length;
    return { ...c, progress, status: challengeStatus(c, progress, c.goalTotal, now) };
  });

  return {
    trees,
    challengeRows,
    stats: {
      memberCount,
      treesPlanted: trees.length,
      co2Kg: round1(co2),
      co2NextYearKg: round1(co2Next),
      adoptions,
      donatedCents: donated._sum.amountCents ?? 0,
      streakCurrent: streak.current,
      streakMax: streak.max,
      challengesCompleted: challengeRows.filter((c) => c.status === 'completed').length,
      ...levelForTrees(trees.length),
    },
  };
}

// ---------- stats and achievements ----------

export async function getGroupStats(prisma: PrismaClient, viewerId: string, groupId: string) {
  await requireMember(prisma, groupId, viewerId);
  return (await buildStats(prisma, groupId)).stats;
}

const ACHIEVEMENTS = [
  { key: 'first_roots', title: 'First Roots', description: 'Plant your first tree together', icon: '🌱', target: 1, value: (s: Stats) => s.treesPlanted },
  { key: 'grove_builders', title: 'Grove Builders', description: 'Plant 25 trees together', icon: '🌳', target: 25, value: (s: Stats) => s.treesPlanted },
  { key: 'forest_founders', title: 'Forest Founders', description: 'Plant 100 trees together', icon: '🌲', target: 100, value: (s: Stats) => s.treesPlanted },
  { key: 'full_house', title: 'Full House', description: 'Grow the group to 10 members', icon: '👥', target: 10, value: (s: Stats) => s.memberCount },
  { key: 'week_strong', title: 'Week Strong', description: 'Plant on 7 days in a row', icon: '🔥', target: 7, value: (s: Stats) => s.streakMax },
  { key: 'month_strong', title: 'Month Strong', description: 'Plant on 30 days in a row', icon: '⭐', target: 30, value: (s: Stats) => s.streakMax },
  { key: 'carbon_crew', title: 'Carbon Crew', description: 'Absorb 100 kg of CO₂ together', icon: '🌍', target: 100, value: (s: Stats) => s.co2Kg },
  { key: 'challenge_champions', title: 'Challenge Champions', description: 'Complete a group challenge', icon: '🏆', target: 1, value: (s: Stats) => s.challengesCompleted },
  { key: 'tree_parents', title: 'Tree Parents', description: 'Adopt a tree as a group', icon: '🤝', target: 1, value: (s: Stats) => s.adoptions },
  { key: 'givers', title: 'Givers', description: 'Make a donation as a group', icon: '💚', target: 1, value: (s: Stats) => (s.donatedCents > 0 ? 1 : 0) },
];
type Stats = Awaited<ReturnType<typeof buildStats>>['stats'];

export async function getGroupAchievements(prisma: PrismaClient, viewerId: string, groupId: string) {
  await requireMember(prisma, groupId, viewerId);
  const { stats } = await buildStats(prisma, groupId);
  return ACHIEVEMENTS.map((a) => {
    const progress = Math.min(a.value(stats), a.target);
    return { key: a.key, title: a.title, description: a.description, icon: a.icon, target: a.target, progress, unlocked: progress >= a.target };
  });
}

// ---------- challenges ----------

export async function listChallenges(prisma: PrismaClient, viewerId: string, groupId: string) {
  await requireMember(prisma, groupId, viewerId);
  const { challengeRows } = await buildStats(prisma, groupId);
  return challengeRows.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    goalTotal: c.goalTotal,
    startsAt: c.startsAt,
    endsAt: c.endsAt,
    progress: c.progress,
    status: c.status,
  }));
}

export async function createChallenge(
  prisma: PrismaClient,
  actorId: string,
  groupId: string,
  input: { title: string; description: string; goalTotal: number; startsAt: Date; endsAt: Date },
) {
  await requireAdmin(prisma, groupId, actorId);
  if (input.endsAt <= input.startsAt) throw new BadRequestError('The end date must be after the start date');
  if (input.endsAt.getTime() - input.startsAt.getTime() > 366 * DAY_MS) throw new BadRequestError('A challenge can last at most a year');
  if (input.endsAt.getTime() < Date.now()) throw new BadRequestError('The end date must be in the future');

  const open = await prisma.plantingGroupChallenge.count({ where: { groupId, endsAt: { gt: new Date() } } });
  if (open >= 10) throw new BadRequestError('A group can have up to 10 open challenges. Delete one first.');

  const challenge = await prisma.$transaction(async (tx) => {
    const created = await tx.plantingGroupChallenge.create({ data: { groupId, createdById: actorId, ...input } });
    await tx.plantingGroupActivity.create({ data: { groupId, actorId, type: 'challenge_created', data: { title: input.title } } });
    return created;
  });

  // One batched write for every member, rather than one request-blocking notify() each.
  const [group, members] = await Promise.all([
    prisma.plantingGroup.findUnique({ where: { id: groupId }, select: { name: true } }),
    prisma.plantingGroupMember.findMany({ where: { groupId, userId: { not: actorId } }, select: { userId: true } }),
  ]);
  if (members.length > 0) {
    await prisma.notification
      .createMany({
        data: members.map((m) => ({
          userId: m.userId,
          type: 'group_challenge_created' as const,
          actorUserId: actorId,
          data: { groupId, groupName: group?.name ?? '', title: input.title },
        })),
      })
      .catch((e) => console.warn('[group] could not record challenge notifications:', e));
    void sendPush(prisma, members.map((m) => m.userId), {
      title: group?.name ?? 'Group challenge',
      body: `New challenge: ${input.title}`,
      data: { type: 'group_challenge_created', groupId },
    });
  }
  return challenge;
}

export async function deleteChallenge(prisma: PrismaClient, actorId: string, groupId: string, challengeId: string) {
  await requireAdmin(prisma, groupId, actorId);
  // Scoped to this group, so an admin of one group cannot delete another group's challenge.
  const result = await prisma.plantingGroupChallenge.deleteMany({ where: { id: challengeId, groupId } });
  if (result.count === 0) throw new NotFoundError('Challenge not found');
}

// ---------- lists ----------

export async function listActivity(prisma: PrismaClient, viewerId: string, groupId: string, query: CursorQuery) {
  await requireMember(prisma, groupId, viewerId);
  const { take, args } = cursorArgs(query, 30);
  const rows = await prisma.plantingGroupActivity.findMany({
    where: { groupId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { actor: { select: { id: true, name: true, handle: true, avatarEmoji: true } } },
    ...args,
  });
  return toCursorPage(rows, take, (r) => ({ id: r.id, type: r.type, createdAt: r.createdAt, data: r.data, actor: r.actor }));
}

export async function listGroupTrees(prisma: PrismaClient, viewerId: string, groupId: string, query: CursorQuery) {
  await requireMember(prisma, groupId, viewerId);
  const { take, args } = cursorArgs(query, 50, 100);
  const rows = await prisma.tree.findMany({
    where: { plantingGroupId: groupId, isDeleted: false },
    orderBy: [{ plantedAt: 'desc' }, { id: 'desc' }],
    include: {
      species: { select: { commonName: true, emoji: true } },
      user: { select: { id: true, name: true, handle: true, avatarEmoji: true } },
    },
    ...args,
  });
  return toCursorPage(rows, take, (t) => ({
    id: t.id,
    publicId: t.publicId,
    nickname: t.nickname,
    species: t.species,
    lat: t.lat,
    lng: t.lng,
    locationLabel: t.locationLabel,
    photoUrl: t.photoUrl,
    plantedAt: t.plantedAt,
    healthStatus: t.healthStatus,
    verification: t.aiVerificationStatus,
    plantedBy: t.user,
  }));
}

export async function listGroupAdoptions(prisma: PrismaClient, viewerId: string, groupId: string, query: CursorQuery) {
  await requireMember(prisma, groupId, viewerId);
  const { take, args } = cursorArgs(query, 30);
  const rows = await prisma.adoption.findMany({
    where: { plantingGroupId: groupId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      adoptableTree: { select: { id: true, nickname: true, speciesName: true, photoUrl: true, ngo: { select: { orgName: true } } } },
      user: { select: { id: true, name: true, handle: true } },
    },
    ...args,
  });
  return toCursorPage(rows, take, (a) => ({
    id: a.id,
    createdAt: a.createdAt,
    tree: { id: a.adoptableTree.id, nickname: a.adoptableTree.nickname, speciesName: a.adoptableTree.speciesName, photoUrl: a.adoptableTree.photoUrl, ngoName: a.adoptableTree.ngo.orgName },
    adoptedBy: a.user,
  }));
}

/** Receipts for the group's donations. Never includes the donor's PAN. */
export async function listGroupDonations(prisma: PrismaClient, viewerId: string, groupId: string, query: CursorQuery) {
  await requireMember(prisma, groupId, viewerId);
  const { take, args } = cursorArgs(query, 30);
  const rows = await prisma.donation.findMany({
    where: { plantingGroupId: groupId, status: 'succeeded' },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      campaign: { select: { id: true, title: true, ngo: { select: { orgName: true } } } },
      user: { select: { id: true, name: true, handle: true } },
    },
    ...args,
  });
  return toCursorPage(rows, take, (d) => ({
    id: d.id,
    amountCents: d.amountCents,
    currency: d.currency,
    receiptNumber: d.receiptNumber,
    createdAt: d.createdAt,
    campaign: { id: d.campaign.id, title: d.campaign.title, ngoName: d.campaign.ngo.orgName },
    donatedBy: d.user,
  }));
}

// ---------- leaderboards ----------

/** Groups ranked by trees planted. Open to any signed-in person: names, logos and totals only. */
export async function groupsLeaderboard(prisma: PrismaClient, viewerId: string) {
  const grouped = await prisma.tree.groupBy({
    by: ['plantingGroupId'],
    where: { plantingGroupId: { not: null }, ...COUNTED_TREE },
    _count: { _all: true },
    orderBy: { _count: { plantingGroupId: 'desc' } },
    take: 50,
  });
  const ids = grouped.map((g) => g.plantingGroupId as string);
  if (ids.length === 0) return [];

  const [groups, mine] = await Promise.all([
    prisma.plantingGroup.findMany({ where: { id: { in: ids } }, include: { _count: { select: { members: true } } } }),
    prisma.plantingGroupMember.findMany({ where: { userId: viewerId, groupId: { in: ids } }, select: { groupId: true } }),
  ]);
  const byId = new Map(groups.map((g) => [g.id, g]));
  const mineIds = new Set(mine.map((m) => m.groupId));

  return grouped.flatMap((g, i) => {
    const group = byId.get(g.plantingGroupId as string);
    if (!group) return [];
    return [{ rank: i + 1, treesPlanted: g._count._all, isMine: mineIds.has(group.id), group: serializeGroup(group) }];
  });
}

/** Who has planted the most for this group (members only). Members with no planting yet are listed last. */
export async function contributorsLeaderboard(prisma: PrismaClient, viewerId: string, groupId: string) {
  await requireMember(prisma, groupId, viewerId);
  const [counts, members] = await Promise.all([
    prisma.tree.groupBy({ by: ['userId'], where: { plantingGroupId: groupId, ...COUNTED_TREE }, _count: { _all: true } }),
    prisma.plantingGroupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, handle: true, avatarEmoji: true, avatarUrl: true } } },
    }),
  ]);
  const countBy = new Map(counts.map((c) => [c.userId, c._count._all]));
  return members
    .map((m) => ({ user: m.user, role: m.role, treesPlanted: countBy.get(m.userId) ?? 0 }))
    .sort((a, b) => b.treesPlanted - a.treesPlanted || a.user.name.localeCompare(b.user.name))
    .map((row, i) => ({ rank: i + 1, ...row }));
}

// ---------- analytics ----------

function weekStart(d: Date) {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const offset = (day.getUTCDay() + 6) % 7; // Monday
  return new Date(day.getTime() - offset * DAY_MS);
}

export async function getAnalytics(prisma: PrismaClient, viewerId: string, groupId: string, weeks: number) {
  await requireMember(prisma, groupId, viewerId);
  const n = Math.min(Math.max(Math.floor(weeks) || 8, 1), 26);
  const now = new Date();
  const thisWeek = weekStart(now);
  const from = new Date(thisWeek.getTime() - (n - 1) * 7 * DAY_MS);

  const [{ trees, stats, challengeRows }, joins, donations] = await Promise.all([
    buildStats(prisma, groupId, now).then((r) => ({ trees: r.trees, stats: r.stats, challengeRows: r.challengeRows })),
    prisma.plantingGroupMember.findMany({ where: { groupId, joinedAt: { gte: from } }, select: { joinedAt: true } }),
    prisma.donation.findMany({ where: { plantingGroupId: groupId, status: 'succeeded', createdAt: { gte: from } }, select: { amountCents: true, createdAt: true } }),
  ]);

  const buckets = Array.from({ length: n }, (_, i) => ({ weekStart: new Date(from.getTime() + i * 7 * DAY_MS), trees: 0, newMembers: 0, donatedCents: 0 }));
  const slot = (d: Date) => Math.floor((weekStart(d).getTime() - from.getTime()) / (7 * DAY_MS));
  for (const t of trees) {
    const i = slot(t.plantedAt);
    if (i >= 0 && i < n) buckets[i].trees += 1;
  }
  for (const j of joins) {
    const i = slot(j.joinedAt);
    if (i >= 0 && i < n) buckets[i].newMembers += 1;
  }
  for (const d of donations) {
    const i = slot(d.createdAt);
    if (i >= 0 && i < n) buckets[i].donatedCents += d.amountCents;
  }

  const activePlanters = new Set(trees.filter((t) => t.plantedAt >= from).map((t) => t.userId)).size;
  return {
    weeks: n,
    series: buckets,
    totals: {
      treesInPeriod: buckets.reduce((s, b) => s + b.trees, 0),
      newMembersInPeriod: buckets.reduce((s, b) => s + b.newMembers, 0),
      donatedCentsInPeriod: buckets.reduce((s, b) => s + b.donatedCents, 0),
      activePlanters,
      memberCount: stats.memberCount,
      participationRate: stats.memberCount > 0 ? Math.round((activePlanters / stats.memberCount) * 100) : 0,
    },
    challenges: { open: challengeRows.filter((c) => c.status === 'active' || c.status === 'upcoming').length, completed: stats.challengesCompleted },
    overall: stats,
  };
}
