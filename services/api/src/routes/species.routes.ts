import { FastifyInstance } from 'fastify';
import { createSpeciesSchema } from '../schemas/species.schema';
import { BadRequestError, ForbiddenError, NotFoundError } from '../utils/errors';
import { haversineDistanceKm } from '../utils/geo';

const DEFAULT_NEARBY_RADIUS_KM = 15;

export default async function speciesRoutes(fastify: FastifyInstance) {
  // Shared catalog plus, for a signed-in user, the species they added themselves.
  fastify.get('/', { preHandler: [fastify.optionalAuthenticate] }, async (request, reply) => {
    const userId = request.user?.id;
    const species = await fastify.prisma.treeSpecies.findMany({
      where: {
        isActive: true,
        OR: [{ createdByUserId: null }, ...(userId ? [{ createdByUserId: userId }] : [])],
      },
      orderBy: { sortOrder: 'asc' },
    });
    reply.send(species);
  });

  // Section 12/2 — "Plant by Yourself" nearby-nursery-stock recommendation. Real (not fuzzy)
  // matching via SaplingStock.speciesId now that inventory links to the shared TreeSpecies
  // catalog (decision 6), so a location-aware suggestion is a real relationship, not a guess.
  fastify.get<{ Params: { id: string }; Querystring: { lat?: string; lng?: string; radiusKm?: string } }>(
    '/:id/nearby-stock',
    async (request, reply) => {
      const lat = Number(request.query.lat);
      const lng = Number(request.query.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new BadRequestError('lat and lng are required');
      const radiusKm = Number(request.query.radiusKm) || DEFAULT_NEARBY_RADIUS_KM;

      const stock = await fastify.prisma.saplingStock.findMany({
        where: { speciesId: request.params.id, quantity: { gt: 0 }, nursery: { status: 'approved' } },
        include: { nursery: { select: { id: true, nurseryName: true, lat: true, lng: true } } },
      });

      const results = stock
        .filter((s) => s.nursery.lat != null && s.nursery.lng != null)
        .map((s) => ({
          nurseryId: s.nursery.id,
          nurseryName: s.nursery.nurseryName,
          distanceKm: haversineDistanceKm({ lat, lng }, { lat: Number(s.nursery.lat), lng: Number(s.nursery.lng) }),
          quantity: s.quantity,
          priceCents: s.priceCents,
          isFree: s.isFree,
          stockId: s.id,
        }))
        .filter((r) => r.distanceKm <= radiusKm)
        .sort((a, b) => a.distanceKm - b.distanceKm);

      reply.send(results);
    },
  );
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'species';
}

/** Registered separately (see app.ts) so only this write needs a signed-in user — the list itself
 * stays public. A planter can add a species missing from the list; it's private to that user
 * (createdByUserId) and shows up only in their own list from then on. */
export async function speciesAuthRoutes(fastify: FastifyInstance) {
  fastify.post('/', async (request, reply) => {
    const parsed = createSpeciesSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const commonName = parsed.data.commonName.trim();
    const baseKey = slugify(commonName);

    const userId = request.user!.id;

    // Typing a name (any casing) that's already in the shared catalog, or one this user added
    // before, reuses that row rather than spawning a near-duplicate.
    const existing = await fastify.prisma.treeSpecies.findFirst({
      where: {
        commonName: { equals: commonName, mode: 'insensitive' },
        isActive: true,
        OR: [{ createdByUserId: null }, { createdByUserId: userId }],
      },
    });
    if (existing) {
      reply.status(200).send(existing);
      return;
    }

    let key = baseKey;
    let suffix = 1;
    while (await fastify.prisma.treeSpecies.findUnique({ where: { key } })) {
      suffix += 1;
      key = `${baseKey}_${suffix}`;
    }

    const maxSortOrder = await fastify.prisma.treeSpecies.aggregate({ _max: { sortOrder: true } });

    const species = await fastify.prisma.treeSpecies.create({
      data: {
        key,
        commonName,
        emoji: parsed.data.emoji,
        isActive: true,
        createdByUserId: userId,
        sortOrder: (maxSortOrder._max.sortOrder ?? 0) + 1,
      },
    });

    reply.status(201).send(species);
  });

  // Removes a species the caller added themselves. System species (createdByUserId null) and other
  // users' species can't be removed. Soft-delete (isActive=false): trees already planted with it
  // keep their species reference, it just stops appearing in the picker.
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const species = await fastify.prisma.treeSpecies.findUnique({ where: { id: request.params.id } });
    if (!species || !species.isActive) throw new NotFoundError('Species not found');
    if (species.createdByUserId !== request.user!.id) {
      throw new ForbiddenError('Only species you added yourself can be removed');
    }
    await fastify.prisma.treeSpecies.update({ where: { id: species.id }, data: { isActive: false } });
    reply.status(204).send();
  });
}
