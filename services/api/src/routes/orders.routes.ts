import { FastifyInstance } from 'fastify';
import * as orderService from '../services/order.service';
import { checkoutSchema, submitOrderReviewSchema } from '../schemas/marketplace.schema';
import { BadRequestError } from '../utils/errors';

export default async function ordersRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    reply.send(await orderService.listMyOrders(fastify.prisma, request.user!.id));
  });

  fastify.post('/checkout', async (request, reply) => {
    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const result = await orderService.checkout(fastify.prisma, request.user!.id, parsed.data);
    reply.status(201).send(result);
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    reply.send(await orderService.getMyOrder(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.post<{ Params: { id: string } }>('/:id/cancel', async (request, reply) => {
    reply.send(await orderService.cancelMyOrder(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.post<{ Params: { id: string } }>('/:id/review', async (request, reply) => {
    const parsed = submitOrderReviewSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    reply.status(201).send(await orderService.submitOrderReview(fastify.prisma, request.user!.id, request.params.id, parsed.data));
  });
}
