import { FastifyInstance } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { plantTreeSchema, updateTreeSchema, logOwnObservationSchema } from '../schemas/trees.schema';
import { saveTreePhoto, saveHealthCheckPhoto } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import { plantTree } from '../services/tree.service';
import { logOwnerObservation } from '../services/treeObservation.service';
import { verifyPlantingPhoto } from '../services/aiVerification.service';
import { assertGpsNotMocked, assertGpsAccuracy } from '../services/plantingLocation.service';
import { resolvePublicId, getPassportByInternalId } from '../services/treePassport.service';
import { findNearbyTrees } from '../services/nearbyTrees.service';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { treeImpactFields } from '../lib/treeImpact';

const DEFAULT_NEARBY_RADIUS_METERS = 800;
const MIN_NEARBY_RADIUS_METERS = 100;
const MAX_NEARBY_RADIUS_METERS = 1000;

async function extractPhoto(body: Record<string, MultipartFile | { value: string }>) {
  for (const part of Object.values(body ?? {})) {
    if ((part as MultipartFile).file !== undefined || (part as MultipartFile).toBuffer) {
      const photoFile = part as MultipartFile;
      return { filename: photoFile.filename, mimetype: photoFile.mimetype, buffer: await photoFile.toBuffer() };
    }
  }
  return undefined;
}

function serializeTree(tree: any) {
  return {
    id: tree.id,
    publicId: tree.publicId,
    species: tree.species?.commonName,
    speciesId: tree.speciesId,
    speciesEmoji: tree.species?.emoji,
    nickname: tree.nickname,
    plantedAt: tree.plantedAt,
    location: tree.locationLabel,
    lat: Number(tree.lat),
    lng: Number(tree.lng),
    growthStage: tree.growthStage,
    healthStatus: tree.healthStatus,
    photoUri: tree.photoUrl,
    ...treeImpactFields(tree),
    xpEarned: tree.xpEarned,
    aiVerificationStatus: tree.aiVerificationStatus,
  };
}

export default async function treesRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { limit?: string; page?: string } }>('/', async (request, reply) => {
    const limit = Math.min(Number(request.query.limit) || 50, 100);
    const page = Math.max(Number(request.query.page) || 1, 1);

    const trees = await fastify.prisma.tree.findMany({
      where: { userId: request.user!.id, isDeleted: false },
      include: { species: true },
      orderBy: { plantedAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    reply.send(trees.map(serializeTree));
  });

  fastify.get<{ Querystring: { scope?: 'mine' | 'global'; nurseryId?: string } }>('/map', async (request, reply) => {
    const scope = request.query.scope ?? 'mine';
    const trees = await fastify.prisma.tree.findMany({
      where: {
        ...(scope === 'mine' ? { userId: request.user!.id } : {}),
        isDeleted: false,
        ...(request.query.nurseryId ? { nurseryId: request.query.nurseryId } : {}),
      },
      include: { species: true },
      take: 500,
    });

    reply.send(trees.map(serializeTree));
  });

  // Broad-radius ("Trees Near Me") discovery — deliberately a much looser gate than observation
  // eligibility (see plantingLocation.service.ts's assertCloseEnoughToObserve), and the
  // coordinates it returns are privacy-jittered, never the true stored position.
  fastify.get<{ Querystring: { lat?: string; lng?: string; radius?: string } }>('/nearby', async (request, reply) => {
    const lat = Number(request.query.lat);
    const lng = Number(request.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new BadRequestError('lat/lng are required');

    const radius = Math.min(
      Math.max(Number(request.query.radius) || DEFAULT_NEARBY_RADIUS_METERS, MIN_NEARBY_RADIUS_METERS),
      MAX_NEARBY_RADIUS_METERS,
    );

    const trees = await findNearbyTrees(fastify.prisma, { lat, lng }, radius);
    reply.send(trees);
  });

  // Resolves a permanent ARTH Tree Identity (publicId, e.g. "A48Z91" — the QR/deep-link payload)
  // to the record it belongs to. Probes Tree first, then PlantedTree, since the two models are
  // deliberately kept separate (see schema.prisma's Tree/PlantedTree comments) rather than
  // merged — a publicId's prefix doesn't encode which one it is, the lookup does.
  fastify.get<{ Params: { publicId: string } }>('/resolve/:publicId', async (request, reply) => {
    const resolution = await resolvePublicId(fastify.prisma, request.params.publicId);
    reply.send(resolution);
  });

  // The unified Tree Passport — works for an individual Tree or an NGO PlantedTree. Read-mostly
  // and intentionally not owner-gated (a Passport is meant to be viewable by an adopter, a
  // community observer, or anyone who scanned the tree's QR), unlike plantedTrees.routes.ts's
  // NGO-owner-only mutation endpoints, which stay untouched.
  fastify.get<{ Params: { kind: 'tree' | 'planted-tree'; id: string } }>(
    '/passport/:kind/:id',
    async (request, reply) => {
      const { kind, id } = request.params;
      if (kind !== 'tree' && kind !== 'planted-tree') throw new BadRequestError('Invalid passport kind');
      const passport = await getPassportByInternalId(fastify.prisma, kind, id, request.user?.id);
      reply.send(passport);
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const tree = await fastify.prisma.tree.findFirst({
      where: { id: request.params.id, userId: request.user!.id, isDeleted: false },
      include: { species: true },
    });
    if (!tree) throw new NotFoundError('Tree not found');
    reply.send(serializeTree(tree));
  });

  // Lets the mobile app check a photo right after capture, before the user fills in species/
  // nickname/location — matches the "AI Scanning" step shown immediately post-capture. This is
  // a convenience pre-check only; the real gate is on POST / below, which re-verifies so a
  // client can't skip straight to creating a tree with a rejected photo.
  fastify.post('/verify-photo', async (request, reply) => {
    const body = request.body as Record<string, MultipartFile | { value: string }>;
    const photo = await extractPhoto(body);
    if (!photo) throw new BadRequestError('No photo provided');

    const verification = await verifyPlantingPhoto(photo);
    reply.send({ isPlanting: verification.status !== 'rejected', reason: verification.reason });
  });

  fastify.post('/', async (request, reply) => {
    const body = request.body as Record<string, MultipartFile | { value: string }>;

    const fields: Record<string, string> = {};
    let photoFile: MultipartFile | undefined;

    for (const [key, part] of Object.entries(body ?? {})) {
      if ((part as MultipartFile).file !== undefined || (part as MultipartFile).toBuffer) {
        if (key === 'photo') photoFile = part as MultipartFile;
      } else {
        fields[key] = (part as { value: string }).value;
      }
    }

    const parsed = plantTreeSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    assertGpsNotMocked(parsed.data.mocked);
    assertGpsAccuracy(parsed.data.accuracy);

    let photoUrl: string | undefined;
    let aiVerificationStatus: 'unverified' | 'verified' | 'rejected' = 'unverified';
    if (photoFile) {
      const buffer = await photoFile.toBuffer();

      const verification = await verifyPlantingPhoto({ buffer, mimetype: photoFile.mimetype });
      // A rejected photo used to be hard-blocked here (400, nothing saved).
      // It's now persisted with status 'rejected' instead, so an admin can
      // review it — see admin.service.ts's listTreesForReview/reviewTree.
      // XP/counters are withheld for 'rejected' until an admin approves it
      // (tree.service.ts's plantTree skips them for this status).
      aiVerificationStatus = verification.status;

      photoUrl = await saveTreePhoto({
        filename: photoFile.filename,
        mimetype: photoFile.mimetype,
        buffer,
      });
    }

    const tree = await plantTree(fastify.prisma, {
      userId: request.user!.id,
      speciesId: parsed.data.speciesId,
      nickname: parsed.data.nickname,
      lat: parsed.data.lat,
      lng: parsed.data.lng,
      locationLabel: parsed.data.locationLabel,
      caption: parsed.data.caption,
      photoUrl,
      aiVerificationStatus,
      saplingUnitId: parsed.data.saplingUnitId,
    });

    reply.status(201).send(serializeTree(tree));
  });

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = updateTreeSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const existing = await fastify.prisma.tree.findFirst({
      where: { id: request.params.id, userId: request.user!.id, isDeleted: false },
    });
    if (!existing) throw new NotFoundError('Tree not found');

    const updated = await fastify.prisma.tree.update({
      where: { id: existing.id },
      data: parsed.data,
      include: { species: true },
    });

    reply.send(serializeTree(updated));
  });

  // Owner self-check-in — the tree's own "how's it doing?" log, distinct from the NGO
  // zone/bulk health-check flow (plantedTrees.routes.ts, untouched) and the community
  // geofenced-observation flow (treeObservations.routes.ts). Moves Tree.healthStatus.
  fastify.post<{ Params: { id: string } }>('/:id/observations', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any)
      : { fields: (request.body ?? {}) as Record<string, unknown>, file: undefined };

    const parsed = logOwnObservationSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    // A live photo is required — health must not change without photographic evidence.
    if (!file) throw new BadRequestError('A photo is required to update tree health.');
    const buffer = await file.toBuffer();
    const photoUrl = await saveHealthCheckPhoto({ filename: file.filename, mimetype: file.mimetype, buffer });

    const observation = await logOwnerObservation(fastify.prisma, request.user!.id, request.params.id, {
      ...parsed.data,
      photoUrl,
    });
    reply.status(201).send(observation);
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const existing = await fastify.prisma.tree.findFirst({
      where: { id: request.params.id, userId: request.user!.id, isDeleted: false },
    });
    if (!existing) throw new NotFoundError('Tree not found');

    await fastify.prisma.tree.update({ where: { id: existing.id }, data: { isDeleted: true } });
    reply.status(204).send();
  });
}
