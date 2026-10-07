import { PrismaClient, NgoOrgType, Prisma } from '@arth/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { notify } from './notification.service';
import { computeSurvivalStats } from './plantedTree.service';
import { parseTake } from '../utils/pagination';
import { getNgoImpactTotals } from './treeImpact.service';

const RECENT_ACTIVITY_LIMIT = 10;

interface OfficeBearerInput {
  name: string;
  designation?: string;
  phone?: string;
  email?: string;
}

interface UpdateProfileInput {
  orgName?: string;
  description?: string;
  website?: string;
  contactPhone?: string;
  logoUrl?: string;
  city?: string;
  foundedYear?: number;
  volunteerCountEstimate?: number;
  awards?: { title: string; year?: number; issuer?: string }[];
  followPolicy?: 'open' | 'approval';

  orgType?: NgoOrgType;
  line1?: string;
  operatingCities?: string[];
  operatingStates?: string[];
  officialEmail?: string;
  socialMediaLinks?: string[];

  registrationNumber?: string;
  registrationAuthority?: string;
  panNumber?: string;
  ngoDarpanId?: string;
  twelveARegistrationNumber?: string;
  eightyGRegistrationNumber?: string;
  fcraRegistrationNumber?: string;
  csr1RegistrationNumber?: string;

  primaryContactName?: string;
  primaryContactDesignation?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  officeBearers?: OfficeBearerInput[];

  primaryWorkAreas?: string[];
  drivesConductedHistorical?: number;
  treesPlantedHistorical?: number;
  majorProjectsDescription?: string;
  environmentalWorkSinceYear?: number;

  conductsPlantationDrives?: boolean;
  typicalSaplingsPerDrive?: string;
  typicalDriveLocations?: string;
  speciesCommonlyPlanted?: string;
  saplingSourceDescription?: string;
  monitorsSurvivalPostPlanting?: boolean;
  doesPostPlantationMaintenance?: boolean;
  plantationVerificationMethod?: string;
  previousProjectLinks?: string[];

  driveReportLinks?: string[];
  mediaCoverageLinks?: string[];
  projectPageLinks?: string[];
  annualReportLinks?: string[];
  impactReportLinks?: string[];
  socialMediaPostLinks?: string[];

  arthUsageGoals?: string[];
  expectedDrivesPerYear?: number;
  participantTypes?: string[];
}

interface DonationsFilter {
  campaignId?: string;
  status?: 'pending' | 'succeeded' | 'failed' | 'refunded';
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  take?: number;
}

export async function getOwnProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.ngoProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('NGO profile not found');
  return profile;
}

export async function updateOwnProfile(prisma: PrismaClient, userId: string, input: UpdateProfileInput) {
  const profile = await prisma.ngoProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('NGO profile not found');

  const updated = await prisma.ngoProfile.update({ where: { id: profile.id }, data: input as Prisma.NgoProfileUpdateInput });

  // Switching to "open" means follows no longer need approval — without this, any request that
  // queued up while policy was "approval" would sit `pending` forever, since nothing else ever
  // revisits an existing Follow row after the policy that created it changes.
  if (input.followPolicy === 'open' && profile.followPolicy !== 'open') {
    await prisma.follow.updateMany({
      where: { ngoId: profile.id, status: 'pending' },
      data: { status: 'accepted', respondedAt: new Date() },
    });
  }

  return updated;
}

// A rejected NGO can edit their details (via updateOwnProfile above, which has
// no status guard) and then call this explicitly to go back into the review
// queue. Kept as a dedicated action rather than folded into the generic PATCH
// so a status transition is never an incidental side effect of a field edit.
export async function resubmitProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.ngoProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('NGO profile not found');
  if (profile.status !== 'rejected') {
    throw new ForbiddenError('Only a rejected application can be resubmitted');
  }

  return prisma.ngoProfile.update({
    where: { id: profile.id },
    data: { status: 'pending', rejectionReason: null, approvedAt: null, approvedByUserId: null },
  });
}

// Used by drives/adoptions/donations create-routes to gate content creation
// on top of the plain 'ngo' role check — an NGO account can exist (and manage
// its own profile) before an admin approves it, but can't publish anything yet.
export async function requireApprovedNgoProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.ngoProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('NGO profile not found');
  if (profile.status !== 'approved') {
    throw new ForbiddenError('Your NGO account is not yet approved');
  }
  return profile;
}

// Used by read-only routes (list/view own drives/trees/campaigns, stats) —
// unlike requireApprovedNgoProfile, this has no status check. A pending,
// rejected, or suspended NGO can still see everything it already created;
// only *publishing new changes* requires approval. Previously listOwnedDrives
// etc. called requireApprovedNgoProfile directly, which meant a non-approved
// NGO got a 403 from the API just trying to view its own history — a real
// bug, not just a hidden UI tab.
export async function requireNgoProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.ngoProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('NGO profile not found');
  return profile;
}

export async function getOwnStats(prisma: PrismaClient, userId: string) {
  const ngo = await requireNgoProfile(prisma, userId);

  const [
    activeCampaigns,
    upcomingDrives,
    rsvpAggregate,
    treeCounts,
    campaignDonations,
    distinctLocations,
    distinctVolunteers,
    totalDrives,
    recentRsvps,
    recentDonations,
    recentAdoptions,
    impact,
  ] = await Promise.all([
    prisma.donationCampaign.count({ where: { ngoId: ngo.id, status: 'active' } }),
    prisma.drive.count({ where: { ngoId: ngo.id, status: 'upcoming' } }),
    prisma.driveRsvp.count({ where: { status: 'confirmed', drive: { ngoId: ngo.id } } }),
    prisma.adoptableTree.groupBy({ by: ['status'], where: { ngoId: ngo.id }, _count: true }),
    prisma.donation.findMany({
      where: { status: 'succeeded', campaign: { ngoId: ngo.id } },
      select: { amountCents: true },
    }),
    // Communities reached — distinct non-empty drive cities.
    prisma.drive.findMany({
      where: { ngoId: ngo.id, city: { not: null } },
      select: { city: true },
      distinct: ['city'],
    }),
    // Volunteers involved — distinct people, not attendance count. A
    // volunteer can RSVP to multiple different drives (unique per
    // driveId+userId, not globally unique), so this is a real headcount,
    // deliberately different from the totalRsvps attendance count above.
    prisma.driveRsvp.findMany({
      where: { status: 'confirmed', drive: { ngoId: ngo.id } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    // Total drives, all-time — vs. upcomingDrives above which filters status:'upcoming'.
    prisma.drive.count({ where: { ngoId: ngo.id } }),
    prisma.driveRsvp.findMany({
      where: { status: 'confirmed', drive: { ngoId: ngo.id } },
      orderBy: { createdAt: 'desc' },
      take: RECENT_ACTIVITY_LIMIT,
      select: { createdAt: true, drive: { select: { title: true } }, user: { select: { name: true, handle: true } } },
    }),
    prisma.donation.findMany({
      where: { status: 'succeeded', campaign: { ngoId: ngo.id } },
      orderBy: { createdAt: 'desc' },
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        createdAt: true,
        amountCents: true,
        campaign: { select: { title: true } },
        user: { select: { name: true, handle: true } },
      },
    }),
    prisma.adoption.findMany({
      where: { adoptableTree: { ngoId: ngo.id } },
      orderBy: { createdAt: 'desc' },
      take: RECENT_ACTIVITY_LIMIT,
      select: {
        createdAt: true,
        adoptableTree: { select: { nickname: true } },
        user: { select: { name: true, handle: true } },
      },
    }),
    getNgoImpactTotals(prisma, ngo.id),
  ]);

  const treesAvailable = treeCounts.find((t) => t.status === 'available')?._count ?? 0;
  const treesAdopted = treeCounts.find((t) => t.status === 'adopted')?._count ?? 0;
  const totalRaisedCents = campaignDonations.reduce((sum, d) => sum + d.amountCents, 0);
  const communitiesReached = distinctLocations.filter((d) => d.city?.trim()).length;
  const volunteersInvolved = distinctVolunteers.length;

  const activity = [
    ...recentRsvps.map((r) => ({
      type: 'rsvp' as const,
      createdAt: r.createdAt,
      actor: r.user,
      detail: r.drive.title,
    })),
    ...recentDonations.map((d) => ({
      type: 'donation' as const,
      createdAt: d.createdAt,
      actor: d.user,
      detail: d.campaign.title,
      amountCents: d.amountCents,
    })),
    ...recentAdoptions.map((a) => ({
      type: 'adoption' as const,
      createdAt: a.createdAt,
      actor: a.user,
      detail: a.adoptableTree.nickname,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT);

  return {
    activeCampaigns,
    upcomingDrives,
    totalRsvps: rsvpAggregate,
    treesAvailable,
    treesAdopted,
    totalRaisedCents,
    communitiesReached,
    volunteersInvolved,
    totalDrives,
    // Estimated from each tree's species and age (see lib/treeImpact.ts), not a flat per-tree rate.
    co2AbsorptionKg: impact.co2Kg,
    oxygenKg: impact.oxygenKg,
    impactTreesCounted: impact.treesCounted,
    impactConfidence: impact.confidence,
    activity,
    trustScore: ngo.trustScore,
    growthLevel: ngo.growthLevel,
  };
}

// Cross-campaign donations for the Donations dashboard page, with optional
// filters — the donations routes only expose per-campaign lists
// (/campaigns/:id/donations), this is the "all of my donations" view.
// Defaults to status:'succeeded' (matches the pre-existing behavior) unless
// a different status is explicitly requested.
export async function getOwnDonations(prisma: PrismaClient, userId: string, filter: DonationsFilter = {}) {
  const ngo = await requireNgoProfile(prisma, userId);
  const take = Math.min(filter.take ?? 50, 200);
  const page = Math.max(filter.page ?? 1, 1);

  const where = {
    status: filter.status ?? 'succeeded',
    campaign: { ngoId: ngo.id, ...(filter.campaignId ? { id: filter.campaignId } : {}) },
    ...(filter.dateFrom || filter.dateTo
      ? { createdAt: { ...(filter.dateFrom ? { gte: filter.dateFrom } : {}), ...(filter.dateTo ? { lte: filter.dateTo } : {}) } }
      : {}),
  } as const;

  const [donations, total] = await Promise.all([
    prisma.donation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      skip: (page - 1) * take,
      select: {
        id: true,
        amountCents: true,
        currency: true,
        status: true,
        createdAt: true,
        campaign: { select: { id: true, title: true } },
        user: { select: { name: true, handle: true } },
      },
    }),
    prisma.donation.count({ where }),
  ]);

  return {
    total,
    donations: donations.map((d) => ({
      id: d.id,
      amountCents: d.amountCents,
      currency: d.currency,
      status: d.status,
      createdAt: d.createdAt,
      campaignId: d.campaign.id,
      campaignTitle: d.campaign.title,
      donor: d.user,
    })),
  };
}

// Per-campaign breakdown (succeeded donations only) for the Donations dashboard's summary panel.
export async function getOwnDonationsSummary(prisma: PrismaClient, userId: string) {
  const ngo = await requireNgoProfile(prisma, userId);

  const grouped = await prisma.donation.groupBy({
    by: ['campaignId'],
    where: { status: 'succeeded', campaign: { ngoId: ngo.id } },
    _sum: { amountCents: true },
    _count: { _all: true },
  });

  const campaigns = await prisma.donationCampaign.findMany({
    where: { id: { in: grouped.map((g) => g.campaignId) } },
    select: { id: true, title: true },
  });
  const titleById = new Map(campaigns.map((c) => [c.id, c.title]));

  return grouped
    .map((g) => ({
      campaignId: g.campaignId,
      campaignTitle: titleById.get(g.campaignId) ?? 'Unknown campaign',
      totalAmountCents: g._sum.amountCents ?? 0,
      donationCount: g._count._all,
    }))
    .sort((a, b) => b.totalAmountCents - a.totalAmountCents);
}

// A "volunteer" has no dedicated model — same definition getOwnStats uses
// for volunteersInvolved: any user with a confirmed RSVP to one of this
// NGO's drives. This aggregates that into a per-person list for the
// Volunteers dashboard page.
export async function getOwnVolunteers(prisma: PrismaClient, userId: string, q: { cursor?: string; take?: number | string } = {}) {
  const ngo = await requireNgoProfile(prisma, userId);
  const take = parseTake(q.take, 30, 100);
  // A volunteer has no record of their own, so the page is a window over the per-user rollup of
  // RSVPs; the cursor is just the offset into that ordering.
  const offset = Math.max(Number.parseInt(q.cursor ?? '0', 10) || 0, 0);
  const where = { status: 'confirmed' as const, drive: { ngoId: ngo.id } };

  const grouped = await prisma.driveRsvp.groupBy({
    by: ['userId'],
    where,
    _count: { _all: true },
    _max: { createdAt: true },
    orderBy: [{ _max: { createdAt: 'desc' } }, { userId: 'asc' }],
    take: take + 1,
    skip: offset,
  });
  const hasMore = grouped.length > take;
  const page = hasMore ? grouped.slice(0, take) : grouped;
  const ids = page.map((g) => g.userId);

  // Attendance for just this page's volunteers: how many rows have a recorded value, and how many were attended.
  const [recorded, attended, users] = await Promise.all([
    prisma.driveRsvp.groupBy({ by: ['userId'], where: { ...where, userId: { in: ids }, attended: { not: null } }, _count: { _all: true } }),
    prisma.driveRsvp.groupBy({ by: ['userId'], where: { ...where, userId: { in: ids }, attended: true }, _count: { _all: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, handle: true } }),
  ]);
  const recordedBy = new Map(recorded.map((r) => [r.userId, r._count._all]));
  const attendedBy = new Map(attended.map((r) => [r.userId, r._count._all]));
  const userById = new Map(users.map((u) => [u.id, u]));

  return {
    items: page.map((g) => ({
      userId: g.userId,
      name: userById.get(g.userId)?.name ?? 'Unknown',
      handle: userById.get(g.userId)?.handle ?? '',
      // Once the NGO has recorded attendance for this person, that's the real count; until then,
      // the RSVP count is the best available signal.
      drivesAttended: (recordedBy.get(g.userId) ?? 0) > 0 ? attendedBy.get(g.userId) ?? 0 : g._count._all,
      lastActiveAt: g._max.createdAt,
    })),
    nextCursor: hasMore ? String(offset + take) : null,
  };
}

/**
 * NGO-initiated removal of a volunteer. A "volunteer" has no dedicated record (see
 * getOwnVolunteers above), so this cancels their confirmed RSVPs to this NGO's *upcoming* drives —
 * completed drives are left untouched so past attendance history/stats aren't rewritten. Someone
 * whose only participation was in the past will still show up in the volunteers list afterward,
 * since that history is exactly what makes them a volunteer.
 */
export async function removeVolunteer(prisma: PrismaClient, ngoUserId: string, targetUserId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);

  const rsvps = await prisma.driveRsvp.findMany({
    where: { userId: targetUserId, status: 'confirmed', drive: { ngoId: ngo.id, status: 'upcoming' } },
    include: { drive: { select: { id: true, title: true } } },
  });

  if (rsvps.length > 0) {
    await prisma.driveRsvp.updateMany({
      where: { id: { in: rsvps.map((r) => r.id) } },
      data: { status: 'cancelled' },
    });

    for (const r of rsvps) {
      await notify(prisma, {
        userId: targetUserId,
        type: 'drive_reminder',
        actorNgoId: ngo.id,
        data: { driveId: r.drive.id, driveTitle: r.drive.title, kind: 'removed_by_ngo' },
        push: { title: r.drive.title, body: 'Your RSVP was cancelled by the organizer.' },
      });
    }
  }

  return { cancelledCount: rsvps.length };
}

// Overview stats plus a 6-month trend so the Reports page can chart
// donations/RSVPs/adoptions over time, not just current totals.
export async function getOwnReports(prisma: PrismaClient, userId: string) {
  const ngo = await requireNgoProfile(prisma, userId);
  const stats = await getOwnStats(prisma, userId);

  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(1);
  rangeStart.setMonth(rangeStart.getMonth() - 5);

  const [donations, rsvps, adoptions, survival, recordedAttendance, sponsorships] = await Promise.all([
    prisma.donation.findMany({
      where: { status: 'succeeded', campaign: { ngoId: ngo.id }, createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.driveRsvp.findMany({
      where: { status: 'confirmed', drive: { ngoId: ngo.id }, createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    prisma.adoption.findMany({
      where: { adoptableTree: { ngoId: ngo.id }, createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
    // Survival & Impact's own health-check data — the most direct measure of whether trees this
    // NGO planted are actually still alive, not just that a planting happened.
    computeSurvivalStats(prisma, ngo.id),
    // Attendance is only ever recorded (attended set to true/false) on completed drives, and only
    // when the NGO bothers to record it — restricting to non-null keeps an NGO that's never
    // recorded attendance from showing a misleading 0% instead of "not yet tracked".
    prisma.driveRsvp.findMany({
      where: { status: 'confirmed', drive: { ngoId: ngo.id, status: 'completed' }, attended: { not: null } },
      select: { attended: true },
    }),
    // Per-tree drive sponsorships are a funding channel distinct from campaign donations above.
    prisma.drivePlantSponsorship.aggregate({
      where: { status: 'succeeded', drivePlant: { drive: { ngoId: ngo.id } } },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
  ]);

  const monthMarkers = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(rangeStart);
    d.setMonth(d.getMonth() + i);
    return {
      label: d.toLocaleString('en-US', { month: 'short', year: '2-digit' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    };
  });

  const bucketByMonth = (rows: { createdAt: Date }[]) => {
    const counts = new Array(6).fill(0);
    for (const row of rows) {
      const idx =
        (row.createdAt.getFullYear() - rangeStart.getFullYear()) * 12 +
        (row.createdAt.getMonth() - rangeStart.getMonth());
      if (idx >= 0 && idx < 6) counts[idx] += 1;
    }
    return monthMarkers.map(({ label, key }, i) => ({ month: label, monthKey: key, count: counts[i] }));
  };

  const attendanceRecorded = recordedAttendance.length;
  const attendanceRate =
    attendanceRecorded > 0
      ? Math.round((recordedAttendance.filter((r) => r.attended).length / attendanceRecorded) * 1000) / 10
      : null;

  return {
    ...stats,
    survival: { total: survival.total, survivalRate: survival.survivalRate, counts: survival.counts },
    attendance: { recorded: attendanceRecorded, rate: attendanceRate },
    sponsoredTrees: { count: sponsorships._count._all, totalAmountCents: sponsorships._sum.amountCents ?? 0 },
    monthly: {
      donations: bucketByMonth(donations),
      rsvps: bucketByMonth(rsvps),
      adoptions: bucketByMonth(adoptions),
    },
  };
}

/** The RSVPs behind a single bar of the Reports page's "RSVPs (6 months)" chart — who confirmed
 * an RSVP to one of this NGO's drives within that calendar month. `month` matches the `monthKey`
 * (e.g. "2026-03") returned by getOwnReports' monthly.rsvps bucket. */
export async function getOwnMonthlyRsvps(prisma: PrismaClient, userId: string, month: string) {
  const ngo = await requireNgoProfile(prisma, userId);

  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new BadRequestError('month must be in YYYY-MM format');
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 1);

  const rsvps = await prisma.driveRsvp.findMany({
    where: { status: 'confirmed', drive: { ngoId: ngo.id }, createdAt: { gte: start, lt: end } },
    include: {
      user: { select: { id: true, name: true, handle: true } },
      drive: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return rsvps.map((r) => ({
    id: r.id,
    userId: r.user.id,
    userName: r.user.name,
    userHandle: r.user.handle,
    driveId: r.drive.id,
    driveTitle: r.drive.title,
    createdAt: r.createdAt,
  }));
}
