import { FastifyInstance } from 'fastify';
import { searchAddress, reverseGeocode } from '../utils/geocode';

export default async function geocodeRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { q?: string; lat?: string; lng?: string } }>('/search', async (request, reply) => {
    const lat = Number(request.query.lat);
    const lng = Number(request.query.lng);
    const near = request.query.lat && request.query.lng && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;
    const suggestions = await searchAddress(request.query.q ?? '', near);
    reply.send(suggestions);
  });

  fastify.get<{ Querystring: { lat?: string; lng?: string } }>('/reverse', async (request, reply) => {
    const lat = Number(request.query.lat);
    const lng = Number(request.query.lng);
    const result = Number.isFinite(lat) && Number.isFinite(lng) ? await reverseGeocode(lat, lng) : null;
    reply.send(result);
  });
}
