import { FastifyInstance } from 'fastify';
import { limit } from '../plugins/rateLimit';
import {
  analyticsQuerySchema,
  challengeParamSchema,
  createChallengeSchema,
  createGroupSchema,
  discoverGroupsQuerySchema,
  groupIdParamSchema,
  groupMemberParamSchema,
  groupRequestParamSchema,
  inviteSchema,
  membershipSchema,
  themeParamSchema,
  requestIdParamSchema,
  setRoleSchema,
  updateGroupSchema,
} from '../schemas/plantingGroup.schema';
import * as groupService from '../services/plantingGroup.service';
import * as insights from '../services/plantingGroupInsights.service';
import { savePlantingGroupLogo } from '../services/upload.service';
import { BadRequestError } from '../utils/errors';
import { splitMultipartBody } from '../utils/multipart';
import type { CursorQuery } from '../utils/pagination';

function parse<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: { errors: { message: string }[] } } }, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');
  return parsed.data;
}

/**
 * Planting groups. Every route is behind login; what a person may do inside a group comes from
 * their membership on the server (see plantingGroup.service.ts), never from the request.
 *
 * Static paths (/mine, /discover, /requests/...) are declared before /:id so they are not
 * mistaken for a group id.
 */
export default async function plantingGroupsRoutes(fastify: FastifyInstance) {
  // ---------- create / find ----------

  fastify.post('/', limit(10, '1 hour'), async (request, reply) => {
    const input = parse(createGroupSchema, request.body);
    const group = await groupService.createGroup(fastify.prisma, request.user!.id, {
      ...input,
      handle: input.handle.toLowerCase(),
    });
    reply.status(201).send(groupService.serializeGroup(group));
  });

  fastify.get('/mine', async (request, reply) => {
    reply.send(await groupService.listMyGroups(fastify.prisma, request.user!.id));
  });

  fastify.get('/discover', limit(60, '1 minute'), async (request, reply) => {
    const { q } = parse(discoverGroupsQuerySchema, request.query);
    reply.send(await groupService.searchGroups(fastify.prisma, q));
  });

  // Groups ranked by trees planted: names, logos and totals only.
  fastify.get('/leaderboard', limit(60, '1 minute'), async (request, reply) => {
    reply.send(await insights.groupsLeaderboard(fastify.prisma, request.user!.id));
  });

  // ---------- my own requests and invitations ----------

  fastify.get('/requests/mine', async (request, reply) => {
    reply.send(await groupService.listMyRequests(fastify.prisma, request.user!.id));
  });

  fastify.post('/requests/:requestId/accept', limit(30, '1 hour'), async (request, reply) => {
    const { requestId } = parse(requestIdParamSchema, request.params);
    reply.send(await groupService.respondToInvitation(fastify.prisma, request.user!.id, requestId, true));
  });

  fastify.post('/requests/:requestId/decline', limit(30, '1 hour'), async (request, reply) => {
    const { requestId } = parse(requestIdParamSchema, request.params);
    reply.send(await groupService.respondToInvitation(fastify.prisma, request.user!.id, requestId, false));
  });

  // ---------- one group ----------

  fastify.get('/:id', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await groupService.getGroup(fastify.prisma, request.user!.id, id));
  });

  fastify.patch('/:id', limit(30, '1 hour'), async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    const input = parse(updateGroupSchema, request.body ?? {});
    const group = await groupService.updateGroup(fastify.prisma, request.user!.id, id, input);
    reply.send(groupService.serializeGroup(group));
  });

  fastify.post('/:id/logo', limit(20, '1 hour'), async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    if (!isMultipart) throw new BadRequestError('Send the logo as a photo upload');
    const { file } = splitMultipartBody(request.body as any, 'logo');
    if (!file) throw new BadRequestError('A logo photo is required');

    // Admin check first, so a non-admin cannot make the server write a file.
    await groupService.assertGroupAdmin(fastify.prisma, id, request.user!.id);
    const buffer = await file.toBuffer();
    const logoUrl = await savePlantingGroupLogo({ filename: file.filename, mimetype: file.mimetype, buffer });
    const group = await groupService.updateGroup(fastify.prisma, request.user!.id, id, { logoUrl });
    reply.send(groupService.serializeGroup(group));
  });

  fastify.delete('/:id', limit(10, '1 hour'), async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    await groupService.deleteGroup(fastify.prisma, request.user!.id, id);
    reply.status(204).send();
  });

  // ---------- members ----------

  fastify.get<{ Querystring: CursorQuery }>('/:id/members', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await groupService.listMembers(fastify.prisma, request.user!.id, id, request.query));
  });

  fastify.patch('/:id/members/:userId', limit(60, '1 hour'), async (request, reply) => {
    const { id, userId } = parse(groupMemberParamSchema, request.params);
    const { role } = parse(setRoleSchema, request.body);
    reply.send(await groupService.setMemberRole(fastify.prisma, request.user!.id, id, userId, role));
  });

  // Removes a member, or the caller leaving when :userId is their own id.
  fastify.delete('/:id/members/:userId', limit(60, '1 hour'), async (request, reply) => {
    const { id, userId } = parse(groupMemberParamSchema, request.params);
    reply.send(await groupService.removeMember(fastify.prisma, request.user!.id, id, userId));
  });

  // ---------- joining ----------

  fastify.post('/:id/join-requests', limit(20, '1 hour'), async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.status(201).send(await groupService.requestToJoin(fastify.prisma, request.user!.id, id));
  });

  fastify.post('/:id/invitations', limit(60, '1 hour'), async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    const { handle } = parse(inviteSchema, request.body);
    reply.status(201).send(await groupService.inviteUser(fastify.prisma, request.user!.id, id, handle));
  });

  fastify.get<{ Querystring: CursorQuery }>('/:id/requests', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await groupService.listGroupRequests(fastify.prisma, request.user!.id, id, request.query));
  });

  fastify.post('/:id/requests/:requestId/approve', limit(60, '1 hour'), async (request, reply) => {
    const { id, requestId } = parse(groupRequestParamSchema, request.params);
    reply.send(await groupService.respondToJoinRequest(fastify.prisma, request.user!.id, id, requestId, 'approve'));
  });

  fastify.post('/:id/requests/:requestId/decline', limit(60, '1 hour'), async (request, reply) => {
    const { id, requestId } = parse(groupRequestParamSchema, request.params);
    reply.send(await groupService.respondToJoinRequest(fastify.prisma, request.user!.id, id, requestId, 'decline'));
  });

  fastify.delete('/:id/requests/:requestId', limit(60, '1 hour'), async (request, reply) => {
    const { id, requestId } = parse(groupRequestParamSchema, request.params);
    reply.send(await groupService.cancelInvitation(fastify.prisma, request.user!.id, id, requestId));
  });

  // ---------- dashboard data (members only; the service checks membership) ----------

  fastify.get('/:id/stats', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await insights.getGroupStats(fastify.prisma, request.user!.id, id));
  });

  // The caller's own choice: should my ARTH activity count for this group?
  fastify.patch('/:id/membership', limit(60, '1 hour'), async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    const { shareActivity } = parse(membershipSchema, request.body);
    reply.send(await groupService.setMyShareActivity(fastify.prisma, request.user!.id, id, shareActivity));
  });

  fastify.get('/:id/drives', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await insights.listGroupDrives(fastify.prisma, request.user!.id, id));
  });

  fastify.get('/:id/trees/map', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await insights.listGroupTreePins(fastify.prisma, request.user!.id, id));
  });

  fastify.get('/:id/themes', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await insights.listGroupThemes(fastify.prisma, request.user!.id, id));
  });

  fastify.post('/:id/themes/:themeId/select', limit(60, '1 hour'), async (request, reply) => {
    const { id, themeId } = parse(themeParamSchema, request.params);
    reply.send(await insights.selectGroupTheme(fastify.prisma, request.user!.id, id, themeId));
  });

  fastify.get('/:id/achievements', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await insights.getGroupAchievements(fastify.prisma, request.user!.id, id));
  });

  fastify.get('/:id/contributors', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await insights.contributorsLeaderboard(fastify.prisma, request.user!.id, id));
  });

  fastify.get('/:id/analytics', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    const { weeks } = parse(analyticsQuerySchema, request.query);
    reply.send(await insights.getAnalytics(fastify.prisma, request.user!.id, id, weeks ?? 8));
  });

  fastify.get<{ Querystring: CursorQuery }>('/:id/activity', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await insights.listActivity(fastify.prisma, request.user!.id, id, request.query));
  });

  fastify.get<{ Querystring: CursorQuery }>('/:id/trees', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await insights.listGroupTrees(fastify.prisma, request.user!.id, id, request.query));
  });

  fastify.get<{ Querystring: CursorQuery }>('/:id/adoptions', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await insights.listGroupAdoptions(fastify.prisma, request.user!.id, id, request.query));
  });

  fastify.get<{ Querystring: CursorQuery }>('/:id/donations', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await insights.listGroupDonations(fastify.prisma, request.user!.id, id, request.query));
  });

  // ---------- challenges ----------

  fastify.get('/:id/challenges', async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    reply.send(await insights.listChallenges(fastify.prisma, request.user!.id, id));
  });

  fastify.post('/:id/challenges', limit(20, '1 hour'), async (request, reply) => {
    const { id } = parse(groupIdParamSchema, request.params);
    const input = parse(createChallengeSchema, request.body);
    const challenge = await insights.createChallenge(fastify.prisma, request.user!.id, id, input);
    reply.status(201).send({ id: challenge.id });
  });

  fastify.delete('/:id/challenges/:challengeId', limit(60, '1 hour'), async (request, reply) => {
    const { id, challengeId } = parse(challengeParamSchema, request.params);
    await insights.deleteChallenge(fastify.prisma, request.user!.id, id, challengeId);
    reply.status(204).send();
  });
}
