import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as followersService from '../services/nurseryFollowers.service';
import { BadRequestError } from '../utils/errors';

const listQuerySchema = z.object({
  status: z.enum(['pending', 'accepted']).optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

/** Nursery-only: the Followers list and the follow-request inbox. Mounted at /api/nursery/followers. */
export default async function nurseryFollowersRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('nursery'));

  fastify.get('/', async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(await followersService.listFollowers(fastify.prisma, request.user!.id, parsed.data));
  });

  fastify.post<{ Params: { id: string } }>('/:id/accept', async (request, reply) => {
    await followersService.acceptFollowRequest(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });

  fastify.post<{ Params: { id: string } }>('/:id/decline', async (request, reply) => {
    await followersService.declineFollowRequest(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await followersService.removeFollower(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });
}
