import { FastifyInstance } from 'fastify';
import * as bulkRequirementService from '../services/bulkRequirement.service';
import { respondToBulkRequirementSchema } from '../schemas/bulkRequirement.schema';
import { BadRequestError } from '../utils/errors';
import { invalidateNurseryCacheOnWrite } from '../utils/nurseryCacheHook';

// Nursery side of section 10 — see ngoBulkRequirements.routes.ts for the NGO side.
export default async function nurseryBulkRequirementsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('nursery'));
  invalidateNurseryCacheOnWrite(fastify);

  fastify.get<{ Querystring: bulkRequirementService.NurseryRequirementQuery }>('/', async (request, reply) => {
    reply.send(await bulkRequirementService.listRelevantForNursery(fastify.prisma, request.user!.id, request.query));
  });

  fastify.get<{ Querystring: { cursor?: string; take?: string } }>('/responses/mine', async (request, reply) => {
    reply.send(await bulkRequirementService.listMyResponses(fastify.prisma, request.user!.id, request.query));
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    reply.send(await bulkRequirementService.getRequirementForNursery(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.post<{ Params: { id: string } }>('/:id/respond', async (request, reply) => {
    const parsed = respondToBulkRequirementSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    reply.send(await bulkRequirementService.respondToRequirement(fastify.prisma, request.user!.id, request.params.id, parsed.data));
  });

  fastify.post<{ Params: { id: string } }>('/responses/:id/withdraw', async (request, reply) => {
    reply.send(await bulkRequirementService.withdrawResponse(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.post<{ Params: { id: string } }>('/responses/:id/handoff', async (request, reply) => {
    reply.send(await bulkRequirementService.markResponseHandedOff(fastify.prisma, request.user!.id, request.params.id));
  });
}
