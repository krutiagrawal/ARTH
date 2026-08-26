import { FastifyInstance } from 'fastify';
import * as competitionService from '../services/competition.service';

export default async function competitionsPublicRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    reply.send(await competitionService.listCompetitions(fastify.prisma));
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const competition = await competitionService.getCompetition(fastify.prisma, request.params.id);
    if (!competition) return reply.status(404).send({ error: 'NOT_FOUND', message: 'Competition not found' });
    reply.send(competition);
  });

  fastify.get<{ Params: { id: string } }>('/:id/entries', async (request, reply) => {
    reply.send(await competitionService.listEntries(fastify.prisma, request.params.id));
  });
}
