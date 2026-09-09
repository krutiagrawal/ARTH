import { FastifyInstance } from 'fastify';
import * as nurseryPublicService from '../services/nurseryPublic.service';
import * as reservationService from '../services/reservation.service';
import { createReservationSchema, nurseryBrowseQuerySchema } from '../schemas/nursery.schema';
import * as nurseryFollowService from '../services/nurseryFollow.service';
import { getPublicBadges } from '../services/nursery.service';
import { BadRequestError } from '../utils/errors';

interface NurseryLeaderboardRow {
  id: string;
  nursery_name: string;
  logo_url: string | null;
  followers: bigint;
  rank: bigint;
}

function serializeNurserySummary(n: any) {
  return {
    id: n.id,
    nurseryName: n.nurseryName,
    description: n.description,
    logoUrl: n.logoUrl,
    city: n.city,
    lat: n.lat,
    lng: n.lng,
    avgRating: n.avgRating,
    reviewCount: n.reviewCount,
    offersDelivery: n.offersDelivery,
    distanceKm: n.distanceKm,
  };
}

export default async function nurseriesPublicRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const parsed = nurseryBrowseQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const { total, nurseries } = await nurseryPublicService.browseNurseries(fastify.prisma, parsed.data);
    reply.send({ total, nurseries: nurseries.map(serializeNurserySummary) });
  });

  // Public ranking by accepted-follower count — nurseries have no "trees planted" metric of
  // their own the way NGOs do, so followers is the closest available signal of reach.
  fastify.get<{ Querystring: { limit?: string; offset?: string } }>('/leaderboard', async (request, reply) => {
    const limit = Math.min(Number(request.query.limit) || 20, 100);
    const offset = Math.max(Number(request.query.offset) || 0, 0);

    const [rows, total] = await Promise.all([
      fastify.prisma.$queryRaw<NurseryLeaderboardRow[]>`
        SELECT n.id, n.nursery_name, n.logo_url, COUNT(f.id) AS followers,
               RANK() OVER (ORDER BY COUNT(f.id) DESC) AS rank
        FROM nursery_profiles n
        LEFT JOIN follows f ON f.nursery_id = n.id AND f.status = 'accepted'
        WHERE n.status = 'approved'
        GROUP BY n.id
        ORDER BY followers DESC
        LIMIT ${limit} OFFSET ${offset};
      `,
      fastify.prisma.nurseryProfile.count({ where: { status: 'approved' } }),
    ]);

    reply.send({
      entries: rows.map((row) => ({
        rank: Number(row.rank),
        id: row.id,
        nurseryName: row.nursery_name,
        logoUrl: row.logo_url,
        followers: Number(row.followers),
      })),
      total,
      hasMore: offset + rows.length < total,
    });
  });

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request, reply) => {
      reply.send(await nurseryPublicService.getPublicNurseryProfile(fastify.prisma, request.params.id, request.user?.id));
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id/achievements', async (request, reply) => {
    reply.send(await getPublicBadges(fastify.prisma, request.params.id));
  });

  // nurseryId in the path is purely for a self-documenting URL — the actual nursery is resolved
  // from the stock item itself in reservation.service.ts, since a stock id already implies it.
  fastify.post<{ Params: { nurseryId: string; stockId: string } }>(
    '/:nurseryId/stock/:stockId/reservations',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = createReservationSchema.safeParse(request.body);
      if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

      const reservation = await reservationService.createReservation(
        fastify.prisma,
        request.user!.id,
        request.params.stockId,
        parsed.data.quantity,
        parsed.data.message
      );
      reply.status(201).send(reservation);
    }
  );

  // Read-only accepted-followers list for any visitor — the owner-only inbox with
  // accept/decline/remove lives at /api/nursery/followers (nurseryFollowers.routes.ts).
  fastify.get<{ Params: { id: string }; Querystring: { page?: string; take?: string } }>(
    '/:id/followers',
    async (request, reply) => {
      const take = Math.min(Number(request.query.take) || 30, 100);
      const page = Math.max(Number(request.query.page) || 1, 1);
      const where = { nurseryId: request.params.id, status: 'accepted' as const };

      const [rows, total] = await Promise.all([
        fastify.prisma.follow.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take,
          skip: (page - 1) * take,
          include: {
            follower: { select: { id: true, name: true, handle: true, avatarEmoji: true, treesPlantedCount: true } },
          },
        }),
        fastify.prisma.follow.count({ where }),
      ]);

      reply.send({ total, followers: rows.map((f) => f.follower) });
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/follow',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      reply.send(await nurseryFollowService.followNursery(fastify.prisma, request.user!.id, request.params.id));
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id/follow',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      reply.send(await nurseryFollowService.unfollowNursery(fastify.prisma, request.user!.id, request.params.id));
    },
  );
}
