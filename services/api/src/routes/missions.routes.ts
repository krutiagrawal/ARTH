import { FastifyInstance } from 'fastify';
import { getOrCreateTodayMissions, completeMissionByType } from '../services/missions.service';

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

  // Missions complete only from the action they describe (planting, finishing the daily lesson,
  // liking someone's post). Sharing happens on-device, so the client reports it here — there is
  // deliberately no generic "complete mission by id" endpoint.
  fastify.post('/share', async (request, reply) => {
    await fastify.prisma.$transaction((tx) => completeMissionByType(tx, request.user!.id, 'share'));
    reply.send({ ok: true });
  });
}
