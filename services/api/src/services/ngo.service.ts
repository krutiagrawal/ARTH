import { PrismaClient, NgoOrgType, NgoDocumentType, Prisma } from '@arth/db';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { notify } from './notification.service';
import { computeSurvivalStats } from './plantedTree.service';
import { parseTake } from '../utils/pagination';
import { getNgoImpactTotals } from './treeImpact.service';
import { notRescheduled } from './driveRules';

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

// Registration documents come back with the profile so the edit screens can show what was uploaded.
const documentsInclude = { verificationDocuments: { orderBy: { uploadedAt: 'asc' as const } } };

export async function getOwnProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.ngoProfile.findUnique({ where: { userId }, include: documentsInclude });
  if (!profile) throw new NotFoundError('NGO profile not found');
  return profile;
}

// Details an admin verified at approval. Once the account is approved (or suspended) these are read-only
// for the NGO - changing them would silently invalidate the review - so they can only be edited while the
// application is pending or rejected, and otherwise need support. Re-sending an unchanged value is fine
// (the edit screen submits the whole form).
const LEGAL_FIELDS = [
  'orgType',
  'registrationNumber',
  'registrationAuthority',
  'panNumber',
  'ngoDarpanId',
  'twelveARegistrationNumber',
  'eightyGRegistrationNumber',
  'fcraRegistrationNumber',
  'csr1RegistrationNumber',
  'officeBearers',
] as const;

// Key-order-independent JSON (Postgres jsonb returns keys in its own order, Zod in schema order), with
// empty strings/undefined treated as "not set", so an unchanged field never looks edited.
function canonical(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (v === undefined || v === null || v === '') return null;
    if (Array.isArray(v)) return v.map(norm);
    if (typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .filter(([, x]) => x !== undefined && x !== null && x !== '')
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, x]) => [k, norm(x)]),
      );
    }
    return v;
  };
  return JSON.stringify(norm(value));
}

export async function updateOwnProfile(prisma: PrismaClient, userId: string, input: UpdateProfileInput) {
  const profile = await prisma.ngoProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('NGO profile not found');

  if (profile.status === 'approved' || profile.status === 'suspended') {
    const changed = LEGAL_FIELDS.filter((field) => {
      const next = (input as Record<string, unknown>)[field];
      if (next === undefined) return false;
      const current = (profile as Record<string, unknown>)[field];
      return canonical(next) !== canonical(current);
    });
    if (changed.length > 0) {
      throw new ForbiddenError('Registration and legal details are locked once your account is approved. Contact support to change them.');
    }
  }

  const updated = await prisma.ngoProfile.update({
    where: { id: profile.id },
    data: input as Prisma.NgoProfileUpdateInput,
    include: documentsInclude,
  });

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
    include: documentsInclude,
  });
}

const MAX_PAST_WORK_PHOTOS = 5;

/** Legal documents are verified at approval, so they lock like the other legal fields; past-work photos stay editable. */
function assertDocumentsEditable(profile: { status: string }, docType: NgoDocumentType) {
  if (docType !== 'past_work_photo' && (profile.status === 'approved' || profile.status === 'suspended')) {
    throw new ForbiddenError('Verification documents are locked once your account is approved. Contact support to change them.');
  }
}

/**
 * Uploads one verification document. A single-copy type (certificate, authorisation proof) replaces
 * the one on file; past-work photos are added up to the registration limit.
 */
export async function addVerificationDocument(prisma: PrismaClient, userId: string, docType: NgoDocumentType, fileUrl: string) {
  const profile = await prisma.ngoProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('NGO profile not found');
  assertDocumentsEditable(profile, docType);

  await prisma.$transaction(async (tx) => {
    if (docType === 'past_work_photo') {
      const count = await tx.ngoVerificationDocument.count({ where: { ngoId: profile.id, docType } });
      if (count >= MAX_PAST_WORK_PHOTOS) throw new BadRequestError(`At most ${MAX_PAST_WORK_PHOTOS} past-work photos`);
    } else {
      await tx.ngoVerificationDocument.deleteMany({ where: { ngoId: profile.id, docType } });
    }
    await tx.ngoVerificationDocument.create({ data: { ngoId: profile.id, docType, fileUrl } });
  });
  return getOwnProfile(prisma, userId);
}

export async function removeVerificationDocument(prisma: PrismaClient, userId: string, documentId: string) {
  const profile = await prisma.ngoProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('NGO profile not found');
  const doc = await prisma.ngoVerificationDocument.findFirst({ where: { id: documentId, ngoId: profile.id } });
  if (!doc) throw new NotFoundError('Document not found');
  assertDocumentsEditable(profile, doc.docType);
  // Proof of authority is required to register, so it can be replaced but never left empty.
  if (doc.docType === 'authorization_proof') throw new BadRequestError('Proof of authorisation is required – upload a new one to replace it.');
  await prisma.ngoVerificationDocument.delete({ where: { id: doc.id } });
  return getOwnProfile(prisma, userId);
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
    treesPlanted,
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
    prisma.drive.count({ where: { ngoId: ngo.id, ...notRescheduled } }),
    prisma.plantedTree.count({ where: { ngoId: ngo.id } }),
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
    treesPlanted,
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
        message: true,
        isAnonymous: true,
        receiptNumber: true,
        donorPan: true,
        campaign: { select: { id: true, title: true } },
        user: { select: { id: true, name: true, handle: true, avatarEmoji: true, city: true } },
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
      // The NGO always sees who gave; `isAnonymous` only hides the name from other donors.
      donor: d.user,
      message: d.message?.trim() || null,
      isAnonymous: d.isAnonymous,
      receiptNumber: d.receiptNumber,
      // Whether a PAN was given for the 80G receipt - the number itself isn't needed on this list.
      hasPan: !!d.donorPan,
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
export type VolunteerFilter = 'all' | 'upcoming' | 'inactive' | 'new' | 'noshow' | 'regular';
export type VolunteerSort = 'recent' | 'oldest' | 'active' | 'name';

export interface VolunteerQuery {
  cursor?: string;
  take?: number | string;
  search?: string;
  filter?: string;
  sort?: string;
  driveId?: string;
}

const NEW_VOLUNTEER_DAYS = 30;
const REGULAR_MIN_DRIVES = 3;
const MAX_ROSTER = 5000;

interface RollupRow {
  userId: string;
  rsvpCount: number;
  firstAt: Date;
  lastAt: Date;
  drivesAttended: number;
  noShows: number;
  hasUpcoming: boolean;
}

/**
 * One row per volunteer, built from a handful of grouped queries over the NGO's confirmed RSVPs.
 * Search / drive scoping narrow which people are included; the per-person numbers are always their
 * full history with this NGO (so "3 drives attended" never changes with the drive filter).
 */
async function volunteerRollup(prisma: PrismaClient, ngoId: string, q: VolunteerQuery): Promise<RollupRow[]> {
  const search = q.search?.trim();
  const digits = search?.replace(/\D/g, '') ?? '';
  const scope = { status: 'confirmed' as const, drive: { ngoId } };

  let userIds: string[] | undefined;
  if (search || q.driveId) {
    const matches = await prisma.driveRsvp.findMany({
      where: {
        ...scope,
        ...(q.driveId ? { driveId: q.driveId } : {}),
        ...(search
          ? {
              OR: [
                { user: { name: { contains: search, mode: 'insensitive' as const } } },
                { user: { handle: { contains: search, mode: 'insensitive' as const } } },
                ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
              ],
            }
          : {}),
      },
      select: { userId: true },
      distinct: ['userId'],
      take: MAX_ROSTER,
    });
    userIds = matches.map((m) => m.userId);
    if (userIds.length === 0) return [];
  }

  const where = { ...scope, ...(userIds ? { userId: { in: userIds } } : {}) };
  const now = new Date();
  const [all, recorded, attended, missed, upcoming] = await Promise.all([
    prisma.driveRsvp.groupBy({ by: ['userId'], where, _count: { _all: true }, _min: { createdAt: true }, _max: { createdAt: true } }),
    prisma.driveRsvp.groupBy({ by: ['userId'], where: { ...where, attended: { not: null } }, _count: { _all: true } }),
    prisma.driveRsvp.groupBy({ by: ['userId'], where: { ...where, attended: true }, _count: { _all: true } }),
    prisma.driveRsvp.groupBy({ by: ['userId'], where: { ...where, attended: false }, _count: { _all: true } }),
    prisma.driveRsvp.groupBy({
      by: ['userId'],
      where: { ...where, drive: { ngoId, status: 'upcoming', startsAt: { gt: now } } },
      _count: { _all: true },
    }),
  ]);
  const recordedBy = new Map(recorded.map((r) => [r.userId, r._count._all]));
  const attendedBy = new Map(attended.map((r) => [r.userId, r._count._all]));
  const missedBy = new Map(missed.map((r) => [r.userId, r._count._all]));
  const upcomingSet = new Set(upcoming.map((r) => r.userId));

  return all.slice(0, MAX_ROSTER).map((g) => ({
    userId: g.userId,
    rsvpCount: g._count._all,
    firstAt: g._min.createdAt as Date,
    lastAt: g._max.createdAt as Date,
    // Once the NGO has recorded attendance for this person, that's the real count; until then,
    // the RSVP count is the best available signal.
    drivesAttended: (recordedBy.get(g.userId) ?? 0) > 0 ? attendedBy.get(g.userId) ?? 0 : g._count._all,
    noShows: missedBy.get(g.userId) ?? 0,
    hasUpcoming: upcomingSet.has(g.userId),
  }));
}

function matchesVolunteerFilter(r: RollupRow, filter: VolunteerFilter, now: number) {
  switch (filter) {
    case 'upcoming': return r.hasUpcoming;
    case 'inactive': return !r.hasUpcoming;
    case 'new': return now - r.firstAt.getTime() <= NEW_VOLUNTEER_DAYS * 86_400_000;
    case 'noshow': return r.noShows > 0;
    case 'regular': return r.drivesAttended >= REGULAR_MIN_DRIVES;
    default: return true;
  }
}

/** Adds the person and their RSVP details (phone, upcoming / recent drives, ...) to rollup rows. */
async function hydrateVolunteers(prisma: PrismaClient, ngoId: string, rows: RollupRow[]) {
  const ids = rows.map((r) => r.userId);
  if (ids.length === 0) return [];

  const [users, rsvps] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, handle: true, avatarEmoji: true, avatarUrl: true, city: true, level: true, treesPlantedCount: true },
    }),
    // Every RSVP these people made to this NGO's drives - the roster rows are built from them.
    prisma.driveRsvp.findMany({
      where: { status: 'confirmed', drive: { ngoId }, userId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      select: {
        userId: true,
        createdAt: true,
        attended: true,
        hoursLogged: true,
        role: true,
        phone: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        drive: { select: { id: true, title: true, startsAt: true, status: true, city: true } },
      },
    }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const now = Date.now();
  const rsvpsByUser = new Map<string, typeof rsvps>();
  for (const r of rsvps) {
    const list = rsvpsByUser.get(r.userId) ?? [];
    list.push(r);
    rsvpsByUser.set(r.userId, list);
  }

  return rows.map((row) => {
    const u = userById.get(row.userId);
    const list = rsvpsByUser.get(row.userId) ?? []; // newest first
    const isUpcoming = (r: (typeof list)[number]) => r.drive.status === 'upcoming' && r.drive.startsAt.getTime() > now;
    const upcoming = list.filter(isUpcoming).sort((a, b) => a.drive.startsAt.getTime() - b.drive.startsAt.getTime());
    const past = list.filter((r) => !isUpcoming(r));
    const emergency = list.find((r) => r.emergencyContactName && r.emergencyContactPhone);
    return {
      userId: row.userId,
      name: u?.name ?? 'Unknown',
      handle: u?.handle ?? '',
      avatarEmoji: u?.avatarEmoji ?? '🧑',
      avatarUrl: u?.avatarUrl ?? null,
      city: u?.city ?? null,
      level: u?.level ?? 1,
      treesPlanted: u?.treesPlantedCount ?? 0,
      drivesAttended: row.drivesAttended,
      lastActiveAt: row.lastAt,
      // Most recent RSVP that has them, since people change numbers.
      phone: list.find((r) => r.phone)?.phone ?? null,
      emergencyContactName: emergency?.emergencyContactName ?? null,
      emergencyContactPhone: emergency?.emergencyContactPhone ?? null,
      rsvpCount: row.rsvpCount,
      noShows: row.noShows,
      hoursLogged: Math.round(list.reduce((sum, r) => sum + (r.hoursLogged ?? 0), 0) * 10) / 10,
      roles: [...new Set(list.map((r) => r.role).filter((x): x is string => !!x))],
      volunteeringSince: row.firstAt,
      upcomingCount: upcoming.length,
      upcoming: upcoming.slice(0, 3).map((r) => ({ driveId: r.drive.id, title: r.drive.title, startsAt: r.drive.startsAt, city: r.drive.city })),
      recent: past.slice(0, 3).map((r) => ({
        driveId: r.drive.id,
        title: r.drive.title,
        startsAt: r.drive.startsAt,
        cancelled: r.drive.status === 'cancelled',
        attended: r.attended,
      })),
    };
  });
}

/** Filter + sort the rollup. Returns every matching row (unpaged) plus the chip counts. */
async function filteredVolunteerRows(prisma: PrismaClient, ngoId: string, q: VolunteerQuery) {
  const rows = await volunteerRollup(prisma, ngoId, q);
  const now = Date.now();
  const filters: VolunteerFilter[] = ['all', 'upcoming', 'inactive', 'new', 'noshow', 'regular'];
  const counts = Object.fromEntries(filters.map((f) => [f, rows.filter((r) => matchesVolunteerFilter(r, f, now)).length])) as Record<VolunteerFilter, number>;

  const filter = (filters as string[]).includes(q.filter ?? '') ? (q.filter as VolunteerFilter) : 'all';
  const matched = rows.filter((r) => matchesVolunteerFilter(r, filter, now));

  const sort: VolunteerSort = ['recent', 'oldest', 'active', 'name'].includes(q.sort ?? '') ? (q.sort as VolunteerSort) : 'recent';
  if (sort === 'name') {
    const names = await prisma.user.findMany({ where: { id: { in: matched.map((r) => r.userId) } }, select: { id: true, name: true } });
    const nameById = new Map(names.map((n) => [n.id, n.name.toLowerCase()]));
    matched.sort((a, b) => (nameById.get(a.userId) ?? '').localeCompare(nameById.get(b.userId) ?? ''));
  } else if (sort === 'oldest') {
    matched.sort((a, b) => a.firstAt.getTime() - b.firstAt.getTime());
  } else if (sort === 'active') {
    matched.sort((a, b) => b.drivesAttended - a.drivesAttended || b.rsvpCount - a.rsvpCount || b.lastAt.getTime() - a.lastAt.getTime());
  } else {
    matched.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
  }
  return { matched, counts };
}

export async function getOwnVolunteers(prisma: PrismaClient, userId: string, q: VolunteerQuery = {}) {
  const ngo = await requireNgoProfile(prisma, userId);
  const take = parseTake(q.take, 30, 100);
  // A volunteer has no record of their own, so the page is a window over the per-user rollup of
  // RSVPs; the cursor is just the offset into that ordering.
  const offset = Math.max(Number.parseInt(q.cursor ?? '0', 10) || 0, 0);

  const { matched, counts } = await filteredVolunteerRows(prisma, ngo.id, q);
  const page = matched.slice(offset, offset + take);

  return {
    items: await hydrateVolunteers(prisma, ngo.id, page),
    nextCursor: offset + take < matched.length ? String(offset + take) : null,
    total: matched.length,
    counts,
  };
}

/**
 * NGO-initiated removal of a volunteer. A "volunteer" has no dedicated record (see
 * getOwnVolunteers above), so this cancels their confirmed RSVPs to this NGO's *upcoming* drives —
 * completed drives are left untouched so past attendance history/stats aren't rewritten. Someone
 * whose only participation was in the past will still show up in the volunteers list afterward,
 * since that history is exactly what makes them a volunteer.
 */
export async function removeVolunteer(prisma: PrismaClient, ngoUserId: string, targetUserId: string, reason: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);

  const rsvps = await prisma.driveRsvp.findMany({
    where: { userId: targetUserId, status: 'confirmed', drive: { ngoId: ngo.id, status: 'upcoming' } },
    include: { drive: { select: { id: true, title: true } } },
  });

  if (rsvps.length > 0) {
    await prisma.driveRsvp.updateMany({
      where: { id: { in: rsvps.map((r) => r.id) } },
      // cancelReason marks who ended it; the organiser's own words go in cancelNote.
      data: { status: 'cancelled', cancelReason: 'removed_by_organizer', cancelNote: reason },
    });

    for (const r of rsvps) {
      await notify(prisma, {
        userId: targetUserId,
        type: 'drive_reminder',
        actorNgoId: ngo.id,
        data: {
          driveId: r.drive.id,
          driveTitle: r.drive.title,
          kind: 'removed_by_ngo',
          reason,
          message: `${ngo.orgName} cancelled your RSVP to “${r.drive.title}”. Reason: “${reason}”.`,
        },
        push: { title: r.drive.title, body: `Your RSVP was cancelled by the organizer: ${reason}` },
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
