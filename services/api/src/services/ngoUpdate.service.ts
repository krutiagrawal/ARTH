import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';

interface CreateUpdateInput {
  caption?: string;
  driveId?: string;
  photoUrl?: string;
}

interface Pagination {
  page?: number;
  take?: number;
}

export const updateInclude = {
  ngo: { select: { id: true, orgName: true, logoUrl: true } },
  drive: { select: { id: true, title: true } },
};

export async function listOwnUpdates(prisma: PrismaClient, ngoUserId: string, filter: Pagination = {}) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  return prisma.ngoUpdate.findMany({
    where: { ngoId: ngo.id },
    include: updateInclude,
    orderBy: { createdAt: 'desc' },
    take,
    skip: (page - 1) * take,
  });
}

export async function createUpdate(prisma: PrismaClient, ngoUserId: string, input: CreateUpdateInput) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);

  if (input.driveId) {
    const drive = await prisma.drive.findFirst({ where: { id: input.driveId, ngoId: ngo.id } });
    if (!drive) throw new NotFoundError('Drive not found');
  }

  return prisma.ngoUpdate.create({
    data: { ngoId: ngo.id, caption: input.caption, driveId: input.driveId, photoUrl: input.photoUrl },
    include: updateInclude,
  });
}

export async function deleteUpdate(prisma: PrismaClient, ngoUserId: string, updateId: string) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const update = await prisma.ngoUpdate.findFirst({ where: { id: updateId, ngoId: ngo.id } });
  if (!update) throw new NotFoundError('Update not found');
  await prisma.ngoUpdate.delete({ where: { id: update.id } });
}

// Public feed of one NGO's updates — used by the public profile page.
export async function listPublicUpdates(prisma: PrismaClient, ngoId: string, filter: Pagination = {}) {
  const take = Math.min(filter.take ?? 20, 50);
  const page = Math.max(filter.page ?? 1, 1);

  return prisma.ngoUpdate.findMany({
    where: { ngoId, ngo: { status: 'approved' } },
    include: updateInclude,
    orderBy: { createdAt: 'desc' },
    take,
    skip: (page - 1) * take,
  });
}
