import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as adminService from '../services/admin.service';
import { BadRequestError } from '../utils/errors';

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

  fastify.get('/overview', async (_request, reply) => {
    const stats = await adminService.getOverviewStats(fastify.prisma);
    reply.send(stats);
  });
}
