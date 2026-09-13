import { FastifyInstance } from 'fastify';
import * as deliveryPartnerService from '../services/deliveryPartner.service';
import { createDeliveryPartnerSchema, updateDeliveryPartnerSchema } from '../schemas/deliveryPartner.schema';
import { BadRequestError } from '../utils/errors';

function isTrue(v: unknown) {
  return v === true || v === 'true';
}

// Nursery side of the delivery-partner feature — create/list/update/deactivate the nursery's own
// roster of rider sub-accounts. See deliveryPartner.routes.ts for the partner's own mobile app.
export default async function nurseryDeliveryPartnersRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('nursery'));

  fastify.get('/', async (request, reply) => {
    reply.send(await deliveryPartnerService.listDeliveryPartners(fastify.prisma, request.user!.id));
  });

  fastify.post('/', async (request, reply) => {
    const parsed = createDeliveryPartnerSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const partner = await deliveryPartnerService.createDeliveryPartner(fastify.prisma, request.user!.id, parsed.data);
    reply.status(201).send(partner);
  });

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = updateDeliveryPartnerSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const partner = await deliveryPartnerService.updateDeliveryPartner(fastify.prisma, request.user!.id, request.params.id, {
      ...parsed.data,
      isActive: parsed.data.isActive !== undefined ? isTrue(parsed.data.isActive) : undefined,
    });
    reply.send(partner);
  });

  fastify.post<{ Params: { id: string } }>('/:id/deactivate', async (request, reply) => {
    reply.send(await deliveryPartnerService.deactivateDeliveryPartner(fastify.prisma, request.user!.id, request.params.id));
  });
}
