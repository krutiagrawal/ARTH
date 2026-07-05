import { FastifyInstance } from 'fastify';

export default async function challengesPublicRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const challenges = await fastify.prisma.challenge.findMany({
      where: { isActive: true, endsAt: { gt: new Date() } },
      include: { _count: { select: { participants: true } } },
      orderBy: { endsAt: 'asc' },
    });

    reply.send(
      challenges.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        icon: c.icon,
        xpReward: c.xpReward,
        total: c.goalTotal,
        participants: c._count.participants,
        daysLeft: Math.max(0, Math.ceil((c.endsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
      }))
    );
  });
}
