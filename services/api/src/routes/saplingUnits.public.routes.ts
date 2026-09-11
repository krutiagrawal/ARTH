import { FastifyInstance } from 'fastify';
import { NotFoundError } from '../utils/errors';

// Public, unauthenticated — what a QR code resolves to (decision 3/D7: the QR payload is a
// resolvable URL, `{WEB_PUBLIC_URL}/sapling/{unitId}`, so a generic phone camera gets a real
// passport page, not a bare UUID). Deliberately minimal: no PII, no precise coordinates, no
// planter identity — just enough to tell the sapling's story. Also doubles as the section 6
// "Tree Passport" surface per the brief's own note that a dedicated complex screen isn't needed.
export default async function saplingUnitsPublicRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>('/:id/passport', async (request, reply) => {
    const unit = await fastify.prisma.arthSaplingUnit.findUnique({
      where: { id: request.params.id },
      include: {
        nursery: { select: { nurseryName: true, city: true } },
        species: { select: { commonName: true, emoji: true } },
        tree: { select: { plantedAt: true, aiVerificationStatus: true, locationLabel: true } },
      },
    });
    if (!unit) throw new NotFoundError('Sapling not found');

    reply.send({
      nurseryName: unit.nursery.nurseryName,
      nurseryCity: unit.nursery.city,
      speciesCommonName: unit.species?.commonName ?? unit.speciesNameSnapshot,
      speciesEmoji: unit.species?.emoji ?? '🌱',
      status: unit.status,
      supplyDate: unit.supplyDate,
      plantedAt: unit.tree?.plantedAt ?? null,
      verificationStatus: unit.tree?.aiVerificationStatus ?? null,
      plantationArea: unit.tree?.locationLabel ?? null,
    });
  });
}
