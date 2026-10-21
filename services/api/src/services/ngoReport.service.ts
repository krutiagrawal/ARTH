import { PrismaClient } from '@arth/db';
import { requireNgoProfile } from './ngo.service';
import { getLatestStatusByTree } from './plantedTree.service';
import { bucketize, resolveReportRange, type ReportRange } from '../utils/reportRange';

export interface NgoReportParams {
  from?: Date;
  to?: Date;
  /** Narrows drive-related sections (RSVPs, volunteers, trees, sponsorships). */
  driveId?: string;
  /** Narrows fundraising sections. */
  campaignId?: string;
}

interface Window {
  from: Date;
  to: Date;
}

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Every headline number for one window; run for the selected range and again for the previous one so the app can show ▲/▼. */
async function computeKpis(prisma: PrismaClient, ngoId: string, w: Window, p: NgoReportParams) {
  const inWindow = { gte: w.from, lte: w.to };
  const driveFilter = p.driveId ? { id: p.driveId } : {};
  const campaignFilter = p.campaignId ? { id: p.campaignId } : {};

  const [donations, rsvps, completedRsvps, drivesHeld, treesPlanted, adoptions, followers, posts, sponsorships] = await Promise.all([
    prisma.donation.findMany({
      where: { status: 'succeeded', createdAt: inWindow, campaign: { ngoId, ...campaignFilter } },
      select: { amountCents: true, userId: true },
    }),
    prisma.driveRsvp.findMany({
      where: { status: 'confirmed', createdAt: inWindow, drive: { ngoId, ...driveFilter } },
      select: { userId: true },
    }),
    // Attendance and hours belong to the drive's own date, not the day someone signed up.
    prisma.driveRsvp.findMany({
      where: { status: 'confirmed', attended: { not: null }, drive: { ngoId, ...driveFilter, startsAt: inWindow } },
      select: { attended: true, hoursLogged: true },
    }),
    prisma.drive.count({ where: { ngoId, ...driveFilter, status: 'completed', startsAt: inWindow } }),
    prisma.plantedTree.count({ where: { ngoId, plantedAt: inWindow, ...(p.driveId ? { driveId: p.driveId } : {}) } }),
    prisma.adoption.count({ where: { createdAt: inWindow, adoptableTree: { ngoId } } }),
    prisma.follow.count({ where: { ngoId, status: 'accepted', createdAt: inWindow } }),
    prisma.post.count({ where: { ngoId, isHidden: false, createdAt: inWindow } }),
    prisma.drivePlantSponsorship.aggregate({
      where: { status: 'succeeded', createdAt: inWindow, drivePlant: { drive: { ngoId, ...driveFilter } } },
      _sum: { amountCents: true },
    }),
  ]);

  const raisedCents = donations.reduce((n, d) => n + d.amountCents, 0);
  const donors = new Set(donations.map((d) => d.userId)).size;
  const attended = completedRsvps.filter((r) => r.attended).length;

  // New vs returning volunteers: returning = signed up to one of this NGO's drives before the window.
  const volunteerIds = Array.from(new Set(rsvps.map((r) => r.userId)));
  const returningRows = volunteerIds.length
    ? await prisma.driveRsvp.findMany({
        where: { userId: { in: volunteerIds }, status: 'confirmed', createdAt: { lt: w.from }, drive: { ngoId } },
        select: { userId: true },
        distinct: ['userId'],
      })
    : [];
  const returning = returningRows.length;

  return {
    raisedCents,
    donationCount: donations.length,
    donors,
    avgDonationCents: donations.length ? Math.round(raisedCents / donations.length) : 0,
    rsvps: rsvps.length,
    attendanceRate: pct(attended, completedRsvps.length),
    volunteerHours: round1(completedRsvps.filter((r) => r.attended).reduce((n, r) => n + (r.hoursLogged ?? 0), 0)),
    newVolunteers: volunteerIds.length - returning,
    returningVolunteers: returning,
    drivesHeld,
    treesPlanted,
    adoptions,
    followersGained: followers,
    posts,
    sponsoredCents: sponsorships._sum.amountCents ?? 0,
  };
}

/**
 * The NGO Reports payload for a date range: headline KPIs (with the previous equal-length period
 * for comparison), time series, and breakdowns. Drive/campaign filters apply to the sections they
 * make sense for – donations aren't tied to a drive, so `campaignId` only narrows fundraising and
 * `driveId` only narrows drive-related figures.
 */
export async function getNgoReport(prisma: PrismaClient, userId: string, params: NgoReportParams = {}) {
  const ngo = await requireNgoProfile(prisma, userId);
  const range: ReportRange = resolveReportRange(params.from, params.to, ngo.createdAt);
  const inRange = { gte: range.from, lte: range.to };
  const driveWhere = params.driveId ? { driveId: params.driveId } : {};

  const [kpis, previousKpis] = await Promise.all([
    computeKpis(prisma, ngo.id, range, params),
    range.previous ? computeKpis(prisma, ngo.id, range.previous, params) : Promise.resolve(null),
  ]);

  const [donations, rsvps, trees, adoptions, followers, drives, bulkResponses, campaigns, followersTotal] = await Promise.all([
    prisma.donation.findMany({
      where: { createdAt: inRange, campaign: { ngoId: ngo.id, ...(params.campaignId ? { id: params.campaignId } : {}) } },
      select: { amountCents: true, status: true, createdAt: true, campaignId: true, userId: true, isAnonymous: true, campaign: { select: { category: true } } },
    }),
    prisma.driveRsvp.findMany({
      where: { status: 'confirmed', createdAt: inRange, drive: { ngoId: ngo.id, ...(params.driveId ? { id: params.driveId } : {}) } },
      select: { createdAt: true },
    }),
    prisma.plantedTree.findMany({
      where: { ngoId: ngo.id, plantedAt: inRange, ...driveWhere },
      select: { id: true, plantedAt: true, speciesName: true, driveId: true, zone: { select: { name: true } } },
    }),
    prisma.adoption.findMany({ where: { createdAt: inRange, adoptableTree: { ngoId: ngo.id } }, select: { createdAt: true } }),
    prisma.follow.findMany({ where: { ngoId: ngo.id, status: 'accepted', createdAt: inRange }, select: { createdAt: true } }),
    prisma.drive.findMany({
      where: { ngoId: ngo.id, ...(params.driveId ? { id: params.driveId } : {}), startsAt: inRange },
      orderBy: { startsAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        startsAt: true,
        status: true,
        city: true,
        capacity: true,
        rsvps: { where: { status: 'confirmed' }, select: { attended: true, hoursLogged: true, userId: true } },
      },
    }),
    prisma.bulkRequirementResponse.groupBy({
      by: ['status'],
      where: { createdAt: inRange, requirement: { ngoId: ngo.id } },
      _count: { _all: true },
    }),
    prisma.donationCampaign.findMany({ where: { ngoId: ngo.id }, select: { id: true, title: true, goalAmountCents: true } }),
    prisma.follow.count({ where: { ngoId: ngo.id, status: 'accepted' } }),
  ]);

  // ---- Fundraising ----
  const paid = donations.filter((d) => d.status === 'succeeded');
  const campaignInfo = new Map(campaigns.map((c) => [c.id, c]));
  const byCampaign = new Map<string, { raised: number; count: number }>();
  const byCategory = new Map<string, number>();
  for (const d of paid) {
    const c = byCampaign.get(d.campaignId) ?? { raised: 0, count: 0 };
    c.raised += d.amountCents;
    c.count += 1;
    byCampaign.set(d.campaignId, c);
    const cat = d.campaign.category ?? 'uncategorised';
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + d.amountCents);
  }
  const statusSplit: Record<string, number> = { succeeded: 0, pending: 0, failed: 0, refunded: 0 };
  for (const d of donations) statusSplit[d.status] = (statusSplit[d.status] ?? 0) + 1;

  // ---- Trees ----
  const statusByTree = await getLatestStatusByTree(prisma, trees.map((t) => t.id));
  const survival: Record<string, number> = { healthy: 0, struggling: 0, dead: 0, removed: 0, not_checked: 0 };
  const bySpecies = new Map<string, { planted: number; alive: number }>();
  const byZone = new Map<string, number>();
  const byDriveTrees = new Map<string, number>();
  for (const t of trees) {
    const st = statusByTree.get(t.id) ?? 'not_checked';
    survival[st] += 1;
    const sp = bySpecies.get(t.speciesName) ?? { planted: 0, alive: 0 };
    sp.planted += 1;
    if (st === 'healthy' || st === 'struggling') sp.alive += 1;
    bySpecies.set(t.speciesName, sp);
    byZone.set(t.zone?.name ?? 'Unzoned', (byZone.get(t.zone?.name ?? 'Unzoned') ?? 0) + 1);
    byDriveTrees.set(t.driveId ?? 'none', (byDriveTrees.get(t.driveId ?? 'none') ?? 0) + 1);
  }
  const survivalTotal = trees.length;
  const treesPerDrive = byDriveTrees;

  // ---- Drives table + top volunteers ----
  const hoursByUser = new Map<string, number>();
  const driveRows = drives.map((d) => {
    const attended = d.rsvps.filter((r) => r.attended).length;
    const recorded = d.rsvps.filter((r) => r.attended !== null).length;
    const hours = d.rsvps.filter((r) => r.attended).reduce((n, r) => n + (r.hoursLogged ?? 0), 0);
    for (const r of d.rsvps) if (r.attended && r.hoursLogged) hoursByUser.set(r.userId, (hoursByUser.get(r.userId) ?? 0) + r.hoursLogged);
    return {
      id: d.id,
      title: d.title,
      startsAt: d.startsAt,
      status: d.status,
      city: d.city,
      capacity: d.capacity,
      rsvps: d.rsvps.length,
      attendanceRate: pct(attended, recorded),
      hours: round1(hours),
      treesPlanted: treesPerDrive.get(d.id) ?? 0,
    };
  });
  const topUserIds = Array.from(hoursByUser.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topUsers = topUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: topUserIds.map(([id]) => id) } }, select: { id: true, name: true, handle: true } })
    : [];
  const topVolunteers = topUserIds.map(([id, hours]) => {
    const u = topUsers.find((x) => x.id === id);
    return { name: u?.name ?? 'Volunteer', handle: u?.handle ?? '', hours: round1(hours) };
  });

  return {
    range: { from: range.from, to: range.to, granularity: range.granularity, allTime: range.allTime },
    filters: { driveId: params.driveId ?? null, campaignId: params.campaignId ?? null },
    kpis,
    previousKpis,
    series: {
      donations: bucketize(paid, range, (d) => d.createdAt, (d) => d.amountCents),
      rsvps: bucketize(rsvps, range, (r) => r.createdAt),
      trees: bucketize(trees, range, (t) => t.plantedAt),
      adoptions: bucketize(adoptions, range, (a) => a.createdAt),
      followers: bucketize(followers, range, (f) => f.createdAt),
    },
    followersTotal,
    fundraising: {
      byCampaign: Array.from(byCampaign.entries())
        .map(([id, v]) => ({
          id,
          title: campaignInfo.get(id)?.title ?? 'Campaign',
          raisedCents: v.raised,
          donations: v.count,
          goalCents: campaignInfo.get(id)?.goalAmountCents ?? null,
        }))
        .sort((a, b) => b.raisedCents - a.raisedCents)
        .slice(0, 6),
      statusSplit,
      byCategory: Array.from(byCategory.entries()).map(([category, cents]) => ({ category, cents })).sort((a, b) => b.cents - a.cents),
    },
    drives: { rows: driveRows, topVolunteers },
    trees: {
      total: survivalTotal,
      survival,
      survivalRate: survivalTotal ? Math.round(((survival.healthy + survival.struggling) / survivalTotal) * 1000) / 10 : null,
      bySpecies: Array.from(bySpecies.entries())
        .map(([species, v]) => ({ species, planted: v.planted, alive: v.alive }))
        .sort((a, b) => b.planted - a.planted)
        .slice(0, 8),
      byZone: Array.from(byZone.entries()).map(([zone, count]) => ({ zone, count })).sort((a, b) => b.count - a.count).slice(0, 6),
    },
    bulkRequirements: Object.fromEntries(bulkResponses.map((g) => [g.status, g._count._all])),
  };
}
