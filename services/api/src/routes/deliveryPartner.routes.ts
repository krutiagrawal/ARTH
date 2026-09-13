import { FastifyInstance } from 'fastify';
import * as deliveryPartnerService from '../services/deliveryPartner.service';
import * as orderService from '../services/order.service';
import { reportLocationSchema, deliverWithCodeSchema } from '../schemas/deliveryPartner.schema';
import { BadRequestError } from '../utils/errors';

// The delivery partner's own mobile-app-only endpoints — a deliberately small surface (queue,
// location reporting, marking delivered). See nurseryDeliveryPartners.routes.ts for the nursery
// side (create/manage the roster, dispatch to a partner).
export default async function deliveryPartnerRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('delivery_partner'));

  fastify.get('/profile', async (request, reply) => {
    reply.send(await deliveryPartnerService.getOwnProfile(fastify.prisma, request.user!.id));
  });

  fastify.get('/queue', async (request, reply) => {
    reply.send(await deliveryPartnerService.listMyQueue(fastify.prisma, request.user!.id));
  });

  fastify.post('/location', async (request, reply) => {
    const parsed = reportLocationSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    reply.send(await deliveryPartnerService.reportLocation(fastify.prisma, request.user!.id, parsed.data));
  });

  fastify.post<{ Params: { id: string } }>('/orders/:id/deliver', async (request, reply) => {
    const parsed = deliverWithCodeSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    reply.send(await orderService.markOrderDeliveredByPartner(fastify.prisma, request.user!.id, request.params.id, parsed.data.code));
  });
}
