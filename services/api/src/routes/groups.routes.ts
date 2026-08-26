import { FastifyInstance } from 'fastify';
import * as groupService from '../services/group.service';
import { BadRequestError } from '../utils/errors';
import { joinGroupSchema } from '../schemas/group.schema';
import { startOfUtcDay, addDays } from '../services/streak.service';
import { getGroupActivity } from '../services/groupActivity.service';

function serializeGroupSummary(group: any) {
  return {
    id: group.id,
    groupName: group.groupName,
    groupType: group.groupType,
    description: group.description,
    logoUrl: group.logoUrl,
    city: group.city,
    status: group.status,
  };
}

// Reachable by any authenticated user — this is how a 'user'-role account
// joins/leaves/views groups it belongs to. Managing a group you own lives
// under /api/group instead (see group.routes.ts), gated to role 'group'.
export default async function groupsRoutes(fastify: FastifyInstance) {
  fastify.get('/mine', async (request, reply) => {
    const memberships = await groupService.listMyMemberships(fastify.prisma, request.user!.id);
    reply.send(
      memberships.map((m) => ({
        role: m.role,
        joinedAt: m.joinedAt,
        group: serializeGroupSummary(m.group),
      }))
    );
  });

  fastify.post('/join', async (request, reply) => {
    const parsed = joinGroupSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const group = await groupService.joinByInviteCode(fastify.prisma, request.user!.id, parsed.data.inviteCode);
    reply.status(201).send(serializeGroupSummary(group));
  });

  fastify.post<{ Params: { id: string } }>('/:id/leave', async (request, reply) => {
    await groupService.leaveGroup(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const group = await groupService.getGroupForMember(fastify.prisma, request.user!.id, request.params.id);
    reply.send(serializeGroupSummary(group));
  });

  fastify.get<{ Params: { id: string } }>('/:id/challenges', async (request, reply) => {
    await groupService.getGroupForMember(fastify.prisma, request.user!.id, request.params.id);
    reply.send(await groupService.listChallenges(fastify.prisma, request.params.id));
  });

  fastify.post<{ Params: { challengeId: string } }>('/challenges/:challengeId/join', async (request, reply) => {
    const participant = await groupService.joinChallenge(fastify.prisma, request.user!.id, request.params.challengeId);
    reply.status(201).send(participant);
  });

  fastify.get<{ Params: { id: string }; Querystring: { take?: string } }>('/:id/activity', async (request, reply) => {
    await groupService.getGroupForMember(fastify.prisma, request.user!.id, request.params.id);
    const take = Math.min(Number(request.query.take) || 30, 50);
    reply.send(await getGroupActivity(fastify.prisma, request.params.id, request.user!.id, { take }));
  });

  fastify.get<{ Params: { id: string } }>('/:id/achievements', async (request, reply) => {
    await groupService.getGroupForMember(fastify.prisma, request.user!.id, request.params.id);

    const achievements = await fastify.prisma.groupAchievement.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { unlocks: { where: { groupId: request.params.id } } },
    });

    reply.send(
      achievements.map((achievement) => {
        const unlock = achievement.unlocks[0];
        return {
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          rarity: achievement.rarity,
          unlocked: unlock?.unlocked ?? false,
          progress: unlock?.progress ?? 0,
          total: achievement.criteriaTarget ?? undefined,
        };
      })
    );
  });

  fastify.get<{ Params: { id: string }; Querystring: { weeks?: string } }>(
    '/:id/streaks/calendar',
    async (request, reply) => {
      await groupService.getGroupForMember(fastify.prisma, request.user!.id, request.params.id);
      const weeksCount = Math.min(Math.max(Number(request.query.weeks) || 4, 1), 12);
      const today = startOfUtcDay(new Date());
      const startDate = addDays(today, -(weeksCount * 7 - 1));

      const rows = await fastify.prisma.groupStreakHistory.findMany({
        where: { groupId: request.params.id, activityDate: { gte: startDate } },
      });
      const plantedDates = new Set(rows.filter((r) => r.planted).map((r) => r.activityDate.toISOString().slice(0, 10)));

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
    }
  );
}
