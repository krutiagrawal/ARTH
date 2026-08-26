import { FastifyInstance } from 'fastify';
import { ORG_ROLES } from '../constants/roles';
import { z } from 'zod';
import * as followersService from '../services/ngoFollowers.service';
import { BadRequestError } from '../utils/errors';

const listQuerySchema = z.object({
  status: z.enum(['pending', 'accepted']).optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

/** NGO-only: the Followers list and the follow-request inbox. Mounted at /api/ngo/followers. */
export default async function ngoFollowersRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole(...ORG_ROLES));

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

  // Removing an accepted follower. Same effect as a decline, kept as its own verb so the audit
  // trail and the client's confirmation copy can differ.
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await followersService.removeFollower(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });
}
