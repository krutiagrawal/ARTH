import { FastifyInstance } from 'fastify';
import * as addressService from '../services/address.service';
import { upsertAddressSchema } from '../schemas/marketplace.schema';
import { BadRequestError } from '../utils/errors';

export default async function addressesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    reply.send(await addressService.listAddresses(fastify.prisma, request.user!.id));
  });

  fastify.post('/', async (request, reply) => {
    const parsed = upsertAddressSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const address = await addressService.createAddress(fastify.prisma, request.user!.id, parsed.data);
    reply.status(201).send(address);
  });

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = upsertAddressSchema.partial().safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const address = await addressService.updateAddress(fastify.prisma, request.user!.id, request.params.id, parsed.data);
    reply.send(address);
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await addressService.deleteAddress(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });
}
