import { FastifyInstance } from 'fastify';
import { createEntrySchema } from '../schemas/competitions.schema';
import * as competitionService from '../services/competition.service';
import { BadRequestError } from '../utils/errors';

export default async function competitionsRoutes(fastify: FastifyInstance) {
  fastify.get('/mine', async (request, reply) => {
    const [entries, votes] = await Promise.all([
      competitionService.listMyEntries(fastify.prisma, request.user!.id),
      competitionService.listMyVotes(fastify.prisma, request.user!.id),
    ]);

    reply.send({
      entries: entries.map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        imageUrl: e.imageUrl,
        votesCount: e.votesCount,
        createdAt: e.createdAt,
        competitionId: e.competitionId,
        competitionTitle: e.competition.title,
        competitionDeadline: e.competition.deadline,
      })),
      votes: votes.map((v) => ({
        id: v.id,
        entryId: v.entryId,
        entryTitle: v.entry.title,
        competitionId: v.entry.competitionId,
        competitionTitle: v.entry.competition.title,
        createdAt: v.createdAt,
      })),
    });
  });

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
