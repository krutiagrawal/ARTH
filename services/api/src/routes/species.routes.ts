import { FastifyInstance } from 'fastify';

export default async function speciesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const species = await fastify.prisma.treeSpecies.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    reply.send(species);
  });
}
