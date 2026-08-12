import { FastifyInstance } from 'fastify';
import { protectStreakSchema } from '../schemas/streaks.schema';
import { startOfUtcDay, addDays, recordPlantedToday } from '../services/streak.service';
import { addXp } from '../services/xp.service';
import { BadRequestError } from '../utils/errors';

const XP_STREAK_SAVE_COST = 100;

export default async function streaksRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { weeks?: string } }>('/calendar', async (request, reply) => {
    const weeksCount = Math.min(Math.max(Number(request.query.weeks) || 4, 1), 12);
    const today = startOfUtcDay(new Date());
    const startDate = addDays(today, -(weeksCount * 7 - 1));

    const rows = await fastify.prisma.streakHistory.findMany({
      where: { userId: request.user!.id, activityDate: { gte: startDate } },
    });

    const plantedDates = new Set(
      rows.filter((r) => r.planted).map((r) => r.activityDate.toISOString().slice(0, 10))
    );

    const weeks = [];
    for (let w = 0; w < weeksCount; w++) {
      const days: boolean[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(startDate, w * 7 + d);
        days.push(plantedDates.has(date.toISOString().slice(0, 10)));
      }
      weeks.push({ week: `Week ${w + 1}`, days });
    }

    reply.send(weeks);
  });

  fastify.post('/protect', async (request, reply) => {
    const parsed = protectStreakSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const userId = request.user!.id;

    if (parsed.data.method === 'plant') {
      reply.send({ message: 'Plant a tree today to keep your streak alive.' });
      return;
    }

    const user = await fastify.prisma.$transaction(async (tx) => {
      if (parsed.data.method === 'freeze') {
        const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
        if (current.streakFreezesAvailable <= 0) throw new BadRequestError('No streak freezes available');

        await tx.user.update({
          where: { id: userId },
          data: { streakFreezesAvailable: { decrement: 1 } },
        });

        return recordPlantedToday(tx, userId, 'freeze');
      }

      // method === 'xp'
      const current = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (current.xp < XP_STREAK_SAVE_COST) throw new BadRequestError('Not enough XP');

      await addXp(tx, userId, -XP_STREAK_SAVE_COST, 'streak_saved_xp_spend');
      return recordPlantedToday(tx, userId, 'xp');
    });

    reply.send({
      streakCurrent: user.streakCurrent,
      streakMax: user.streakMax,
      streakFreezesAvailable: user.streakFreezesAvailable,
      xp: user.xp,
    });
  });
}
