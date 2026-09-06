import { FastifyInstance } from 'fastify';
import * as nurseryPublicService from '../services/nurseryPublic.service';
import * as reservationService from '../services/reservation.service';
import { createReservationSchema, nurseryBrowseQuerySchema } from '../schemas/nursery.schema';
import * as nurseryFollowService from '../services/nurseryFollow.service';
import { BadRequestError } from '../utils/errors';

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

  fastify.get<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.optionalAuthenticate] },
    async (request, reply) => {
      reply.send(await nurseryPublicService.getPublicNurseryProfile(fastify.prisma, request.params.id, request.user?.id));
    },
  );

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
