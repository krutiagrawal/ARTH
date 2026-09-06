import { FastifyInstance } from 'fastify';
import * as followService from '../services/follow.service';
import * as nurseryFollowService from '../services/nurseryFollow.service';
import { z } from 'zod';
import { BadRequestError } from '../utils/errors';

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

export default async function followRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const ngos = await followService.listFollowedNgos(fastify.prisma, request.user!.id);
    reply.send(ngos);
  });

  fastify.get('/nurseries', async (request, reply) => {
    const nurseries = await nurseryFollowService.listFollowedNurseries(fastify.prisma, request.user!.id);
    reply.send(nurseries);
  });

  fastify.get('/feed', async (request, reply) => {
    const parsed = paginationQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    // Updates come back already serialized (they are Posts now, carrying the legacy keys).
    reply.send(await followService.getFollowingFeed(fastify.prisma, request.user!.id, parsed.data));
  });
}
