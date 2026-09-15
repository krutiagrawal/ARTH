import { FastifyInstance } from 'fastify';
import { searchAddress } from '../utils/geocode';

export default async function geocodeRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { q?: string } }>('/search', async (request, reply) => {
    const suggestions = await searchAddress(request.query.q ?? '');
    reply.send(suggestions);
  });
}
