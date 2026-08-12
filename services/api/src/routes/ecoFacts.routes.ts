import { FastifyInstance } from 'fastify';

export default async function ecoFactsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const facts = await fastify.prisma.ecoFact.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    reply.send(facts.map((f) => f.factText));
  });
}
