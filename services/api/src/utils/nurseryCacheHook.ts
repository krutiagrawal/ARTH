import { FastifyInstance } from 'fastify';
import { invalidateNurseryCache } from '../services/nursery.service';

/**
 * After any successful write under a nursery-only route tree, drop that nursery's cached
 * aggregates (dashboard, impact, stats, reports...) so the owner immediately sees the effect of
 * their own action. Writes from other roles (e.g. a customer placing an order) can't hook in here
 * and rely on the aggregates' short TTLs instead.
 */
export function invalidateNurseryCacheOnWrite(fastify: FastifyInstance) {
  fastify.addHook('onResponse', async (request, reply) => {
    if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') return;
    if (reply.statusCode >= 400 || !request.user) return;
    try {
      const profile = await fastify.prisma.nurseryProfile.findUnique({ where: { userId: request.user.id }, select: { id: true } });
      if (profile) invalidateNurseryCache(profile.id);
    } catch {
      // cache hygiene only - never affects the response that has already been sent
    }
  });
}
