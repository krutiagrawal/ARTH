import { FastifyInstance } from 'fastify';

export default async function achievementsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const achievements = await fastify.prisma.achievement.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        userAchievements: { where: { userId: request.user!.id } },
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
      })
    );
  });
}
