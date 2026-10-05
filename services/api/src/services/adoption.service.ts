import { PrismaClient } from '@arth/db';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { geocodeAddress } from '../utils/geocode';
import { haversineDistanceKm } from '../utils/geo';
import { requireApprovedNgoProfile, requireNgoProfile } from './ngo.service';
import { notify } from './notification.service';

interface CreateAdoptableTreeInput {
  nickname: string;
  speciesName: string;
  description: string;
  instructions?: string;
  city: string;
  locationLabel?: string;
  photoUrl?: string;
  // Present only when this listing is created FROM a real PlantedTree row — lets the listing
  // resolve to an actual tree identity (so its Passport's "People" section can show the
  // adopter), per "connect, don't force" — existing standalone listings (this field omitted)
  // keep their own fields as the only source of truth, exactly as before.
  plantedTreeId?: string;
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
  ngoId?: string;
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
  return { ngo, tree };
}


export async function createAdoptableTree(prisma: PrismaClient, ngoUserId: string, input: CreateAdoptableTreeInput) {
  const ngo = await requireApprovedNgoProfile(prisma, ngoUserId);

  let plantedTreeFields: { speciesName?: string; photoUrl?: string | null; locationLabel?: string | null; lat?: number; lng?: number } = {};
  if (input.plantedTreeId) {
    const plantedTree = await prisma.plantedTree.findFirst({ where: { id: input.plantedTreeId, ngoId: ngo.id } });
    if (!plantedTree) throw new NotFoundError('Planted tree not found');
    plantedTreeFields = {
      speciesName: plantedTree.speciesName,
      photoUrl: plantedTree.photoUrl,
      locationLabel: plantedTree.locationLabel,
      lat: plantedTree.lat !== null ? Number(plantedTree.lat) : undefined,
      lng: plantedTree.lng !== null ? Number(plantedTree.lng) : undefined,
    };
  }

  // Only geocode from the city/address when there's no real PlantedTree coordinate to use
  // instead — unchanged behavior for every standalone listing.
  const geo = plantedTreeFields.lat === undefined ? await geocodeAddress(`${input.locationLabel ?? ''}, ${input.city}`) : null;

  return prisma.adoptableTree.create({
    data: {
      ngoId: ngo.id,
      nickname: input.nickname,
      speciesName: plantedTreeFields.speciesName ?? input.speciesName,
      description: input.description,
      instructions: input.instructions,
      city: input.city,
      locationLabel: plantedTreeFields.locationLabel ?? input.locationLabel,
      photoUrl: plantedTreeFields.photoUrl ?? input.photoUrl,
      lat: plantedTreeFields.lat ?? geo?.lat,
      lng: plantedTreeFields.lng ?? geo?.lng,
      plantedTreeId: input.plantedTreeId,
    },
    include: adoptableTreeInclude,
  });
}

export async function updateAdoptableTree(
  prisma: PrismaClient,
  ngoUserId: string,
  treeId: string,
  input: UpdateAdoptableTreeInput,
) {
  const { tree } = await findOwnedTreeOrThrow(prisma, ngoUserId, treeId);

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

/**
 * Delisting a tree that's currently adopted must not leave an orphaned Adoption row pointing at
 * a tree the adopter can no longer see anywhere else (it would still show in "My Adopted Trees"
 * with a working Release button that — since there'd be no removed-status check — would put the
 * tree straight back in the public pool, undoing the NGO's removal without them ever knowing).
 * So an active adoption is released as part of removal, and the adopter is told why.
 */
export async function removeAdoptableTree(prisma: PrismaClient, ngoUserId: string, treeId: string) {
  const { ngo, tree } = await findOwnedTreeOrThrow(prisma, ngoUserId, treeId);

  const { updated, releasedAdopterId } = await prisma.$transaction(async (tx) => {
    let releasedAdopterId: string | null = null;
    if (tree.status === 'adopted') {
      const adoption = await tx.adoption.findUnique({ where: { adoptableTreeId: tree.id } });
      if (adoption) {
        releasedAdopterId = adoption.userId;
        await tx.adoption.delete({ where: { adoptableTreeId: tree.id } });
      }
    }
    const updated = await tx.adoptableTree.update({
      where: { id: tree.id },
      data: { status: 'removed' },
      include: adoptableTreeInclude,
    });
    return { updated, releasedAdopterId };
  });

  if (releasedAdopterId) {
    await notify(prisma, {
      userId: releasedAdopterId,
      type: 'adoptable_tree_removed',
      actorNgoId: ngo.id,
      data: { treeId: tree.id, treeNickname: tree.nickname },
      push: { title: ngo.orgName, body: `Removed the listing for "${tree.nickname}" — your adoption of it has ended.` },
    });
  }

  return updated;
}

export async function listAdoptableTrees(prisma: PrismaClient, filter: NearbyFilter) {
  const trees = await prisma.adoptableTree.findMany({
    // Adopted trees stay listed (status: 'available' | 'adopted') so people can still see what's
    // already been claimed — only a genuinely retracted ('removed') tree is hidden.
    where: { status: { not: 'removed' }, ngo: { status: 'approved' }, ...(filter.ngoId ? { ngoId: filter.ngoId } : {}) },
    include: adoptableTreeInclude,
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
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
  const { tree } = await findOwnedTreeOrThrow(prisma, ngoUserId, treeId);
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

export async function listMyAdoptedTrees(prisma: PrismaClient, userId: string) {
  const adoptions = await prisma.adoption.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { adoptableTree: { include: adoptableTreeInclude } },
  });
  return adoptions.map((a) => a.adoptableTree);
}

/** Self-service sibling of releaseAdoption (NGO-initiated) — the adopter gives up their own tree. */
export async function releaseAdoptionByUser(prisma: PrismaClient, userId: string, treeId: string) {
  const adoption = await prisma.adoption.findFirst({ where: { adoptableTreeId: treeId, userId } });
  if (!adoption) throw new NotFoundError('You have not adopted this tree');

  return prisma.$transaction(async (tx) => {
    await tx.adoption.delete({ where: { adoptableTreeId: treeId } });
    return tx.adoptableTree.update({
      where: { id: treeId },
      data: { status: 'available' },
      include: adoptableTreeInclude,
    });
  });
}

export async function adoptTree(prisma: PrismaClient, userId: string, treeId: string, message?: string) {
  const adoption = await prisma.$transaction(async (tx) => {
    const tree = await tx.adoptableTree.findUnique({ where: { id: treeId }, include: { ngo: { select: { userId: true, orgName: true } } } });
    if (!tree || tree.status !== 'available') throw new ConflictError('This tree is no longer available for adoption');
    if (tree.ngo.userId === userId) throw new ForbiddenError('You cannot adopt your own listed tree');

    await tx.adoptableTree.update({ where: { id: treeId }, data: { status: 'adopted' } });

    const created = await tx.adoption.create({
      data: { adoptableTreeId: treeId, userId, message },
      include: { adoptableTree: { include: adoptableTreeInclude } },
    });

    return { created, tree };
  });

  const adopter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await notify(prisma, {
    userId: adoption.tree.ngo.userId,
    type: 'ngo_tree_adopted',
    actorUserId: userId,
    data: { treeId, treeNickname: adoption.tree.nickname },
    push: { title: adoption.tree.ngo.orgName, body: `${adopter?.name ?? 'Someone'} adopted ${adoption.tree.nickname}` },
  });

  return adoption.created;
}
