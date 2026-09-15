import { FastifyInstance } from 'fastify';
import { searchAddress, reverseGeocode } from '../utils/geocode';

export default async function geocodeRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { q?: string } }>('/search', async (request, reply) => {
    const suggestions = await searchAddress(request.query.q ?? '');
    reply.send(suggestions);
  });

  fastify.get<{ Querystring: { lat?: string; lng?: string } }>('/reverse', async (request, reply) => {
    const lat = Number(request.query.lat);
    const lng = Number(request.query.lng);
    const result = Number.isFinite(lat) && Number.isFinite(lng) ? await reverseGeocode(lat, lng) : null;
    reply.send(result);
  });
}
