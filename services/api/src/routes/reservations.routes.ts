import { FastifyInstance } from 'fastify';
import * as reservationService from '../services/reservation.service';

function serializeReservation(r: any) {
  return {
    id: r.id,
    quantity: r.quantity,
    status: r.status,
    message: r.message,
    createdAt: r.createdAt,
    respondedAt: r.respondedAt,
    species: r.stock?.species,
    nursery: r.nursery ? { id: r.nursery.id, nurseryName: r.nursery.nurseryName, logoUrl: r.nursery.logoUrl } : undefined,
  };
}

export default async function reservationsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.authenticate);

  fastify.get('/', async (request, reply) => {
    const rows = await reservationService.listMyReservations(fastify.prisma, request.user!.id);
    reply.send(rows.map(serializeReservation));
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await reservationService.cancelReservation(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });
}
