import { FastifyInstance } from 'fastify';
import { createEntrySchema } from '../schemas/competitions.schema';
import * as competitionService from '../services/competition.service';
import { BadRequestError } from '../utils/errors';

export default async function competitionsRoutes(fastify: FastifyInstance) {
  fastify.post<{ Params: { id: string } }>('/:id/entries', async (request, reply) => {
    const parsed = createEntrySchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const entry = await competitionService.submitEntry(fastify.prisma, request.params.id, request.user!.id, parsed.data);
    reply.status(201).send(entry);
  });

  fastify.post<{ Params: { entryId: string } }>('/entries/:entryId/vote', async (request, reply) => {
    const entry = await competitionService.voteForEntry(fastify.prisma, request.params.entryId, request.user!.id);
    reply.status(201).send(entry);
  });
}
