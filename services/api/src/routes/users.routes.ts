import { FastifyInstance } from 'fastify';
import { updateMeSchema, changePasswordSchema, personalizeSchema } from '../schemas/users.schema';
import { toPublicUser, issueTokenPair, logoutAll } from '../services/auth.service';
import { hashPassword, comparePassword } from '../utils/password';
import { BadRequestError, ConflictError, UnauthorizedError } from '../utils/errors';
import { refreshUserImpact } from '../services/treeImpact.service';
import { syncStreak } from '../services/streak.service';
import { saveUserAvatar } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import { eraseAccount } from '../services/accountErasure.service';
import { limit } from '../plugins/rateLimit';

export default async function usersRoutes(fastify: FastifyInstance) {
  fastify.get('/me', async (request, reply) => {
    // Trees keep growing, so the stored CO2 figure is re-derived whenever the profile is read.
    const impact = await refreshUserImpact(fastify.prisma, request.user!.id);
    const { user } = await syncStreak(fastify.prisma, request.user!.id);
    const treesPlantedThisYear = await fastify.prisma.tree.count({
      where: { userId: user.id, plantedAt: { gte: new Date(new Date().getFullYear(), 0, 1) } },
    });
    reply.send({ ...toPublicUser(user), co2NextYearKg: impact.co2NextYearKg, treesPlantedThisYear });
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

  // Profile photo. Replaces the emoji avatar wherever the profile is shown; DELETE reverts to it.
  fastify.post('/me/avatar', async (request, reply) => {
    const { file } = splitMultipartBody(request.body as any, 'photo');
    if (!file) throw new BadRequestError('A photo is required');

    const buffer = await file.toBuffer();
    const avatarUrl = await saveUserAvatar({ filename: file.filename, mimetype: file.mimetype, buffer });
    const updated = await fastify.prisma.user.update({ where: { id: request.user!.id }, data: { avatarUrl } });
    reply.send(toPublicUser(updated));
  });

  fastify.delete('/me/avatar', async (request, reply) => {
    const updated = await fastify.prisma.user.update({ where: { id: request.user!.id }, data: { avatarUrl: null } });
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

  // Permanent erasure of personal data, not just hiding the account - see accountErasure.service.ts.
  // Tightly limited: it is destructive, so a stolen session shouldn't be able to retry it freely.
  fastify.delete('/me', limit(5, '1 hour'), async (request, reply) => {
    await eraseAccount(fastify.prisma, request.user!.id);
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

    // Lets the client keep showing "Sent"/"Friends" for people already connected, instead of
    // offering "Add" again after the search panel is reopened.
    const me = request.user!.id;
    const ids = users.map((u) => u.id);
    const friendships = ids.length
      ? await fastify.prisma.friendship.findMany({
          where: {
            status: { in: ['pending', 'accepted'] },
            OR: [
              { requesterId: me, addresseeId: { in: ids } },
              { addresseeId: me, requesterId: { in: ids } },
            ],
          },
          select: { requesterId: true, addresseeId: true, status: true },
        })
      : [];
    const statusByUser = new Map<string, 'sent' | 'received' | 'friends'>();
    for (const f of friendships) {
      const other = f.requesterId === me ? f.addresseeId : f.requesterId;
      statusByUser.set(other, f.status === 'accepted' ? 'friends' : f.requesterId === me ? 'sent' : 'received');
    }

    reply.send(users.map((u) => ({ ...u, friendStatus: statusByUser.get(u.id) ?? 'none' })));
  });
}
