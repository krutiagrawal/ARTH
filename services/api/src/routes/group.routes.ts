import { FastifyInstance } from 'fastify';
import * as groupService from '../services/group.service';
import { saveGroupLogo } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import { BadRequestError } from '../utils/errors';
import { updateGroupProfileSchema, setMemberRoleSchema, createGroupChallengeSchema } from '../schemas/group.schema';
import { startOfUtcDay, addDays } from '../services/streak.service';
import { getGroupActivity } from '../services/groupActivity.service';

function serializeGroupProfile(group: any) {
  return {
    id: group.id,
    groupName: group.groupName,
    groupType: group.groupType,
    description: group.description,
    logoUrl: group.logoUrl,
    city: group.city,
    inviteCode: group.inviteCode,
    status: group.status,
    streakCurrent: group.streakCurrent,
    streakMax: group.streakMax,
    badgesCount: group.badgesCount,
    handle: group.handle,
    avatarEmoji: group.avatarEmoji,
    selectedForestThemeId: group.selectedForestThemeId,
    createdAt: group.createdAt,
  };
}

// Gated to the group's own login account (role 'group') — see group.service.ts's
// comment on requireOwnGroup for why co_admin/member don't get a second login here.
export default async function groupRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('group'));

  fastify.get('/profile', async (request, reply) => {
    const profile = await groupService.getOwnProfile(fastify.prisma, request.user!.id);
    reply.send(serializeGroupProfile(profile));
  });

  fastify.patch('/profile', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any, 'logo')
      : { fields: (request.body ?? {}) as Record<string, string>, file: undefined };

    const parsed = updateGroupProfileSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let logoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      logoUrl = await saveGroupLogo({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const profile = await groupService.updateOwnProfile(fastify.prisma, request.user!.id, {
      ...parsed.data,
      ...(logoUrl ? { logoUrl } : {}),
    });
    reply.send(serializeGroupProfile(profile));
  });

  fastify.post('/invite-code/regenerate', async (request, reply) => {
    const profile = await groupService.regenerateInviteCode(fastify.prisma, request.user!.id);
    reply.send(serializeGroupProfile(profile));
  });

  fastify.get('/stats', async (request, reply) => {
    reply.send(await groupService.getOwnStats(fastify.prisma, request.user!.id));
  });

  fastify.get<{ Querystring: { limit?: string } }>('/leaderboard', async (request, reply) => {
    const group = await groupService.getOwnProfile(fastify.prisma, request.user!.id);
    const limit = Math.min(Number(request.query.limit) || 50, 200);
    reply.send(await groupService.getLeaderboard(fastify.prisma, group.id, limit));
  });

  fastify.get('/members', async (request, reply) => {
    const members = await groupService.listMembers(fastify.prisma, request.user!.id);
    reply.send(
      members.map((m) => ({
        userId: m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        name: m.user.name,
        handle: m.user.handle,
        avatarEmoji: m.user.avatarEmoji,
        treesPlantedCount: m.user.treesPlantedCount,
        xp: m.user.xp,
      }))
    );
  });

  fastify.patch<{ Params: { userId: string } }>('/members/:userId/role', async (request, reply) => {
    const parsed = setMemberRoleSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    await groupService.setMemberRole(fastify.prisma, request.user!.id, request.params.userId, parsed.data.role);
    reply.status(204).send();
  });

  fastify.delete<{ Params: { userId: string } }>('/members/:userId', async (request, reply) => {
    await groupService.removeMember(fastify.prisma, request.user!.id, request.params.userId);
    reply.status(204).send();
  });

  fastify.get('/challenges', async (request, reply) => {
    const group = await groupService.getOwnProfile(fastify.prisma, request.user!.id);
    reply.send(await groupService.listChallenges(fastify.prisma, group.id));
  });

  fastify.post('/challenges', async (request, reply) => {
    const parsed = createGroupChallengeSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const challenge = await groupService.createChallenge(fastify.prisma, request.user!.id, parsed.data);
    reply.status(201).send(challenge);
  });

  // Daily grid, same shape as GET /api/streaks/calendar — StreakCalendar.tsx renders both.
  fastify.get<{ Querystring: { weeks?: string } }>('/streaks/calendar', async (request, reply) => {
    const group = await groupService.getOwnProfile(fastify.prisma, request.user!.id);
    const weeksCount = Math.min(Math.max(Number(request.query.weeks) || 4, 1), 12);
    const today = startOfUtcDay(new Date());
    const startDate = addDays(today, -(weeksCount * 7 - 1));

    const rows = await fastify.prisma.groupStreakHistory.findMany({
      where: { groupId: group.id, activityDate: { gte: startDate } },
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
  });

  fastify.get('/achievements', async (request, reply) => {
    const group = await groupService.getOwnProfile(fastify.prisma, request.user!.id);

    const achievements = await fastify.prisma.groupAchievement.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { unlocks: { where: { groupId: group.id } } },
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

  fastify.get<{ Querystring: { take?: string } }>('/activity', async (request, reply) => {
    const group = await groupService.getOwnProfile(fastify.prisma, request.user!.id);
    const take = Math.min(Number(request.query.take) || 30, 50);
    reply.send(await getGroupActivity(fastify.prisma, group.id, request.user!.id, { take }));
  });
}
