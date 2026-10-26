import { FastifyInstance } from 'fastify';
import { NotFoundError } from '../utils/errors';

export default async function feedRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { scope?: 'friends' | 'global'; page?: string } }>('/', async (request, reply) => {
    const userId = request.user!.id;
    const scope = request.query.scope ?? 'friends';
    const page = Math.max(Number(request.query.page) || 1, 1);
    const limit = 20;

    let userIds: string[] | undefined;
    if (scope === 'friends') {
      const friendships = await fastify.prisma.friendship.findMany({
        where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
        select: { requesterId: true, addresseeId: true },
        take: 2000,
      });
      userIds = friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));
    }

    const items = await fastify.prisma.activityFeed.findMany({
      where: userIds ? { userId: { in: userIds } } : {},
      include: {
        user: { select: { id: true, name: true, handle: true, avatarEmoji: true } },
        // A count plus only the viewer's own reaction, not every reaction row on every item.
        _count: { select: { reactions: true } },
        reactions: { where: { userId }, select: { userId: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    });

    reply.send(
      items.map((item) => ({
        id: item.id,
        type: item.type,
        user: item.user,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        metadata: item.metadata,
        createdAt: item.createdAt,
        cheerCount: item._count.reactions,
        cheeredByMe: item.reactions.length > 0,
      }))
    );
  });

  fastify.post<{ Params: { id: string } }>('/:id/cheer', async (request, reply) => {
    const activity = await fastify.prisma.activityFeed.findUnique({ where: { id: request.params.id } });
    if (!activity) throw new NotFoundError('Activity not found');

    const reaction = await fastify.prisma.activityReaction.upsert({
      where: {
        activityId_userId_reaction: { activityId: activity.id, userId: request.user!.id, reaction: 'cheer' },
      },
      update: {},
      create: { activityId: activity.id, userId: request.user!.id, reaction: 'cheer' },
    });

    reply.status(201).send(reaction);
  });
}
