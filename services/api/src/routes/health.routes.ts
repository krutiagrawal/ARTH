import { FastifyInstance } from 'fastify';
import { noRateLimit } from '../plugins/rateLimit';

export default async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/', noRateLimit, async (_request, reply) => {
    try {
      await fastify.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'connected' };
    } catch {
      reply.status(503);
      return { status: 'error', db: 'disconnected' };
    }
  });
}
