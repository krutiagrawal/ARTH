import { FastifyInstance } from 'fastify';
import * as bulkRequirementService from '../services/bulkRequirement.service';
import { respondToBulkRequirementSchema } from '../schemas/bulkRequirement.schema';
import { BadRequestError } from '../utils/errors';

// Nursery side of section 10 — see ngoBulkRequirements.routes.ts for the NGO side.
export default async function nurseryBulkRequirementsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('nursery'));

  fastify.get<{ Querystring: { status?: string } }>('/', async (request, reply) => {
    reply.send(await bulkRequirementService.listRelevantForNursery(fastify.prisma, request.user!.id, { status: request.query.status }));
  });

  fastify.post<{ Params: { id: string } }>('/:id/respond', async (request, reply) => {
    const parsed = respondToBulkRequirementSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    reply.send(await bulkRequirementService.respondToRequirement(fastify.prisma, request.user!.id, request.params.id, parsed.data));
  });

  fastify.post<{ Params: { id: string } }>('/responses/:id/withdraw', async (request, reply) => {
    reply.send(await bulkRequirementService.withdrawResponse(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.post<{ Params: { id: string } }>('/responses/:id/fulfilled', async (request, reply) => {
    reply.send(await bulkRequirementService.markResponseFulfilled(fastify.prisma, request.user!.id, request.params.id));
  });
}
