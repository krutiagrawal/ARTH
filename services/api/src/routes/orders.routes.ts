import { toCsv } from '../utils/csv';
import { FastifyInstance } from 'fastify';
import * as orderService from '../services/order.service';
import { checkoutSchema, submitOrderReviewSchema } from '../schemas/marketplace.schema';
import { BadRequestError } from '../utils/errors';

export default async function ordersRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { cursor?: string; take?: string; q?: string; group?: string; sort?: string } }>('/', async (request, reply) => {
    const { q, group, sort, ...paging } = request.query;
    reply.send(
      await orderService.listMyOrders(fastify.prisma, request.user!.id, {
        ...paging,
        search: q?.trim() || undefined,
        group: group as any,
        sort: sort as any,
      }),
    );
  });

  fastify.get('/summary', async (request, reply) => {
    reply.send(await orderService.getMyOrdersSummary(fastify.prisma, request.user!.id));
  });

  fastify.get('/export', async (request, reply) => {
    const rows = await orderService.exportMyOrders(fastify.prisma, request.user!.id);
    reply.send({ csv: toCsv(rows), count: rows.length });
  });

  fastify.post('/checkout', async (request, reply) => {
    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const result = await orderService.checkout(fastify.prisma, request.user!.id, parsed.data);
    reply.status(201).send(result);
  });

  fastify.get<{ Querystring: { cursor?: string; take?: string } }>('/reviews/mine', async (request, reply) => {
    reply.send(await orderService.listMyReviews(fastify.prisma, request.user!.id, request.query));
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
