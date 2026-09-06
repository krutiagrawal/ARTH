import { FastifyInstance } from 'fastify';
import * as cartService from '../services/cart.service';
import { addCartItemSchema, updateCartItemSchema } from '../schemas/marketplace.schema';
import { BadRequestError } from '../utils/errors';

export default async function cartRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    reply.send(await cartService.getMyCart(fastify.prisma, request.user!.id));
  });

  fastify.post('/items', async (request, reply) => {
    const parsed = addCartItemSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const item = await cartService.addCartItem(fastify.prisma, request.user!.id, parsed.data.stockId, parsed.data.quantity);
    reply.status(201).send(item);
  });

  fastify.patch<{ Params: { id: string } }>('/items/:id', async (request, reply) => {
    const parsed = updateCartItemSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    reply.send(await cartService.updateCartItem(fastify.prisma, request.user!.id, request.params.id, parsed.data.quantity));
  });

  fastify.delete<{ Params: { id: string } }>('/items/:id', async (request, reply) => {
    await cartService.removeCartItem(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });

  fastify.delete('/', async (request, reply) => {
    await cartService.clearCart(fastify.prisma, request.user!.id);
    reply.status(204).send();
  });
}
