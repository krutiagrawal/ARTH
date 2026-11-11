import { PrismaClient } from '@arth/db';
import { estimateTreeImpact, countsTowardImpact, round1 } from '../lib/treeImpact';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';
import { cursorArgs, parseTake, toCursorPage, type CursorQuery } from '../utils/pagination';
import { serializeDrive } from '../routes/drives.routes';
import { driveInclude } from './drive.service';
import { sendPush } from './push.service';
import { requireAdmin, requireMember, serializeGroup } from './plantingGroup.service';
import {
  COUNTED_TREE,
  adoptionScopeWhere,
  donationScopeWhere,
  groupXp,
  levelForXp,
  loadScope,
  rsvpScopeWhere,
  treeScopeWhere,
  visibleCoordinates,
  type GroupScope,
} from './plantingGroupScope.service';

/**
 * Everything a group's pages show: totals, level, streak, achievements, challenge progress, trees,
 * drives, adoptions, donations, the timeline, rankings and analytics.
 *
 * What counts is defined in plantingGroupScope.service.ts (work done for the group, plus what sharing
 * members do on ARTH from the day they joined). Every figure is worked out here from the real
 * records, never taken from the phone, and nothing is stored that could drift from them.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const USER_BRIEF = { id: true, name: true, handle: true, avatarEmoji: true, avatarUrl: true } as const;

// ---------- streak ----------

/** Consecutive days with at least one planting by anyone counted. The run stays alive through "yesterday". */
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

function challengeStatus(c: { startsAt: Date; endsAt: Date }, progress: number, goal: number, now: Date) {
  if (progress >= goal) return 'completed' as const;
  if (now < c.startsAt) return 'upcoming' as const;
  if (now > c.endsAt) return 'ended' as const;
  return 'active' as const;
}

// ---------- shared load ----------

async function buildStats(prisma: PrismaClient, groupId: string, now = new Date()) {
  const scope = await loadScope(prisma, groupId);
  const [trees, adoptions, donated, drives, challenges, xp, forGroupTrees] = await Promise.all([
    prisma.tree.findMany({
      where: treeScopeWhere(scope),
      select: { id: true, userId: true, plantedAt: true, healthStatus: true, species: { select: { key: true, commonName: true } } },
      orderBy: { plantedAt: 'asc' },
    }),
    prisma.adoption.count({ where: adoptionScopeWhere(scope) }),
    prisma.donation.aggregate({ where: donationScopeWhere(scope), _sum: { amountCents: true } }),
    scope.sharing.length ? prisma.driveRsvp.findMany({ where: rsvpScopeWhere(scope), select: { driveId: true }, distinct: ['driveId'] }) : Promise.resolve([]),
    prisma.plantingGroupChallenge.findMany({ where: { groupId }, orderBy: { startsAt: 'desc' } }),
    groupXp(prisma, scope),
    prisma.tree.count({ where: { plantingGroupId: groupId, ...COUNTED_TREE } }),
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
    scope,
    trees,
    challengeRows,
    stats: {
      memberCount: scope.memberCount,
      sharingCount: scope.sharing.length,
      treesPlanted: trees.length,
      treesForGroup: forGroupTrees,
      co2Kg: round1(co2),
      co2NextYearKg: round1(co2Next),
      adoptions,
      donatedCents: donated._sum.amountCents ?? 0,
      drivesJoined: drives.length,
      streakCurrent: streak.current,
      streakMax: streak.max,
      challengesCompleted: challengeRows.filter((c) => c.status === 'completed').length,
      ...levelForXp(xp),
    },
  };
}
type Stats = Awaited<ReturnType<typeof buildStats>>['stats'];

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
  { key: 'tree_parents', title: 'Tree Parents', description: 'Adopt a tree together', icon: '🤝', target: 1, value: (s: Stats) => s.adoptions },
  { key: 'givers', title: 'Givers', description: 'Make a donation together', icon: '💚', target: 1, value: (s: Stats) => (s.donatedCents > 0 ? 1 : 0) },
  { key: 'volunteers', title: 'Volunteers', description: 'Join an NGO planting drive together', icon: '🙋', target: 1, value: (s: Stats) => s.drivesJoined },
];

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

// ---------- timeline ----------

const STORED_ACTIVITY = ['member_joined', 'member_left', 'challenge_created', 'role_changed'] as const;

/**
 * The group's timeline: members' plantings, adoptions, donations and drive sign-ups (the work that
 * counts for the group) interleaved with joins, role changes and challenges. Paged by time: the cursor
 * is the timestamp of the last item returned.
 */
export async function listActivity(prisma: PrismaClient, viewerId: string, groupId: string, query: CursorQuery) {
  await requireMember(prisma, groupId, viewerId);
  const take = parseTake(query.take, 30);
  const parsed = query.cursor ? new Date(query.cursor) : null;
  if (parsed && Number.isNaN(parsed.getTime())) throw new BadRequestError('Invalid cursor');
  const before = parsed ?? new Date(Date.now() + 60_000);

  const scope = await loadScope(prisma, groupId);
  const limit = take + 1;
  const [trees, adoptions, donations, rsvps, stored] = await Promise.all([
    prisma.tree.findMany({
      where: { AND: [treeScopeWhere(scope), { plantedAt: { lt: before } }] },
      orderBy: { plantedAt: 'desc' },
      take: limit,
      select: { id: true, nickname: true, plantedAt: true, plantingGroupId: true, user: { select: USER_BRIEF } },
    }),
    prisma.adoption.findMany({
      where: { AND: [adoptionScopeWhere(scope), { createdAt: { lt: before } }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, createdAt: true, plantingGroupId: true, adoptableTree: { select: { nickname: true } }, user: { select: USER_BRIEF } },
    }),
    prisma.donation.findMany({
      where: { AND: [donationScopeWhere(scope), { createdAt: { lt: before } }] },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, createdAt: true, amountCents: true, isAnonymous: true, userId: true, plantingGroupId: true, campaign: { select: { title: true } }, user: { select: USER_BRIEF } },
    }),
    scope.sharing.length
      ? prisma.driveRsvp.findMany({
          where: { AND: [rsvpScopeWhere(scope), { createdAt: { lt: before } }] },
          orderBy: { createdAt: 'desc' },
          take: limit,
          select: { id: true, createdAt: true, drive: { select: { title: true } }, user: { select: USER_BRIEF } },
        })
      : Promise.resolve([]),
    prisma.plantingGroupActivity.findMany({
      where: { groupId, type: { in: [...STORED_ACTIVITY] }, createdAt: { lt: before } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { actor: { select: USER_BRIEF } },
    }),
  ]);

  const items = [
    ...trees.map((t) => ({ id: `tree:${t.id}`, type: 'tree_planted', createdAt: t.plantedAt, data: { nickname: t.nickname }, actor: t.user, forGroup: t.plantingGroupId === groupId })),
    ...adoptions.map((a) => ({ id: `adoption:${a.id}`, type: 'tree_adopted', createdAt: a.createdAt, data: { nickname: a.adoptableTree.nickname }, actor: a.user, forGroup: a.plantingGroupId === groupId })),
    ...donations.map((d) => ({
      id: `donation:${d.id}`,
      type: 'donation_made',
      createdAt: d.createdAt,
      data: { amountCents: d.amountCents, campaignTitle: d.campaign.title },
      // An anonymous donor stays anonymous to the group too (their own view excepted).
      actor: d.isAnonymous && d.userId !== viewerId ? null : d.user,
      forGroup: d.plantingGroupId === groupId,
    })),
    ...rsvps.map((r) => ({ id: `drive:${r.id}`, type: 'drive_joined', createdAt: r.createdAt, data: { title: r.drive.title }, actor: r.user, forGroup: false })),
    ...stored.map((s) => ({ id: `stored:${s.id}`, type: s.type as string, createdAt: s.createdAt, data: s.data as Record<string, unknown> | null, actor: s.actor, forGroup: true })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1));

  const hasMore = items.length > take;
  const page = items.slice(0, take);
  return { items: page, nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null };
}

// ---------- trees (list and map) ----------

function shapeTree(t: any, groupId: string, viewerId: string) {
  const place = visibleCoordinates(t, groupId, viewerId);
  const exact = !place.approximate;
  return {
    id: t.id,
    publicId: t.publicId,
    nickname: t.nickname,
    species: t.species,
    lat: place.lat,
    lng: place.lng,
    approximate: place.approximate,
    // A personal tree's address label could point at someone's home, so it is shown only for exact trees.
    locationLabel: exact ? t.locationLabel : null,
    photoUrl: t.photoUrl,
    plantedAt: t.plantedAt,
    healthStatus: t.healthStatus,
    verification: t.aiVerificationStatus,
    forGroup: t.plantingGroupId === groupId,
    plantedBy: t.user,
  };
}

export async function listGroupTrees(prisma: PrismaClient, viewerId: string, groupId: string, query: CursorQuery) {
  await requireMember(prisma, groupId, viewerId);
  const scope = await loadScope(prisma, groupId);
  const { take, args } = cursorArgs(query, 50, 100);
  const rows = await prisma.tree.findMany({
    where: treeScopeWhere(scope),
    orderBy: [{ plantedAt: 'desc' }, { id: 'desc' }],
    include: { species: { select: { commonName: true, emoji: true } }, user: { select: USER_BRIEF } },
    ...args,
  });
  return toCursorPage(rows, take, (t) => shapeTree(t, groupId, viewerId));
}

/** Pins for the group map: every counted tree (up to 500, newest first), with the same privacy rules. */
export async function listGroupTreePins(prisma: PrismaClient, viewerId: string, groupId: string) {
  await requireMember(prisma, groupId, viewerId);
  const scope = await loadScope(prisma, groupId);
  const rows = await prisma.tree.findMany({
    where: treeScopeWhere(scope),
    orderBy: [{ plantedAt: 'desc' }, { id: 'desc' }],
    take: 500,
    include: { species: { select: { commonName: true, emoji: true } }, user: { select: USER_BRIEF } },
  });
  return rows.map((t) => shapeTree(t, groupId, viewerId));
}

// ---------- adoptions, donations, drives ----------

export async function listGroupAdoptions(prisma: PrismaClient, viewerId: string, groupId: string, query: CursorQuery) {
  await requireMember(prisma, groupId, viewerId);
  const scope = await loadScope(prisma, groupId);
  const { take, args } = cursorArgs(query, 30);
  const rows = await prisma.adoption.findMany({
    where: adoptionScopeWhere(scope),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      adoptableTree: { select: { id: true, nickname: true, speciesName: true, photoUrl: true, ngo: { select: { orgName: true } } } },
      user: { select: USER_BRIEF },
    },
    ...args,
  });
  return toCursorPage(rows, take, (a) => ({
    id: a.id,
    createdAt: a.createdAt,
    forGroup: a.plantingGroupId === groupId,
    tree: { id: a.adoptableTree.id, nickname: a.adoptableTree.nickname, speciesName: a.adoptableTree.speciesName, photoUrl: a.adoptableTree.photoUrl, ngoName: a.adoptableTree.ngo.orgName },
    adoptedBy: a.user,
  }));
}

/** Donations that count for the group. Never includes a PAN; an anonymous donor's name stays hidden. */
export async function listGroupDonations(prisma: PrismaClient, viewerId: string, groupId: string, query: CursorQuery) {
  await requireMember(prisma, groupId, viewerId);
  const scope = await loadScope(prisma, groupId);
  const { take, args } = cursorArgs(query, 30);
  const rows = await prisma.donation.findMany({
    where: donationScopeWhere(scope),
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: {
      campaign: { select: { id: true, title: true, ngo: { select: { orgName: true } } } },
      user: { select: USER_BRIEF },
    },
    ...args,
  });
  return toCursorPage(rows, take, (d) => ({
    id: d.id,
    amountCents: d.amountCents,
    currency: d.currency,
    receiptNumber: d.plantingGroupId === groupId || d.userId === viewerId ? d.receiptNumber : null,
    createdAt: d.createdAt,
    forGroup: d.plantingGroupId === groupId,
    campaign: { id: d.campaign.id, title: d.campaign.title, ngoName: d.campaign.ngo.orgName },
    donatedBy: d.isAnonymous && d.userId !== viewerId ? null : d.user,
  }));
}

/** NGO drives the group's sharing members have signed up for, with how many of them are going. */
export async function listGroupDrives(prisma: PrismaClient, viewerId: string, groupId: string) {
  await requireMember(prisma, groupId, viewerId);
  const scope = await loadScope(prisma, groupId);
  if (scope.sharing.length === 0) return [];

  const rsvps = await prisma.driveRsvp.findMany({ where: rsvpScopeWhere(scope), select: { driveId: true, user: { select: USER_BRIEF } } });
  const byDrive = new Map<string, typeof rsvps>();
  for (const r of rsvps) byDrive.set(r.driveId, [...(byDrive.get(r.driveId) ?? []), r]);
  if (byDrive.size === 0) return [];

  const drives = await prisma.drive.findMany({ where: { id: { in: [...byDrive.keys()] } }, include: driveInclude, orderBy: { startsAt: 'desc' } });
  return drives.map((d) => ({ ...serializeDrive(d), groupAttendees: (byDrive.get(d.id) ?? []).map((r) => r.user) }));
}

// ---------- forest themes ----------

/** Non-default themes unlock as the group levels up: the first at level 2, the next at 3, and so on. */
async function themesFor(prisma: PrismaClient, groupId: string) {
  const [themes, group, { stats }] = await Promise.all([
    prisma.forestTheme.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.plantingGroup.findUnique({ where: { id: groupId }, select: { selectedForestThemeId: true } }),
    buildStats(prisma, groupId),
  ]);
  let step = 1;
  const rows = themes.map((t) => {
    const unlockLevel = t.isDefaultUnlocked ? 1 : ++step;
    return {
      id: t.id,
      key: t.key,
      name: t.name,
      preview: t.previewEmoji,
      unlockLevel,
      unlocked: stats.level >= unlockLevel,
      selected: group?.selectedForestThemeId === t.id,
    };
  });
  return rows;
}

export async function listGroupThemes(prisma: PrismaClient, viewerId: string, groupId: string) {
  await requireMember(prisma, groupId, viewerId);
  return themesFor(prisma, groupId);
}

export async function selectGroupTheme(prisma: PrismaClient, actorId: string, groupId: string, themeId: string) {
  await requireAdmin(prisma, groupId, actorId);
  const theme = (await themesFor(prisma, groupId)).find((t) => t.id === themeId);
  if (!theme) throw new NotFoundError('Theme not found');
  if (!theme.unlocked) throw new ConflictError(`This theme unlocks at group level ${theme.unlockLevel}`);
  await prisma.plantingGroup.update({ where: { id: groupId }, data: { selectedForestThemeId: themeId } });
  return { selectedForestThemeId: themeId };
}

// ---------- leaderboards ----------

/** Groups ranked by trees that count for them. Open to any signed-in person: names, logos and totals only. */
export async function groupsLeaderboard(prisma: PrismaClient, viewerId: string) {
  const rows = await prisma.$queryRaw<{ group_id: string; trees: number }[]>`
    SELECT g.id AS group_id, COUNT(DISTINCT t.id)::int AS trees
    FROM planting_groups g
    JOIN trees t
      ON t.is_deleted = false
     AND t.ai_verification_status IN ('verified', 'unverified')
     AND (
       t.planting_group_id = g.id
       OR EXISTS (
         SELECT 1 FROM planting_group_members m
         WHERE m.group_id = g.id AND m.user_id = t.user_id AND m.share_activity = true AND t.planted_at >= m.joined_at
       )
     )
    GROUP BY g.id
    ORDER BY trees DESC, g.id
    LIMIT 50`;
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.group_id);
  const [groups, mine] = await Promise.all([
    prisma.plantingGroup.findMany({ where: { id: { in: ids } }, include: { _count: { select: { members: true } } } }),
    prisma.plantingGroupMember.findMany({ where: { userId: viewerId, groupId: { in: ids } }, select: { groupId: true } }),
  ]);
  const byId = new Map(groups.map((g) => [g.id, g]));
  const mineIds = new Set(mine.map((m) => m.groupId));

  return rows.flatMap((r, i) => {
    const group = byId.get(r.group_id);
    if (!group) return [];
    return [{ rank: i + 1, treesPlanted: r.trees, isMine: mineIds.has(group.id), group: serializeGroup(group) }];
  });
}

/** Who has contributed the most to this group (members only). Members with nothing yet are listed last. */
export async function contributorsLeaderboard(prisma: PrismaClient, viewerId: string, groupId: string) {
  await requireMember(prisma, groupId, viewerId);
  const scope = await loadScope(prisma, groupId);
  const [counts, members] = await Promise.all([
    prisma.tree.groupBy({ by: ['userId'], where: treeScopeWhere(scope), _count: { _all: true } }),
    prisma.plantingGroupMember.findMany({
      where: { groupId },
      include: { user: { select: USER_BRIEF } },
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

  const { scope, trees, stats, challengeRows } = await buildStats(prisma, groupId, now);
  const [joins, donations] = await Promise.all([
    prisma.plantingGroupMember.findMany({ where: { groupId, joinedAt: { gte: from } }, select: { joinedAt: true } }),
    prisma.donation.findMany({ where: { AND: [donationScopeWhere(scope), { createdAt: { gte: from } }] }, select: { amountCents: true, createdAt: true } }),
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

export type { GroupScope };
