import { FastifyInstance } from 'fastify';

export default async function xpRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { page?: string; limit?: string } }>('/transactions', async (request, reply) => {
    const limit = Math.min(Number(request.query.limit) || 20, 100);
    const page = Math.max(Number(request.query.page) || 1, 1);

    const transactions = await fastify.prisma.xpTransaction.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    reply.send(transactions);
  });
}
