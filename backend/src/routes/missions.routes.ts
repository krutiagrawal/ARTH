import { FastifyInstance } from 'fastify';
import { getOrCreateTodayMissions, completeMissionById } from '../services/missions.service';

export default async function missionsRoutes(fastify: FastifyInstance) {
  fastify.get('/today', async (request, reply) => {
    const rows = await fastify.prisma.$transaction((tx) => getOrCreateTodayMissions(tx, request.user!.id));

    reply.send(
      rows.map((row) => ({
        id: row.mission.id,
        title: row.mission.title,
        description: row.mission.description,
        xpReward: row.mission.xpReward,
        completed: row.completed,
        icon: row.mission.icon,
        type: row.mission.type,
      }))
    );
  });

  fastify.post<{ Params: { id: string } }>('/:id/complete', async (request, reply) => {
    const updated = await fastify.prisma.$transaction((tx) =>
      completeMissionById(tx, request.user!.id, request.params.id)
    );

    reply.send(updated);
  });
}
