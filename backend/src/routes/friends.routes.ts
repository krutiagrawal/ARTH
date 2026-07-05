import { FastifyInstance } from 'fastify';
import { createFriendRequestSchema } from '../schemas/friends.schema';
import { BadRequestError, ConflictError, NotFoundError } from '../utils/errors';

function otherUser(friendship: any, userId: string) {
  return friendship.requesterId === userId ? friendship.addressee : friendship.requester;
}

export default async function friendsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;
    const friendships = await fastify.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: { requester: true, addressee: true },
    });

    reply.send(
      friendships.map((friendship) => {
        const friend = otherUser(friendship, userId);
        return {
          id: friend.id,
          friendshipId: friendship.id,
          name: friend.name,
          handle: friend.handle,
          avatar: friend.avatarEmoji,
          treesPlanted: friend.treesPlantedCount,
          streak: friend.streakCurrent,
          isOnline: friend.lastActiveAt ? Date.now() - friend.lastActiveAt.getTime() < 5 * 60 * 1000 : false,
          lastActive: friend.lastActiveAt,
          forestLevel: friend.level,
        };
      })
    );
  });

  fastify.get('/requests', async (request, reply) => {
    const userId = request.user!.id;
    const requests = await fastify.prisma.friendship.findMany({
      where: { addresseeId: userId, status: 'pending' },
      include: { requester: true },
    });

    reply.send(
      requests.map((r) => ({
        id: r.id,
        from: { id: r.requester.id, name: r.requester.name, handle: r.requester.handle, avatar: r.requester.avatarEmoji },
        createdAt: r.createdAt,
      }))
    );
  });

  fastify.post('/requests', async (request, reply) => {
    const parsed = createFriendRequestSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const userId = request.user!.id;
    if (parsed.data.addresseeId === userId) throw new BadRequestError('Cannot friend yourself');

    const existing = await fastify.prisma.friendship.findFirst({
      where: {
        OR: [
          { requesterId: userId, addresseeId: parsed.data.addresseeId },
          { requesterId: parsed.data.addresseeId, addresseeId: userId },
        ],
      },
    });
    if (existing) throw new ConflictError('Friendship already exists or is pending');

    const friendship = await fastify.prisma.friendship.create({
      data: { requesterId: userId, addresseeId: parsed.data.addresseeId },
    });

    reply.status(201).send(friendship);
  });

  fastify.post<{ Params: { id: string } }>('/requests/:id/accept', async (request, reply) => {
    const friendship = await fastify.prisma.friendship.findFirst({
      where: { id: request.params.id, addresseeId: request.user!.id, status: 'pending' },
    });
    if (!friendship) throw new NotFoundError('Friend request not found');

    const updated = await fastify.prisma.friendship.update({
      where: { id: friendship.id },
      data: { status: 'accepted', respondedAt: new Date() },
    });

    reply.send(updated);
  });

  fastify.post<{ Params: { id: string } }>('/requests/:id/decline', async (request, reply) => {
    const friendship = await fastify.prisma.friendship.findFirst({
      where: { id: request.params.id, addresseeId: request.user!.id, status: 'pending' },
    });
    if (!friendship) throw new NotFoundError('Friend request not found');

    await fastify.prisma.friendship.delete({ where: { id: friendship.id } });
    reply.status(204).send();
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const userId = request.user!.id;
    const friendship = await fastify.prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: userId, addresseeId: request.params.id },
          { requesterId: request.params.id, addresseeId: userId },
        ],
      },
    });
    if (!friendship) throw new NotFoundError('Friendship not found');

    await fastify.prisma.friendship.delete({ where: { id: friendship.id } });
    reply.status(204).send();
  });
}
