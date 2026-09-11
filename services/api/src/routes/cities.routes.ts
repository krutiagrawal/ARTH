import { FastifyInstance } from 'fastify';

export default async function citiesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const cities = await fastify.prisma.city.findMany({ orderBy: { sortOrder: 'asc' } });
    reply.send(cities.map((c) => ({ id: c.id, name: c.name, isLaunched: c.isLaunched })));
  });
}
