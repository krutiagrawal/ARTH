import { PrismaClient } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../utils/errors';

const RECENT_ACTIVITY_LIMIT = 10;

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

  return prisma.ngoProfile.update({ where: { id: profile.id }, data: input });
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
    adoptedTreeSpecies,
    activeSpecies,
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
    // AdoptableTree.speciesName is free text, not FK'd to TreeSpecies, so
    // CO2 is estimated by name match below rather than joined directly.
    prisma.adoptableTree.findMany({
      where: { ngoId: ngo.id, status: 'adopted' },
      select: { speciesName: true },
    }),
    prisma.treeSpecies.findMany({
      where: { isActive: true },
      select: { commonName: true, co2KgPerYear: true },
    }),
  ]);

  const treesAvailable = treeCounts.find((t) => t.status === 'available')?._count ?? 0;
  const treesAdopted = treeCounts.find((t) => t.status === 'adopted')?._count ?? 0;
  const totalRaisedCents = campaignDonations.reduce((sum, d) => sum + d.amountCents, 0);
  const communitiesReached = distinctLocations.filter((d) => d.city?.trim()).length;
  const volunteersInvolved = distinctVolunteers.length;

  // CO2 absorption potential — sum each adopted tree's species-specific
  // co2KgPerYear (matched case-insensitively by name, since speciesName is
  // free text); trees whose species doesn't match any catalog entry fall
  // back to the average rate across active species, so every adopted tree
  // still contributes an estimate.
  const speciesRateByName = new Map(
    activeSpecies
      .filter((s) => s.co2KgPerYear != null)
      .map((s) => [s.commonName.trim().toLowerCase(), Number(s.co2KgPerYear)])
  );
  const fallbackRates = [...speciesRateByName.values()];
  const fallbackRate = fallbackRates.length
    ? fallbackRates.reduce((sum, r) => sum + r, 0) / fallbackRates.length
    : 0;
  const co2AbsorptionKg = Math.round(
    adoptedTreeSpecies.reduce((sum, t) => {
      const rate = speciesRateByName.get(t.speciesName.trim().toLowerCase()) ?? fallbackRate;
      return sum + rate;
    }, 0)
  );

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
    co2AbsorptionKg,
    activity,
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
export async function getOwnVolunteers(prisma: PrismaClient, userId: string) {
  const ngo = await requireNgoProfile(prisma, userId);

  const grouped = await prisma.driveRsvp.groupBy({
    by: ['userId'],
    where: { status: 'confirmed', drive: { ngoId: ngo.id } },
    _count: { _all: true },
    _max: { createdAt: true },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, name: true, handle: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  return grouped
    .map((g) => ({
      userId: g.userId,
      name: userById.get(g.userId)?.name ?? 'Unknown',
      handle: userById.get(g.userId)?.handle ?? '',
      drivesAttended: g._count._all,
      lastActiveAt: g._max.createdAt,
    }))
    .sort((a, b) => (b.lastActiveAt?.getTime() ?? 0) - (a.lastActiveAt?.getTime() ?? 0));
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

  const [donations, rsvps, adoptions] = await Promise.all([
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
  ]);

  const monthLabels = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(rangeStart);
    d.setMonth(d.getMonth() + i);
    return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
  });

  const bucketByMonth = (rows: { createdAt: Date }[]) => {
    const counts = new Array(6).fill(0);
    for (const row of rows) {
      const idx =
        (row.createdAt.getFullYear() - rangeStart.getFullYear()) * 12 +
        (row.createdAt.getMonth() - rangeStart.getMonth());
      if (idx >= 0 && idx < 6) counts[idx] += 1;
    }
    return monthLabels.map((month, i) => ({ month, count: counts[i] }));
  };

  return {
    ...stats,
    monthly: {
      donations: bucketByMonth(donations),
      rsvps: bucketByMonth(rsvps),
      adoptions: bucketByMonth(adoptions),
    },
  };
}
