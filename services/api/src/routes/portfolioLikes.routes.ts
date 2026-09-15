import { FastifyInstance } from 'fastify';
import * as portfolioService from '../services/portfolio.service';

/** Any signed-in user liking/unliking an NGO's "past work" entry. Deliberately separate from
 * portfolio.routes.ts, which is NGO-owner-only CRUD — mounted at /api/portfolio instead of
 * /api/ngo/portfolio so it isn't caught by that file's requireRole(ORG_ROLES) hook. */
export default async function portfolioLikesRoutes(fastify: FastifyInstance) {
  fastify.post<{ Params: { id: string } }>('/:id/like', async (request, reply) => {
    reply.send(await portfolioService.likePortfolioEntry(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.delete<{ Params: { id: string } }>('/:id/like', async (request, reply) => {
    reply.send(await portfolioService.unlikePortfolioEntry(fastify.prisma, request.user!.id, request.params.id));
  });
}
