import { PrismaClient } from '@plant/db';
import { ForbiddenError, NotFoundError } from '../utils/errors';

interface UpdateProfileInput {
  companyName?: string;
  description?: string;
  logoUrl?: string;
  city?: string;
  industry?: string;
}

interface SponsorshipInput {
  driveId?: string;
  amountCents: number;
  note?: string;
}

export async function getOwnProfile(prisma: PrismaClient, userId: string) {
  const profile = await prisma.corporateProfile.findUnique({ where: { userId } });
  if (!profile) throw new NotFoundError('Corporate profile not found');
  return profile;
}

export async function updateOwnProfile(prisma: PrismaClient, userId: string, input: UpdateProfileInput) {
  const profile = await getOwnProfile(prisma, userId);
  return prisma.corporateProfile.update({ where: { id: profile.id }, data: input });
}

// Mirrors ngo.service.ts's resubmitProfile.
export async function resubmitProfile(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  if (profile.status !== 'rejected') throw new ForbiddenError('Only a rejected application can be resubmitted');

  return prisma.corporateProfile.update({
    where: { id: profile.id },
    data: { status: 'pending', rejectionReason: null, approvedAt: null, approvedByUserId: null },
  });
}

export async function requireApprovedCorporateProfile(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  if (profile.status !== 'approved') throw new ForbiddenError('Your corporate account is not yet approved');
  return profile;
}

export async function getOwnStats(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  const sponsorships = await prisma.csrSponsorship.findMany({ where: { corporateId: profile.id } });

  return {
    sponsorshipCount: sponsorships.length,
    totalSponsoredCents: sponsorships.reduce((sum, s) => sum + s.amountCents, 0),
  };
}

export async function listSponsorships(prisma: PrismaClient, userId: string) {
  const profile = await getOwnProfile(prisma, userId);
  return prisma.csrSponsorship.findMany({
    where: { corporateId: profile.id },
    orderBy: { createdAt: 'desc' },
    include: { drive: { select: { id: true, title: true } } },
  });
}

export async function createSponsorship(prisma: PrismaClient, userId: string, input: SponsorshipInput) {
  const profile = await requireApprovedCorporateProfile(prisma, userId);

  if (input.driveId) {
    const drive = await prisma.drive.findUnique({ where: { id: input.driveId } });
    if (!drive) throw new NotFoundError('Drive not found');
  }

  return prisma.csrSponsorship.create({ data: { corporateId: profile.id, ...input } });
}

export async function deleteSponsorship(prisma: PrismaClient, userId: string, sponsorshipId: string) {
  const profile = await getOwnProfile(prisma, userId);
  const result = await prisma.csrSponsorship.deleteMany({ where: { id: sponsorshipId, corporateId: profile.id } });
  if (result.count === 0) throw new NotFoundError('Sponsorship not found');
}
