import { PrismaClient, isValidPublicId } from '@arth/db';
import { NotFoundError } from '../utils/errors';

const PUBLIC_PERSON_SELECT = { id: true, name: true, handle: true, avatarEmoji: true } as const;

export type PassportResolution = { kind: 'individual'; id: string } | { kind: 'ngo'; id: string };

// Shared by the GET /api/trees/resolve/:publicId route and getPassportByPublicId below — probes
// Tree first, then PlantedTree. The two models stay deliberately separate (see schema.prisma),
// so a publicId's prefix doesn't encode which one it is; this lookup does.
export async function resolvePublicId(prisma: PrismaClient, rawPublicId: string): Promise<PassportResolution> {
  const publicId = rawPublicId.trim().toUpperCase();
  if (!isValidPublicId(publicId)) throw new NotFoundError('Tree not found');

  const tree = await prisma.tree.findUnique({ where: { publicId }, select: { id: true } });
  if (tree) return { kind: 'individual', id: tree.id };

  const plantedTree = await prisma.plantedTree.findUnique({ where: { publicId }, select: { id: true } });
  if (plantedTree) return { kind: 'ngo', id: plantedTree.id };

  throw new NotFoundError('Tree not found');
}

interface TimelineEntry {
  id: string;
  source: 'planted' | 'verified' | 'health_check' | 'observation';
  status: string | null;
  note: string | null;
  photoUrl: string | null;
  at: Date;
  observerRole?: 'owner' | 'ngo' | 'community';
  observer?: { id: string; name: string; handle: string } | null;
}

async function buildIndividualPassport(prisma: PrismaClient, treeId: string) {
  const tree = await prisma.tree.findFirst({
    where: { id: treeId, isDeleted: false },
    include: {
      species: { select: { id: true, commonName: true, emoji: true } },
      user: { select: PUBLIC_PERSON_SELECT },
      nursery: { select: { id: true, nurseryName: true, logoUrl: true } },
      sourceUnit: {
        select: { id: true, speciesNameSnapshot: true, ageAtSupplyLabel: true, supplyDate: true, nurseryId: true },
      },
      observations: {
        orderBy: { createdAt: 'desc' },
        include: { observerUser: { select: { id: true, name: true, handle: true } } },
      },
    },
  });
  if (!tree) throw new NotFoundError('Tree not found');

  const timeline: TimelineEntry[] = [
    { id: `${tree.id}-planted`, source: 'planted' as const, status: null, note: null, photoUrl: tree.photoUrl, at: tree.plantedAt },
    ...(tree.reviewedAt
      ? [
          {
            id: `${tree.id}-verified`,
            source: 'verified' as const,
            status: tree.aiVerificationStatus,
            note: null,
            photoUrl: null,
            at: tree.reviewedAt,
          },
        ]
      : []),
    ...tree.observations.map((o) => ({
      id: o.id,
      source: 'observation' as const,
      status: o.status,
      note: o.note,
      photoUrl: o.photoUrl,
      at: o.createdAt,
      observerRole: o.observerRole,
      observer: o.observerUser,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return {
    kind: 'individual' as const,
    id: tree.id,
    publicId: tree.publicId,
    nickname: tree.nickname,
    species: tree.species,
    plantedAt: tree.plantedAt,
    locationLabel: tree.locationLabel,
    lat: Number(tree.lat),
    lng: Number(tree.lng),
    photoUrl: tree.photoUrl,
    co2Absorbed: Number(tree.co2Absorbed),
    xpEarned: tree.xpEarned,
    aiVerificationStatus: tree.aiVerificationStatus,
    healthStatus: tree.healthStatus,
    owner: tree.user,
    nursery: tree.nursery,
    sourceUnit: tree.sourceUnit,
    timeline,
  };
}

async function buildNgoPassport(prisma: PrismaClient, plantedTreeId: string) {
  const tree = await prisma.plantedTree.findFirst({
    where: { id: plantedTreeId },
    include: {
      ngo: { select: { id: true, orgName: true, logoUrl: true } },
      drive: { select: { id: true, title: true } },
      zone: { select: { id: true, name: true } },
      sourceUnit: {
        select: { id: true, speciesNameSnapshot: true, ageAtSupplyLabel: true, supplyDate: true, nurseryId: true },
      },
      healthChecks: { orderBy: { checkedAt: 'desc' } },
      observations: {
        orderBy: { createdAt: 'desc' },
        include: { observerUser: { select: { id: true, name: true, handle: true } } },
      },
      adoptableListings: {
        include: { adoption: { include: { user: { select: PUBLIC_PERSON_SELECT } } } },
      },
    },
  });
  if (!tree) throw new NotFoundError('Tree not found');

  const timeline: TimelineEntry[] = [
    { id: `${tree.id}-planted`, source: 'planted' as const, status: null, note: null, photoUrl: tree.photoUrl, at: tree.plantedAt },
    ...tree.healthChecks.map((c) => ({
      id: c.id,
      source: 'health_check' as const,
      status: c.status,
      note: c.notes,
      photoUrl: c.photoUrl,
      at: c.checkedAt,
    })),
    ...tree.observations.map((o) => ({
      id: o.id,
      source: 'observation' as const,
      status: o.status,
      note: o.note,
      photoUrl: o.photoUrl,
      at: o.createdAt,
      observerRole: o.observerRole,
      observer: o.observerUser,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const latestStatus = timeline.find((e) => e.status)?.status ?? 'not_checked';
  // An AdoptableTree listing created FROM this PlantedTree (Phase 5 writes this link) whose
  // Adoption has actually been claimed — a listing with no claimed Adoption yet contributes
  // nothing here.
  const adopter = tree.adoptableListings.find((l) => l.adoption)?.adoption?.user ?? null;

  return {
    kind: 'ngo' as const,
    id: tree.id,
    publicId: tree.publicId,
    speciesName: tree.speciesName,
    label: tree.label,
    plantedAt: tree.plantedAt,
    locationLabel: tree.locationLabel,
    lat: tree.lat !== null ? Number(tree.lat) : null,
    lng: tree.lng !== null ? Number(tree.lng) : null,
    photoUrl: tree.photoUrl,
    ngo: tree.ngo,
    drive: tree.drive,
    zone: tree.zone,
    sourceUnit: tree.sourceUnit,
    adopter,
    healthStatus: latestStatus,
    timeline,
  };
}

export async function getPassportByInternalId(prisma: PrismaClient, kind: 'tree' | 'planted-tree', id: string) {
  return kind === 'tree' ? buildIndividualPassport(prisma, id) : buildNgoPassport(prisma, id);
}

export async function getPassportByPublicId(prisma: PrismaClient, publicId: string) {
  const resolution = await resolvePublicId(prisma, publicId);
  return resolution.kind === 'individual'
    ? buildIndividualPassport(prisma, resolution.id)
    : buildNgoPassport(prisma, resolution.id);
}
