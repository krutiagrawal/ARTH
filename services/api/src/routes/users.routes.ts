import { FastifyInstance } from 'fastify';
import { updateMeSchema, changePasswordSchema, personalizeSchema } from '../schemas/users.schema';
import { toPublicUser, issueTokenPair, logoutAll } from '../services/auth.service';
import { hashPassword, comparePassword } from '../utils/password';
import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors';
import { refreshUserImpact } from '../services/treeImpact.service';

export default async function usersRoutes(fastify: FastifyInstance) {
  fastify.get('/me', async (request, reply) => {
    // Trees keep growing, so the stored CO2 figure is re-derived whenever the profile is read.
    const impact = await refreshUserImpact(fastify.prisma, request.user!.id);
    const user = await fastify.prisma.user.findUniqueOrThrow({ where: { id: request.user!.id } });
    reply.send({ ...toPublicUser(user), co2NextYearKg: impact.co2NextYearKg });
  });

  fastify.patch('/me', async (request, reply) => {
    const parsed = updateMeSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    if (parsed.data.handle) {
      const existing = await fastify.prisma.user.findUnique({ where: { handle: parsed.data.handle } });
      if (existing && existing.id !== request.user!.id) {
        throw new ConflictError('Handle is already taken');
      }
    }

    const updated = await fastify.prisma.user.update({
      where: { id: request.user!.id },
      data: parsed.data,
    });

    reply.send(toPublicUser(updated));
  });

  fastify.patch('/me/personalize', async (request, reply) => {
    const parsed = personalizeSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const updated = await fastify.prisma.user.update({
      where: { id: request.user!.id },
      data: { ...parsed.data, personalizationCompletedAt: new Date() },
    });

    reply.send(toPublicUser(updated));
  });

  fastify.post('/me/change-password', async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const user = await fastify.prisma.user.findUniqueOrThrow({ where: { id: request.user!.id } });

    const valid = await comparePassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Current password is incorrect');

    const isSameAsCurrent = await comparePassword(parsed.data.newPassword, user.passwordHash);
    if (isSameAsCurrent) throw new BadRequestError('New password must be different from your current password');

    const passwordHash = await hashPassword(parsed.data.newPassword);
    const updated = await fastify.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke every other session for safety, then hand this device a fresh pair so it isn't
    // logged out by the change it just made.
    await logoutAll(fastify.prisma, user.id);
    const tokens = await issueTokenPair(fastify.prisma, updated, parsed.data.deviceInfo);

    reply.send({ user: toPublicUser(updated), ...tokens });
  });

  fastify.delete('/me', async (request, reply) => {
    await fastify.prisma.user.update({
      where: { id: request.user!.id },
      data: { isDeleted: true },
    });
    reply.status(204).send();
  });

  fastify.get<{ Querystring: { q?: string } }>('/search', async (request, reply) => {
    const q = request.query.q?.trim();
    if (!q) return reply.send([]);

    const users = await fastify.prisma.user.findMany({
      where: {
        isDeleted: false,
        id: { not: request.user!.id },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { handle: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
      select: { id: true, name: true, handle: true, avatarEmoji: true, level: true },
    });

    reply.send(users);
  });
}
