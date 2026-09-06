import { FastifyInstance } from 'fastify';
import { checkPlantingLocationSchema } from '../schemas/plantingLocations.schema';
import { listApprovedLocations, findMatchingLocation } from '../services/plantingLocation.service';
import { BadRequestError } from '../utils/errors';

function serializeLocation(location: any) {
  return {
    id: location.id,
    name: location.name,
    lat: Number(location.lat),
    lng: Number(location.lng),
    radiusMeters: location.radiusMeters,
  };
}

export default async function plantingLocationsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const locations = await listApprovedLocations(fastify.prisma);
    reply.send(locations.map(serializeLocation));
  });

  fastify.post('/check', async (request, reply) => {
    const parsed = checkPlantingLocationSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const match = await findMatchingLocation(fastify.prisma, parsed.data);
    reply.send({
      eligible: !!match,
      location: match ? { id: match.id, name: match.name } : undefined,
    });
  });
}
