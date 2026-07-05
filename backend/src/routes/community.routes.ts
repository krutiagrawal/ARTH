import { FastifyInstance } from 'fastify';
import { startOfUtcDay } from '../services/streak.service';

export default async function communityRoutes(fastify: FastifyInstance) {
  fastify.get('/global-counter', async (_request, reply) => {
    const todayStart = startOfUtcDay(new Date());

    const treesToday = await fastify.prisma.tree.count({
      where: { plantedAt: { gte: todayStart }, isDeleted: false },
    });

    const plantersTodayRows = await fastify.prisma.tree.findMany({
      where: { plantedAt: { gte: todayStart }, isDeleted: false },
      distinct: ['userId'],
      select: { userId: true },
    });

    const goalConfig = await fastify.prisma.appConfig.findUnique({ where: { key: 'daily_tree_goal' } });
    const dailyGoal = Number(goalConfig?.value ?? 4000);

    reply.send({
      treesToday,
      plantersToday: plantersTodayRows.length,
      dailyGoal,
      percentOfGoal: Math.min(100, Math.round((treesToday / dailyGoal) * 100)),
    });
  });
}
