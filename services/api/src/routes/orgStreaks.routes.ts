import { FastifyInstance } from 'fastify';
import { protectOrgStreakSchema, reviveStreakSchema } from '../schemas/streaks.schema';
import {
  OrgKind,
  getOrgStreakStatus,
  protectOrgWeek,
  reviveOrgStreak,
} from '../services/orgStreak.service';
import { NotFoundError } from '../utils/errors';

/** Weekly streak status plus freeze/XP protect & revive for NGO and nursery accounts. */
export default async function orgStreaksRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('ngo', 'nursery'));

  async function resolveOrg(userId: string, role: string): Promise<{ kind: OrgKind; id: string }> {
    if (role === 'ngo') {
      const p = await fastify.prisma.ngoProfile.findUnique({ where: { userId }, select: { id: true } });
      if (!p) throw new NotFoundError('NGO profile not found');
      return { kind: 'ngo', id: p.id };
    }
    const p = await fastify.prisma.nurseryProfile.findUnique({ where: { userId }, select: { id: true } });
    if (!p) throw new NotFoundError('Nursery profile not found');
    return { kind: 'nursery', id: p.id };
  }

  fastify.get('/status', async (request, reply) => {
    const org = await resolveOrg(request.user!.id, request.user!.role);
    reply.send(await getOrgStreakStatus(fastify.prisma, org.kind, org.id));
  });

  fastify.post('/revive', async (request, reply) => {
    const { method } = reviveStreakSchema.parse(request.body);
    const org = await resolveOrg(request.user!.id, request.user!.role);
    reply.send(await fastify.prisma.$transaction((tx) => reviveOrgStreak(tx, org.kind, org.id, method)));
  });

  fastify.post('/protect', async (request, reply) => {
    const { method } = protectOrgStreakSchema.parse(request.body);
    const org = await resolveOrg(request.user!.id, request.user!.role);
    reply.send(await fastify.prisma.$transaction((tx) => protectOrgWeek(tx, org.kind, org.id, method)));
  });
}
