import { FastifyInstance } from 'fastify';
import * as wishlistService from '../services/wishlist.service';
import { addWishlistItemSchema } from '../schemas/marketplace.schema';
import { BadRequestError } from '../utils/errors';

export default async function wishlistRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    reply.send(await wishlistService.listWishlist(fastify.prisma, request.user!.id));
  });

  fastify.post('/', async (request, reply) => {
    const parsed = addWishlistItemSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    reply.status(201).send(await wishlistService.addWishlistItem(fastify.prisma, request.user!.id, parsed.data));
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await wishlistService.removeWishlistItem(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });
}
