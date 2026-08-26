import { FastifyInstance } from 'fastify';
import * as nurseryService from '../services/nursery.service';
import { saveNurseryLogo } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import { BadRequestError } from '../utils/errors';
import { updateNurseryProfileSchema, createSaplingStockSchema, updateSaplingStockSchema } from '../schemas/nursery.schema';

function isTrue(v: unknown) {
  return v === true || v === 'true';
}

function serializeProfile(profile: any) {
  return {
    id: profile.id,
    nurseryName: profile.nurseryName,
    description: profile.description,
    logoUrl: profile.logoUrl,
    city: profile.city,
    contactPhone: profile.contactPhone,
    lat: profile.lat,
    lng: profile.lng,
    status: profile.status,
    rejectionReason: profile.rejectionReason,
    streakCurrent: profile.streakCurrent,
    streakMax: profile.streakMax,
    badgesCount: profile.badgesCount,
    createdAt: profile.createdAt,
  };
}

function serializeReservation(r: any) {
  return {
    id: r.id,
    stockId: r.stockId,
    quantity: r.quantity,
    status: r.status,
    message: r.message,
    createdAt: r.createdAt,
    respondedAt: r.respondedAt,
    species: r.stock?.species,
    requester: r.user ? { id: r.user.id, name: r.user.name, avatarEmoji: r.user.avatarEmoji } : undefined,
    nursery: r.nursery ? { id: r.nursery.id, nurseryName: r.nursery.nurseryName, logoUrl: r.nursery.logoUrl } : undefined,
  };
}

export default async function nurseryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('nursery'));

  fastify.get('/profile', async (request, reply) => {
    reply.send(serializeProfile(await nurseryService.getOwnProfile(fastify.prisma, request.user!.id)));
  });

  fastify.patch('/profile', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any, 'logo')
      : { fields: (request.body ?? {}) as Record<string, string>, file: undefined };

    const parsed = updateNurseryProfileSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let logoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      logoUrl = await saveNurseryLogo({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const profile = await nurseryService.updateOwnProfile(fastify.prisma, request.user!.id, {
      ...parsed.data,
      ...(logoUrl ? { logoUrl } : {}),
    });
    reply.send(serializeProfile(profile));
  });

  fastify.post('/resubmit', async (request, reply) => {
    reply.send(serializeProfile(await nurseryService.resubmitProfile(fastify.prisma, request.user!.id)));
  });

  fastify.get('/stats', async (request, reply) => {
    reply.send(await nurseryService.getOwnStats(fastify.prisma, request.user!.id));
  });

  fastify.get('/stock', async (request, reply) => {
    reply.send(await nurseryService.listStock(fastify.prisma, request.user!.id));
  });

  fastify.post('/stock', async (request, reply) => {
    const parsed = createSaplingStockSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const item = await nurseryService.createStock(fastify.prisma, request.user!.id, {
      ...parsed.data,
      isFree: parsed.data.isFree !== undefined ? isTrue(parsed.data.isFree) : undefined,
    });
    reply.status(201).send(item);
  });

  fastify.patch<{ Params: { id: string } }>('/stock/:id', async (request, reply) => {
    const parsed = updateSaplingStockSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const item = await nurseryService.updateStock(fastify.prisma, request.user!.id, request.params.id, {
      ...parsed.data,
      isFree: parsed.data.isFree !== undefined ? isTrue(parsed.data.isFree) : undefined,
    });
    reply.send(item);
  });

  fastify.delete<{ Params: { id: string } }>('/stock/:id', async (request, reply) => {
    await nurseryService.deleteStock(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });

  // Daily grid, same shape as GET /api/streaks/calendar — StreakCalendar.tsx renders both.
  fastify.get<{ Querystring: { weeks?: string } }>('/streaks/calendar', async (request, reply) => {
    const weeksCount = Math.min(Math.max(Number(request.query.weeks) || 4, 1), 12);
    reply.send(await nurseryService.getStreakCalendar(fastify.prisma, request.user!.id, weeksCount));
  });

  fastify.get('/badges', async (request, reply) => {
    reply.send(await nurseryService.getBadges(fastify.prisma, request.user!.id));
  });

  fastify.get<{ Querystring: { status?: string } }>('/reservations', async (request, reply) => {
    const rows = await nurseryService.listReservations(fastify.prisma, request.user!.id, request.query.status);
    reply.send(rows.map(serializeReservation));
  });

  fastify.post<{ Params: { id: string } }>('/reservations/:id/fulfill', async (request, reply) => {
    reply.send(await nurseryService.fulfillReservation(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.post<{ Params: { id: string } }>('/reservations/:id/decline', async (request, reply) => {
    reply.send(await nurseryService.declineReservation(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.get<{ Querystring: { page?: string; take?: string } }>('/stock/ledger', async (request, reply) => {
    const page = Number(request.query.page) || 1;
    const take = Number(request.query.take) || 30;
    reply.send(await nurseryService.getStockLedger(fastify.prisma, request.user!.id, page, take));
  });

  fastify.get('/stock/analytics', async (request, reply) => {
    reply.send(await nurseryService.getStockAnalytics(fastify.prisma, request.user!.id));
  });
}
