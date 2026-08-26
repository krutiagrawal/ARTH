import { PrismaClient } from '@plant/db';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';

export const MAX_PORTFOLIO_MEDIA = 6;

const portfolioInclude = {
  media: { orderBy: { order: 'asc' as const }, select: { id: true, url: true, order: true, caption: true } },
};

export function serializePortfolioEntry(e: any) {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    happenedOn: e.happenedOn,
    locationLabel: e.locationLabel,
    city: e.city,
    treesPlanted: e.treesPlanted,
    volunteersInvolved: e.volunteersInvolved,
    partnerOrgs: e.partnerOrgs,
    sortOrder: e.sortOrder,
    media: e.media.map((m: any) => ({ id: m.id, url: m.url, order: m.order, caption: m.caption })),
    createdAt: e.createdAt,
  };
}

/** Newest work first; `sortOrder` lets an NGO pin a flagship project to the top. */
const portfolioOrder = [{ sortOrder: 'desc' as const }, { happenedOn: 'desc' as const }];

export async function listOwnPortfolio(prisma: PrismaClient, ngoUserId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const entries = await prisma.ngoPortfolioEntry.findMany({
    where: { ngoId: ngo.id },
    orderBy: portfolioOrder,
    include: portfolioInclude,
  });
  return entries.map(serializePortfolioEntry);
}

export async function listPublicPortfolio(prisma: PrismaClient, ngoId: string) {
  const entries = await prisma.ngoPortfolioEntry.findMany({
    where: { ngoId, ngo: { status: 'approved' } },
    orderBy: portfolioOrder,
    include: portfolioInclude,
  });
  return entries.map(serializePortfolioEntry);
}

/**
 * Totals from archived work, surfaced on the public profile as a clearly separate line.
 *
 * Kept apart from PlantedTree on purpose: those rows have health checks behind them and feed the
 * survival rate, while these are self-reported historical figures with nothing to verify them.
 * Blending the two would quietly corrupt the survival statistic.
 */
export async function getPortfolioImpact(prisma: PrismaClient, ngoId: string) {
  const agg = await prisma.ngoPortfolioEntry.aggregate({
    where: { ngoId },
    _sum: { treesPlanted: true, volunteersInvolved: true },
    _count: true,
  });
  return {
    entries: agg._count,
    treesPlanted: agg._sum.treesPlanted ?? 0,
    volunteersInvolved: agg._sum.volunteersInvolved ?? 0,
  };
}

interface PortfolioInput {
  title: string;
  description?: string;
  happenedOn: Date;
  locationLabel?: string;
  city?: string;
  treesPlanted?: number;
  volunteersInvolved?: number;
  partnerOrgs?: string;
  sortOrder?: number;
  mediaUrls?: string[];
}

export async function createPortfolioEntry(prisma: PrismaClient, ngoUserId: string, input: PortfolioInput) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);

  if ((input.mediaUrls?.length ?? 0) > MAX_PORTFOLIO_MEDIA) {
    throw new BadRequestError(`A past-work entry can have at most ${MAX_PORTFOLIO_MEDIA} photos`);
  }
  if (input.happenedOn.getTime() > Date.now()) {
    throw new BadRequestError('Past work must have a date in the past — use Drives for upcoming events');
  }

  const entry = await prisma.ngoPortfolioEntry.create({
    data: {
      ngoId: ngo.id,
      title: input.title,
      description: input.description,
      happenedOn: input.happenedOn,
      locationLabel: input.locationLabel,
      city: input.city,
      treesPlanted: input.treesPlanted,
      volunteersInvolved: input.volunteersInvolved,
      partnerOrgs: input.partnerOrgs,
      sortOrder: input.sortOrder ?? 0,
      media: { create: (input.mediaUrls ?? []).map((url, order) => ({ url, order })) },
    },
    include: portfolioInclude,
  });

  return serializePortfolioEntry(entry);
}

async function requireOwnEntry(prisma: PrismaClient, ngoUserId: string, entryId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const entry = await prisma.ngoPortfolioEntry.findFirst({ where: { id: entryId, ngoId: ngo.id } });
  if (!entry) throw new NotFoundError('Past work entry not found');
  return entry;
}

export async function updatePortfolioEntry(
  prisma: PrismaClient,
  ngoUserId: string,
  entryId: string,
  input: Partial<PortfolioInput>,
) {
  const entry = await requireOwnEntry(prisma, ngoUserId, entryId);

  if ((input.mediaUrls?.length ?? 0) > MAX_PORTFOLIO_MEDIA) {
    throw new BadRequestError(`A past-work entry can have at most ${MAX_PORTFOLIO_MEDIA} photos`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Photos are replaced wholesale when new ones are sent, and left alone otherwise — the
    // editor always submits the full set it wants to end up with.
    if (input.mediaUrls) {
      await tx.ngoPortfolioMedia.deleteMany({ where: { entryId: entry.id } });
    }

    return tx.ngoPortfolioEntry.update({
      where: { id: entry.id },
      data: {
        title: input.title,
        description: input.description,
        happenedOn: input.happenedOn,
        locationLabel: input.locationLabel,
        city: input.city,
        treesPlanted: input.treesPlanted,
        volunteersInvolved: input.volunteersInvolved,
        partnerOrgs: input.partnerOrgs,
        sortOrder: input.sortOrder,
        ...(input.mediaUrls
          ? { media: { create: input.mediaUrls.map((url, order) => ({ url, order })) } }
          : {}),
      },
      include: portfolioInclude,
    });
  });

  return serializePortfolioEntry(updated);
}

export async function deletePortfolioEntry(prisma: PrismaClient, ngoUserId: string, entryId: string) {
  const entry = await requireOwnEntry(prisma, ngoUserId, entryId);
  await prisma.ngoPortfolioEntry.delete({ where: { id: entry.id } });
}
