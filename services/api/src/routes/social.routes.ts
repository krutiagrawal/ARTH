import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as postService from '../services/post.service';
import * as blockService from '../services/block.service';
import * as reportService from '../services/report.service';
import * as notificationService from '../services/notification.service';
import { registerPushToken, removePushToken } from '../services/push.service';
import { BadRequestError } from '../utils/errors';

const cursorQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

const reportSchema = z.object({
  targetType: z.enum(['post', 'story', 'user', 'ngo', 'portfolio_entry', 'order_review']),
  targetId: z.string().uuid(),
  reason: z.enum(['spam', 'harassment', 'hate', 'misinformation', 'nudity', 'violence', 'other']),
  details: z.string().max(1000).optional(),
});

const blockSchema = z
  .object({
    userId: z.string().uuid().optional(),
    ngoId: z.string().uuid().optional(),
  })
  .refine((v) => !v.userId !== !v.ngoId, { message: 'Provide exactly one of userId or ngoId' });

/**
 * The viewer-facing social surface: the main feed, saved posts, moderation actions, the
 * notification centre and push registration.
 *
 * Post CRUD lives in posts.routes.ts; this file is everything that isn't addressed by post id.
 */
export default async function socialRoutes(fastify: FastifyInstance) {
  // ---------- Feed ----------

  // Namespaced under /social because /api/feed is already the personal gamification activity
  // feed (tree_planted, achievement_unlocked, ...), which is a different thing entirely.
  fastify.get('/social/feed', async (request, reply) => {
    const parsed = cursorQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(await postService.getSocialFeed(fastify.prisma, request.user!.id, parsed.data));
  });

  fastify.get('/social/saved', async (request, reply) => {
    const parsed = cursorQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(await postService.listSavedPosts(fastify.prisma, request.user!.id, parsed.data));
  });

  fastify.get<{ Params: { id: string } }>('/users/:id/posts', async (request, reply) => {
    const parsed = cursorQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(
      await postService.listPostsByAuthor(
        fastify.prisma,
        request.user!.id,
        { userId: request.params.id },
        parsed.data,
      ),
    );
  });

  fastify.get<{ Params: { id: string } }>('/ngos/:id/posts', async (request, reply) => {
    const parsed = cursorQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(
      await postService.listPostsByAuthor(
        fastify.prisma,
        request.user!.id,
        { ngoId: request.params.id },
        parsed.data,
      ),
    );
  });

  // ---------- Moderation ----------

  fastify.post('/reports', async (request, reply) => {
    const parsed = reportSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');
    await reportService.createReport(fastify.prisma, request.user!.id, parsed.data);
    reply.status(201).send({ ok: true });
  });

  fastify.get('/blocks', async (request, reply) => {
    reply.send(await blockService.listBlocks(fastify.prisma, request.user!.id));
  });

  fastify.post('/blocks', async (request, reply) => {
    const parsed = blockSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');
    await blockService.blockTarget(fastify.prisma, request.user!.id, parsed.data);
    reply.status(204).send();
  });

  fastify.delete('/blocks', async (request, reply) => {
    const parsed = blockSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');
    await blockService.unblockTarget(fastify.prisma, request.user!.id, parsed.data);
    reply.status(204).send();
  });

  // ---------- Notifications ----------

  fastify.get('/notifications', async (request, reply) => {
    const parsed = cursorQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(await notificationService.listNotifications(fastify.prisma, request.user!.id, parsed.data));
  });

  fastify.get('/notifications/unread-count', async (request, reply) => {
    reply.send({ count: await notificationService.getUnreadCount(fastify.prisma, request.user!.id) });
  });

  fastify.post('/notifications/read', async (request, reply) => {
    const parsed = z.object({ ids: z.array(z.string().uuid()).optional() }).safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError('Invalid input');
    await notificationService.markRead(fastify.prisma, request.user!.id, parsed.data.ids);
    reply.status(204).send();
  });

  // ---------- Push registration ----------

  fastify.post('/push-tokens', async (request, reply) => {
    const parsed = z
      .object({ token: z.string().min(1).max(255), platform: z.string().min(1).max(20) })
      .safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError('Invalid input');
    await registerPushToken(fastify.prisma, request.user!.id, parsed.data.token, parsed.data.platform);
    reply.status(204).send();
  });

  fastify.delete<{ Params: { token: string } }>('/push-tokens/:token', async (request, reply) => {
    await removePushToken(fastify.prisma, request.user!.id, request.params.token);
    reply.status(204).send();
  });
}
