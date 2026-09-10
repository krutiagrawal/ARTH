import { FastifyInstance } from 'fastify';
import { ConflictError, NotFoundError } from '../utils/errors';

export default async function challengesRoutes(fastify: FastifyInstance) {
  // Batched (not one request per card) the same way ring-status is — a screen full of challenge
  // cards asks once for every id it's showing rather than firing a request per card.
  fastify.get<{ Querystring: { ids?: string } }>('/friends-joined', async (request, reply) => {
    const ids = (request.query.ids ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      reply.send({});
      return;
    }

    const userId = request.user!.id;
    const friendships = await fastify.prisma.friendship.findMany({
      where: { status: 'accepted', OR: [{ requesterId: userId }, { addresseeId: userId }] },
    });
    const friendIds = friendships.map((f) => (f.requesterId === userId ? f.addresseeId : f.requesterId));

    const result: Record<string, { count: number; friends: { id: string; name: string; handle: string; avatarEmoji: string }[] }> = {};
    for (const id of ids) result[id] = { count: 0, friends: [] };

    if (friendIds.length === 0) {
      reply.send(result);
      return;
    }

    const participants = await fastify.prisma.challengeParticipant.findMany({
      where: { challengeId: { in: ids }, userId: { in: friendIds } },
      include: { user: { select: { id: true, name: true, handle: true, avatarEmoji: true } } },
      orderBy: { joinedAt: 'asc' },
    });

    for (const p of participants) {
      const bucket = result[p.challengeId];
      bucket.count += 1;
      bucket.friends.push({ id: p.user.id, name: p.user.name, handle: p.user.handle, avatarEmoji: p.user.avatarEmoji });
    }

    reply.send(result);
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const challenge = await fastify.prisma.challenge.findUnique({
      where: { id: request.params.id },
      include: {
        _count: { select: { participants: true } },
        participants: { where: { userId: request.user!.id } },
      },
    });
    if (!challenge) throw new NotFoundError('Challenge not found');

    const mine = challenge.participants[0];

    reply.send({
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      icon: challenge.icon,
      xpReward: challenge.xpReward,
      total: challenge.goalTotal,
      participants: challenge._count.participants,
      daysLeft: Math.max(0, Math.ceil((challenge.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
      progress: mine?.progress ?? 0,
      joined: Boolean(mine),
      completed: Boolean(mine?.completedAt),
    });
  });

  fastify.post<{ Params: { id: string } }>('/:id/join', async (request, reply) => {
    const challenge = await fastify.prisma.challenge.findUnique({ where: { id: request.params.id } });
    if (!challenge) throw new NotFoundError('Challenge not found');

    const existing = await fastify.prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId: challenge.id, userId: request.user!.id } },
    });
    if (existing) throw new ConflictError('Already joined this challenge');

    const participant = await fastify.prisma.challengeParticipant.create({
      data: { challengeId: challenge.id, userId: request.user!.id },
    });

    await fastify.prisma.activityFeed.create({
      data: { userId: request.user!.id, type: 'challenge_joined', referenceType: 'challenge', referenceId: challenge.id },
    });

    reply.status(201).send(participant);
  });

  fastify.delete<{ Params: { id: string } }>('/:id/join', async (request, reply) => {
    const existing = await fastify.prisma.challengeParticipant.findUnique({
      where: { challengeId_userId: { challengeId: request.params.id, userId: request.user!.id } },
    });
    if (!existing) throw new NotFoundError('You have not joined this challenge');

    await fastify.prisma.challengeParticipant.delete({
      where: { challengeId_userId: { challengeId: request.params.id, userId: request.user!.id } },
    });

    reply.status(204).send();
  });
}
