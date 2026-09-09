import { FastifyInstance } from 'fastify';
import { ConflictError, NotFoundError } from '../utils/errors';

export default async function challengesRoutes(fastify: FastifyInstance) {
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
