import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as adminService from '../services/admin.service';
import * as adminOpsService from '../services/adminOps.service';
import * as adminCatalogService from '../services/adminCatalog.service';
import { BadRequestError } from '../utils/errors';
import * as reportService from '../services/report.service';

const reportsQuerySchema = z.object({
  status: z.enum(['open', 'actioned', 'dismissed']).optional(),
  // 'accounts' is a shorthand meaning targetType in (user, ngo, nursery, corporate) —
  // the default view for the admin Reports queue, per the "priority" surfacing ask.
  targetType: z.enum(['accounts', 'post', 'story', 'user', 'ngo', 'nursery', 'corporate', 'portfolio_entry', 'order_review']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

const reportActionSchema = z.object({
  action: z.enum(['hide', 'unhide', 'delete', 'dismiss', 'block_account']),
  reason: z.string().max(500).optional(),
});

function serializeNgo(profile: any) {
  return {
    id: profile.id,
    orgName: profile.orgName,
    description: profile.description,
    website: profile.website,
    contactPhone: profile.contactPhone,
    status: profile.status,
    rejectionReason: profile.rejectionReason,
    createdAt: profile.createdAt,
    owner: profile.user
      ? { id: profile.user.id, email: profile.user.email, name: profile.user.name, handle: profile.user.handle }
      : undefined,
  };
}

function serializeNursery(profile: any) {
  return {
    id: profile.id,
    nurseryName: profile.nurseryName,
    description: profile.description,
    city: profile.city,
    contactPhone: profile.contactPhone,
    status: profile.status,
    rejectionReason: profile.rejectionReason,
    createdAt: profile.createdAt,
    owner: profile.user
      ? { id: profile.user.id, email: profile.user.email, name: profile.user.name, handle: profile.user.handle }
      : undefined,
  };
}

function serializeCorporate(profile: any) {
  return {
    id: profile.id,
    companyName: profile.companyName,
    description: profile.description,
    city: profile.city,
    industry: profile.industry,
    status: profile.status,
    rejectionReason: profile.rejectionReason,
    createdAt: profile.createdAt,
    owner: profile.user
      ? { id: profile.user.id, email: profile.user.email, name: profile.user.name, handle: profile.user.handle }
      : undefined,
  };
}

const listOrgQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

const listNgosQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

const setStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  rejectionReason: z.string().max(500).optional(),
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

const reasonBodySchema = z.object({ reason: z.string().max(500).optional() });

const searchAccountsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  type: z.enum(['user', 'ngo', 'nursery', 'corporate']).optional(),
  isBlocked: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

const blockAccountSchema = z.object({ reason: z.string().max(500).optional() });

const reviewTreeSchema = z.object({ decision: z.enum(['approve', 'reject']) });

const CATALOG_MODELS = ['species', 'achievements', 'challenges', 'missions', 'themes', 'decorations'] as const;
const catalogModelParamSchema = z.enum(CATALOG_MODELS);

function serializeGroup(group: any) {
  return {
    id: group.id,
    groupName: group.groupName,
    groupType: group.groupType,
    description: group.description,
    status: group.status,
    memberCount: group._count?.members,
    createdAt: group.createdAt,
    owner: group.user
      ? { id: group.user.id, email: group.user.email, name: group.user.name, handle: group.user.handle }
      : undefined,
  };
}

const listGroupsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

const setGroupStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('admin'));

  fastify.get('/ngos', async (request, reply) => {
    const parsed = listNgosQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const { ngos, total } = await adminService.listNgos(fastify.prisma, parsed.data);
    reply.send({ total, ngos: ngos.map(serializeNgo) });
  });

  fastify.get<{ Params: { id: string } }>('/ngos/:id/summary', async (request, reply) => {
    const summary = await adminService.getNgoSummary(fastify.prisma, request.params.id);
    reply.send(summary);
  });

  fastify.patch<{ Params: { id: string } }>('/ngos/:id/status', async (request, reply) => {
    const parsed = setStatusSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const profile = await adminService.setNgoStatus(fastify.prisma, request.params.id, {
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason,
      adminUserId: request.user!.id,
    });

    reply.send(serializeNgo(profile));
  });

  // ---------- Nurseries / Corporate (same approval workflow as NGO) ----------

  fastify.get('/nurseries', async (request, reply) => {
    const parsed = listOrgQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const { nurseries, total } = await adminService.listNurseries(fastify.prisma, parsed.data);
    reply.send({ total, nurseries: nurseries.map(serializeNursery) });
  });

  fastify.patch<{ Params: { id: string } }>('/nurseries/:id/status', async (request, reply) => {
    const parsed = setStatusSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const profile = await adminService.setNurseryStatus(fastify.prisma, request.params.id, {
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason,
      adminUserId: request.user!.id,
    });

    reply.send(serializeNursery(profile));
  });

  fastify.get('/corporates', async (request, reply) => {
    const parsed = listOrgQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const { corporates, total } = await adminService.listCorporates(fastify.prisma, parsed.data);
    reply.send({ total, corporates: corporates.map(serializeCorporate) });
  });

  fastify.patch<{ Params: { id: string } }>('/corporates/:id/status', async (request, reply) => {
    const parsed = setStatusSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const profile = await adminService.setCorporateStatus(fastify.prisma, request.params.id, {
      status: parsed.data.status,
      rejectionReason: parsed.data.rejectionReason,
      adminUserId: request.user!.id,
    });

    reply.send(serializeCorporate(profile));
  });

  // ---------- Groups (no approval workflow — see admin.service.ts) ----------

  fastify.get('/groups', async (request, reply) => {
    const parsed = listGroupsQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const { groups, total } = await adminService.listGroups(fastify.prisma, parsed.data);
    reply.send({ total, groups: groups.map(serializeGroup) });
  });

  fastify.patch<{ Params: { id: string } }>('/groups/:id/status', async (request, reply) => {
    const parsed = setGroupStatusSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const group = await adminService.setGroupStatus(fastify.prisma, request.params.id, parsed.data.status, request.user!.id);
    reply.send(serializeGroup(group));
  });

  fastify.get('/action-logs', async (request, reply) => {
    const parsed = paginationQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const { logs, total } = await adminService.listActionLogs(fastify.prisma, parsed.data);
    reply.send({
      total,
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        targetType: l.targetType,
        targetId: l.targetId,
        reason: l.reason,
        createdAt: l.createdAt,
        actor: { name: l.actor.name, handle: l.actor.handle },
      })),
    });
  });

  // ---------- Content moderation ----------

  fastify.get('/reports', async (request, reply) => {
    const parsed = reportsQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(await reportService.listReports(fastify.prisma, parsed.data));
  });

  // ---------- Account search & blocking (User/NGO/Nursery/Corporate) ----------

  fastify.get('/accounts', async (request, reply) => {
    const parsed = searchAccountsQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(await adminService.searchAccounts(fastify.prisma, parsed.data));
  });

  fastify.get<{ Params: { userId: string } }>('/accounts/:userId/profile', async (request, reply) => {
    reply.send(await adminService.getAccountProfile(fastify.prisma, request.params.userId));
  });

  fastify.post<{ Params: { userId: string } }>('/accounts/:userId/block', async (request, reply) => {
    const parsed = blockAccountSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const account = await adminService.blockAccount(fastify.prisma, request.params.userId, {
      reason: parsed.data.reason,
      adminUserId: request.user!.id,
    });
    reply.send(account);
  });

  fastify.post<{ Params: { userId: string } }>('/accounts/:userId/unblock', async (request, reply) => {
    const account = await adminService.unblockAccount(fastify.prisma, request.params.userId, request.user!.id);
    reply.send(account);
  });

  // ---------- AI tree-photo verification review queue ----------

  fastify.get('/trees/review-queue', async (request, reply) => {
    const parsed = paginationQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(await adminService.listTreesForReview(fastify.prisma, parsed.data));
  });

  fastify.patch<{ Params: { id: string } }>('/trees/:id/review', async (request, reply) => {
    const parsed = reviewTreeSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const tree = await adminService.reviewTree(fastify.prisma, request.params.id, {
      decision: parsed.data.decision,
      adminUserId: request.user!.id,
    });
    reply.send(tree);
  });

  // ---------- Ops oversight: Drives / Donations / Orders ----------

  fastify.get('/drives', async (request, reply) => {
    const parsed = paginationQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(await adminOpsService.listDrives(fastify.prisma, parsed.data));
  });

  fastify.patch<{ Params: { id: string } }>('/drives/:id/cancel', async (request, reply) => {
    const parsed = reasonBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError('Invalid input');

    const drive = await adminOpsService.adminCancelDrive(fastify.prisma, request.params.id, {
      reason: parsed.data.reason,
      adminUserId: request.user!.id,
    });
    reply.send(drive);
  });

  fastify.get('/donations', async (request, reply) => {
    const parsed = paginationQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(await adminOpsService.listDonations(fastify.prisma, parsed.data));
  });

  fastify.patch<{ Params: { id: string } }>('/donations/:id/refund', async (request, reply) => {
    const parsed = reasonBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError('Invalid input');

    const donation = await adminOpsService.adminRefundDonation(fastify.prisma, request.params.id, {
      reason: parsed.data.reason,
      adminUserId: request.user!.id,
    });
    reply.send(donation);
  });

  fastify.get('/orders', async (request, reply) => {
    const parsed = paginationQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(await adminOpsService.listOrders(fastify.prisma, parsed.data));
  });

  fastify.patch<{ Params: { id: string } }>('/orders/:id/refund', async (request, reply) => {
    const parsed = reasonBodySchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError('Invalid input');

    const order = await adminOpsService.adminRefundOrder(fastify.prisma, request.params.id, {
      reason: parsed.data.reason,
      adminUserId: request.user!.id,
    });
    reply.send(order);
  });

  // ---------- Catalog management (species/achievements/challenges/missions/themes/decorations) ----------

  fastify.get<{ Params: { model: string } }>('/catalog/:model', async (request, reply) => {
    const parsedModel = catalogModelParamSchema.safeParse(request.params.model);
    if (!parsedModel.success) throw new BadRequestError('Unknown catalog type');
    reply.send(await adminCatalogService.listCatalogItems(fastify.prisma, parsedModel.data));
  });

  fastify.post<{ Params: { model: string } }>('/catalog/:model', async (request, reply) => {
    const parsedModel = catalogModelParamSchema.safeParse(request.params.model);
    if (!parsedModel.success) throw new BadRequestError('Unknown catalog type');
    const item = await adminCatalogService.createCatalogItem(
      fastify.prisma,
      parsedModel.data,
      (request.body ?? {}) as Record<string, unknown>,
    );
    reply.status(201).send(item);
  });

  fastify.patch<{ Params: { model: string; id: string } }>('/catalog/:model/:id', async (request, reply) => {
    const parsedModel = catalogModelParamSchema.safeParse(request.params.model);
    if (!parsedModel.success) throw new BadRequestError('Unknown catalog type');
    const item = await adminCatalogService.updateCatalogItem(
      fastify.prisma,
      parsedModel.data,
      request.params.id,
      (request.body ?? {}) as Record<string, unknown>,
    );
    reply.send(item);
  });

  fastify.patch<{ Params: { id: string } }>('/reports/:id', async (request, reply) => {
    const parsed = reportActionSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    await reportService.actOnReport(
      fastify.prisma,
      request.user!.id,
      request.params.id,
      parsed.data.action,
      parsed.data.reason,
    );
    reply.status(204).send();
  });

  fastify.get('/overview', async (_request, reply) => {
    const stats = await adminService.getOverviewStats(fastify.prisma);
    reply.send(stats);
  });
}
