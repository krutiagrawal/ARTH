import { FastifyInstance, FastifyRequest } from 'fastify';
import { NotFoundError } from '../utils/errors';
import { listActiveUserStories } from '../services/story.service';
import { listJoinedDrives } from '../services/drive.service';
import { serializeDrive } from './drives.routes';

async function requirePublicUser(fastify: FastifyInstance, userId: string) {
  const user = await fastify.prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    include: { settings: true },
  });

  if (!user || user.settings?.publicProfile === false) {
    throw new NotFoundError('User not found');
  }

  return user;
}

export default async function usersPublicRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const user = await requirePublicUser(fastify, request.params.id);

      let friendStatus: 'none' | 'pending' | 'accepted' = 'none';
      if (request.user && request.user.id !== user.id) {
        const friendship = await fastify.prisma.friendship.findFirst({
          where: {
            status: { in: ['pending', 'accepted'] },
            OR: [
              { requesterId: request.user.id, addresseeId: user.id },
              { requesterId: user.id, addresseeId: request.user.id },
            ],
          },
        });
        friendStatus = friendship ? (friendship.status as 'pending' | 'accepted') : 'none';
      }

      reply.send({
        id: user.id,
        name: user.name,
        handle: user.handle,
        bio: user.bio,
        avatarEmoji: user.avatarEmoji,
        level: user.level,
        treesPlantedCount: user.treesPlantedCount,
        streakCurrent: user.streakCurrent,
        badgesCount: user.badgesCount,
        isOnline: user.lastActiveAt ? Date.now() - user.lastActiveAt.getTime() < 5 * 60 * 1000 : false,
        lastActiveAt: user.lastActiveAt,
        friendStatus,
      });
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id/achievements', async (request, reply) => {
    const user = await requirePublicUser(fastify, request.params.id);

    const achievements = await fastify.prisma.achievement.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        userAchievements: { where: { userId: user.id } },
      },
    });

    reply.send(
      achievements.map((achievement) => {
        const userAchievement = achievement.userAchievements[0];
        return {
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          rarity: achievement.rarity,
          unlocked: userAchievement?.unlocked ?? false,
          progress: userAchievement?.progress ?? 0,
          total: achievement.criteriaTarget ?? undefined,
        };
      }),
    );
  });

  fastify.get<{ Params: { id: string } }>('/:id/drives/joined', async (request, reply) => {
    const user = await requirePublicUser(fastify, request.params.id);
    const drives = await listJoinedDrives(fastify.prisma, user.id);
    reply.send(drives.map(serializeDrive));
  });

  // A user's active (non-expired) stories — used when viewing a friend's profile
  fastify.get<{ Params: { id: string } }>('/:id/stories', async (request, reply) => {
    const user = await requirePublicUser(fastify, request.params.id);

    // Explicitly user-authored only: an NGO operator's org stories are not part of their
    // personal profile, even though both hang off the same login.
    reply.send(await listActiveUserStories(fastify.prisma, user.id));
  });
}
