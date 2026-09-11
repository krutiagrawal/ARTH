import { FastifyInstance } from 'fastify';
import * as nurseryService from '../services/nursery.service';
import * as orderService from '../services/order.service';
import { saveNurseryLogo, saveNurseryCoverPhoto, saveStockPhoto } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import { BadRequestError } from '../utils/errors';
import {
  updateNurseryProfileSchema,
  createSaplingStockSchema,
  updateSaplingStockSchema,
  respondToReviewSchema,
} from '../schemas/nursery.schema';

function isTrue(v: unknown) {
  return v === true || v === 'true';
}

function serializeProfile(profile: any) {
  return {
    id: profile.id,
    nurseryName: profile.nurseryName,
    description: profile.description,
    logoUrl: profile.logoUrl,
    coverPhotoUrl: profile.coverPhotoUrl,
    city: profile.city,
    contactPhone: profile.contactPhone,
    lat: profile.lat,
    lng: profile.lng,
    status: profile.status,
    rejectionReason: profile.rejectionReason,
    streakCurrent: profile.streakCurrent,
    streakMax: profile.streakMax,
    badgesCount: profile.badgesCount,
    avgRating: profile.avgRating,
    reviewCount: profile.reviewCount,
    offersDelivery: profile.offersDelivery,
    deliveryRadiusKm: profile.deliveryRadiusKm,
    followPolicy: profile.followPolicy,
    offersPickup: profile.offersPickup,
    deliveryFeeCents: profile.deliveryFeeCents,
    minDeliveryOrderCents: profile.minDeliveryOrderCents,
    operatingHours: profile.operatingHours,
    pickupWindows: profile.pickupWindows,
    pickupInstructions: profile.pickupInstructions,
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
    // A second optional file field alongside `logo` — splitMultipartBody only plucks one named
    // field, so the cover photo (if present) is read directly off the raw multipart body here.
    const coverFile = isMultipart ? (request.body as any)?.coverPhoto : undefined;

    const parsed = updateNurseryProfileSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let logoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      logoUrl = await saveNurseryLogo({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    let coverPhotoUrl: string | undefined;
    if (coverFile?.toBuffer) {
      const buffer = await coverFile.toBuffer();
      coverPhotoUrl = await saveNurseryCoverPhoto({ filename: coverFile.filename, mimetype: coverFile.mimetype, buffer });
    }

    const profile = await nurseryService.updateOwnProfile(fastify.prisma, request.user!.id, {
      ...parsed.data,
      offersDelivery: parsed.data.offersDelivery !== undefined ? isTrue(parsed.data.offersDelivery) : undefined,
      offersPickup: parsed.data.offersPickup !== undefined ? isTrue(parsed.data.offersPickup) : undefined,
      ...(logoUrl ? { logoUrl } : {}),
      ...(coverPhotoUrl ? { coverPhotoUrl } : {}),
    });
    reply.send(serializeProfile(profile));
  });

  fastify.post('/resubmit', async (request, reply) => {
    reply.send(serializeProfile(await nurseryService.resubmitProfile(fastify.prisma, request.user!.id)));
  });

  fastify.get('/stats', async (request, reply) => {
    reply.send(await nurseryService.getOwnStats(fastify.prisma, request.user!.id));
  });

  // Section 1 — prioritizes today's actions/activity over decorative stats.
  fastify.get('/dashboard/today', async (request, reply) => {
    reply.send(await nurseryService.getDashboardSummary(fastify.prisma, request.user!.id));
  });

  // Section 7 — "Trees Growing Through You" and the rest of the impact payload.
  fastify.get('/impact', async (request, reply) => {
    reply.send(await nurseryService.getImpact(fastify.prisma, request.user!.id));
  });

  fastify.get<{ Querystring: { species?: string; native?: string; availability?: string; season?: string } }>(
    '/stock',
    async (request, reply) => {
      reply.send(
        await nurseryService.listStock(fastify.prisma, request.user!.id, {
          species: request.query.species,
          native: request.query.native !== undefined ? isTrue(request.query.native) : undefined,
          availability: request.query.availability as any,
          season: request.query.season,
        }),
      );
    },
  );

  fastify.post('/stock', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any, 'photo')
      : { fields: (request.body ?? {}) as Record<string, unknown>, file: undefined };

    const parsed = createSaplingStockSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let photoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      photoUrl = await saveStockPhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const item = await nurseryService.createStock(fastify.prisma, request.user!.id, {
      ...parsed.data,
      isFree: parsed.data.isFree !== undefined ? isTrue(parsed.data.isFree) : undefined,
      ...(photoUrl ? { photoUrl } : {}),
    });
    reply.status(201).send(item);
  });

  fastify.patch<{ Params: { id: string } }>('/stock/:id', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any, 'photo')
      : { fields: (request.body ?? {}) as Record<string, unknown>, file: undefined };

    const parsed = updateSaplingStockSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let photoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      photoUrl = await saveStockPhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const item = await nurseryService.updateStock(fastify.prisma, request.user!.id, request.params.id, {
      ...parsed.data,
      isFree: parsed.data.isFree !== undefined ? isTrue(parsed.data.isFree) : undefined,
      ...(photoUrl ? { photoUrl } : {}),
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

  // ---------- Marketplace orders (paid cart checkouts — distinct from the free /reservations flow) ----------

  fastify.get<{ Querystring: { status?: string; fulfillmentType?: string } }>('/orders', async (request, reply) => {
    const profile = await nurseryService.getOwnProfile(fastify.prisma, request.user!.id);
    reply.send(
      await orderService.listNurseryOrders(fastify.prisma, profile.id, {
        status: request.query.status,
        fulfillmentType: request.query.fulfillmentType,
      }),
    );
  });

  fastify.get<{ Params: { id: string } }>('/orders/:id', async (request, reply) => {
    const profile = await nurseryService.getOwnProfile(fastify.prisma, request.user!.id);
    reply.send(await orderService.getNurseryOrder(fastify.prisma, profile.id, request.params.id));
  });

  fastify.post<{ Params: { id: string } }>('/orders/:id/pack', async (request, reply) => {
    const profile = await nurseryService.getOwnProfile(fastify.prisma, request.user!.id);
    reply.send(await orderService.markOrderPacked(fastify.prisma, profile.id, request.params.id));
  });

  // Pickup branch: packed -> ready_for_pickup -> picked_up (instead of out_for_delivery -> delivered).
  fastify.post<{ Params: { id: string } }>('/orders/:id/ready-for-pickup', async (request, reply) => {
    const profile = await nurseryService.getOwnProfile(fastify.prisma, request.user!.id);
    reply.send(await orderService.markOrderReadyForPickup(fastify.prisma, profile.id, request.params.id));
  });

  fastify.post<{ Params: { id: string }; Body: { code?: string } }>('/orders/:id/picked-up', async (request, reply) => {
    const profile = await nurseryService.getOwnProfile(fastify.prisma, request.user!.id);
    reply.send(await orderService.markOrderPickedUp(fastify.prisma, profile.id, request.params.id, request.body?.code));
  });

  fastify.post<{ Params: { id: string }; Body: { riderName?: string; riderPhone?: string } }>(
    '/orders/:id/dispatch',
    async (request, reply) => {
      const profile = await nurseryService.getOwnProfile(fastify.prisma, request.user!.id);
      reply.send(
        await orderService.markOrderOutForDelivery(fastify.prisma, profile.id, request.params.id, {
          name: request.body?.riderName,
          phone: request.body?.riderPhone,
        }),
      );
    },
  );

  fastify.post<{ Params: { id: string }; Body: { otp?: string; code?: string } }>('/orders/:id/deliver', async (request, reply) => {
    const profile = await nurseryService.getOwnProfile(fastify.prisma, request.user!.id);
    reply.send(
      await orderService.markOrderDelivered(fastify.prisma, profile.id, request.params.id, request.body?.code ?? request.body?.otp),
    );
  });

  fastify.post<{ Params: { id: string } }>('/orders/:id/cancel', async (request, reply) => {
    const profile = await nurseryService.getOwnProfile(fastify.prisma, request.user!.id);
    reply.send(await orderService.nurseryCancelOrder(fastify.prisma, profile.id, request.params.id));
  });

  // ---------- Reviews ----------

  fastify.get('/reviews', async (request, reply) => {
    reply.send(await nurseryService.listReviews(fastify.prisma, request.user!.id));
  });

  fastify.post<{ Params: { id: string } }>('/reviews/:id/respond', async (request, reply) => {
    const parsed = respondToReviewSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    reply.send(await nurseryService.respondToReview(fastify.prisma, request.user!.id, request.params.id, parsed.data.response));
  });
}
