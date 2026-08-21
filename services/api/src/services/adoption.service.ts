import { PrismaClient } from '@prisma/client';
import { ConflictError, NotFoundError } from '../utils/errors';
import { geocodeAddress } from '../utils/geocode';
import { haversineDistanceKm } from '../utils/geo';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';

interface CreateAdoptableTreeInput {
  nickname: string;
  speciesName: string;
  description: string;
  instructions?: string;
  city: string;
  locationLabel?: string;
  photoUrl?: string;
}

interface UpdateAdoptableTreeInput {
  nickname?: string;
  speciesName?: string;
  description?: string;
  instructions?: string;
  city?: string;
  locationLabel?: string;
  photoUrl?: string;
}

interface NearbyFilter {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  limit?: number;
}

interface OwnedListFilter {
  q?: string;
  page?: number;
  take?: number;
}

const adoptableTreeInclude = { ngo: true, adoption: { include: { user: { select: { name: true, handle: true } } } } };

async function findOwnedTreeOrThrow(prisma: PrismaClient, ngoUserId: string, treeId: string) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const tree = await prisma.adoptableTree.findFirst({ where: { id: treeId, ngoId: ngo.id } });
  if (!tree) throw new NotFoundError('Adoptable tree not found');
  return tree;
}


export async function createAdoptableTree(prisma: PrismaClient, ngoUserId: string, input: CreateAdoptableTreeInput) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);
  const geo = await geocodeAddress(`${input.locationLabel ?? ''}, ${input.city}`);
  return prisma.adoptableTree.create({
    data: { ngoId: ngo.id, ...input, lat: geo?.lat, lng: geo?.lng },
    include: adoptableTreeInclude,
  });
}

export async function updateAdoptableTree(
  prisma: PrismaClient,
  ngoUserId: string,
  treeId: string,
  input: UpdateAdoptableTreeInput,
) {
  const tree = await findOwnedTreeOrThrow(prisma, ngoUserId, treeId);

  let geo: { lat: number; lng: number } | null | undefined;
  if (input.city !== undefined || input.locationLabel !== undefined) {
    const locationLabel = input.locationLabel ?? tree.locationLabel ?? '';
    const city = input.city ?? tree.city ?? '';
    geo = await geocodeAddress(`${locationLabel}, ${city}`);
  }

  return prisma.adoptableTree.update({
    where: { id: tree.id },
    data: { ...input, ...(geo !== undefined ? { lat: geo?.lat ?? null, lng: geo?.lng ?? null } : {}) },
    include: adoptableTreeInclude,
  });
}

export async function removeAdoptableTree(prisma: PrismaClient, ngoUserId: string, treeId: string) {
  const tree = await findOwnedTreeOrThrow(prisma, ngoUserId, treeId);
  return prisma.adoptableTree.update({
    where: { id: tree.id },
    data: { status: 'removed' },
    include: adoptableTreeInclude,
  });
}

export async function listAdoptableTrees(prisma: PrismaClient, filter: NearbyFilter) {
  const trees = await prisma.adoptableTree.findMany({
    where: { status: 'available', ngo: { status: 'approved' } },
    include: adoptableTreeInclude,
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  let results = trees.map((tree) => ({
    tree,
    distanceKm:
      filter.lat !== undefined && filter.lng !== undefined && tree.lat !== null && tree.lng !== null
        ? haversineDistanceKm({ lat: filter.lat, lng: filter.lng }, { lat: Number(tree.lat), lng: Number(tree.lng) })
        : undefined,
  }));

  if (filter.radiusKm !== undefined && filter.lat !== undefined) {
    results = results.filter((r) => (r.distanceKm ?? Infinity) <= filter.radiusKm!);
  }

  if (filter.lat !== undefined && filter.lng !== undefined) {
    results.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  return results.slice(0, filter.limit ?? 100);
}

export async function getAdoptableTree(prisma: PrismaClient, treeId: string) {
  const tree = await prisma.adoptableTree.findUnique({ where: { id: treeId }, include: adoptableTreeInclude });
  if (!tree) throw new NotFoundError('Adoptable tree not found');
  return tree;
}

export async function listOwnedAdoptableTrees(prisma: PrismaClient, ngoUserId: string, filter: OwnedListFilter = {}) {
  const ngo = await requireNgoProfile(prisma, ngoUserId);
  const take = Math.min(filter.take ?? 50, 50);
  const page = Math.max(filter.page ?? 1, 1);

  return prisma.adoptableTree.findMany({
    where: {
      ngoId: ngo.id,
      ...(filter.q ? { nickname: { contains: filter.q, mode: 'insensitive' as const } } : {}),
    },
    include: adoptableTreeInclude,
    orderBy: { createdAt: 'desc' },
    take,
    skip: (page - 1) * take,
  });
}

export async function releaseAdoption(prisma: PrismaClient, ngoUserId: string, treeId: string) {
  const tree = await findOwnedTreeOrThrow(prisma, ngoUserId, treeId);
  if (tree.status !== 'adopted') throw new ConflictError('This tree is not currently adopted');

  return prisma.$transaction(async (tx) => {
    await tx.adoption.delete({ where: { adoptableTreeId: tree.id } });
    return tx.adoptableTree.update({
      where: { id: tree.id },
      data: { status: 'available' },
      include: adoptableTreeInclude,
    });
  });
}

export async function adoptTree(prisma: PrismaClient, userId: string, treeId: string, message?: string) {
  return prisma.$transaction(async (tx) => {
    const tree = await tx.adoptableTree.findUnique({ where: { id: treeId } });
    if (!tree || tree.status !== 'available') throw new ConflictError('This tree is no longer available for adoption');

    await tx.adoptableTree.update({ where: { id: treeId }, data: { status: 'adopted' } });

    return tx.adoption.create({
      data: { adoptableTreeId: treeId, userId, message },
      include: { adoptableTree: { include: adoptableTreeInclude } },
    });
  });
}
