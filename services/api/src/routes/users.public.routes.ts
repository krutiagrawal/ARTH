import { FastifyInstance } from 'fastify';
import { NotFoundError } from '../utils/errors';
import { listActiveUserStories } from '../services/story.service';

export default async function usersPublicRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const user = await fastify.prisma.user.findFirst({
      where: { id: request.params.id, isDeleted: false },
      include: { settings: true },
    });

    if (!user || user.settings?.publicProfile === false) {
      throw new NotFoundError('User not found');
    }

    reply.send({
      id: user.id,
      name: user.name,
      handle: user.handle,
      avatarEmoji: user.avatarEmoji,
      level: user.level,
      treesPlantedCount: user.treesPlantedCount,
      streakCurrent: user.streakCurrent,
      badgesCount: user.badgesCount,
      isOnline: user.lastActiveAt ? Date.now() - user.lastActiveAt.getTime() < 5 * 60 * 1000 : false,
      lastActiveAt: user.lastActiveAt,
    });
  });

  // A user's active (non-expired) stories — used when viewing a friend's profile
  fastify.get<{ Params: { id: string } }>('/:id/stories', async (request, reply) => {
    const user = await fastify.prisma.user.findFirst({
      where: { id: request.params.id, isDeleted: false },
      include: { settings: true },
    });

    if (!user || user.settings?.publicProfile === false) {
      throw new NotFoundError('User not found');
    }

    // Explicitly user-authored only: an NGO operator's org stories are not part of their
    // personal profile, even though both hang off the same login.
    reply.send(await listActiveUserStories(fastify.prisma, user.id));
  });
}
