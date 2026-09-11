import { FastifyInstance } from 'fastify';
import * as bulkRequirementService from '../services/bulkRequirement.service';
import { createBulkRequirementSchema } from '../schemas/bulkRequirement.schema';
import { BadRequestError } from '../utils/errors';

// NGO side of section 10 (NGO<->Nursery bulk requirements). Nursery side lives in
// nurseryBulkRequirements.routes.ts — kept as two role-gated files rather than one, mirroring
// how nursery.routes.ts/ngo.routes.ts are each entirely gated by a single requireRole hook.
export default async function ngoBulkRequirementsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('ngo'));

  fastify.get<{ Querystring: { status?: string } }>('/', async (request, reply) => {
    reply.send(await bulkRequirementService.listMyRequirements(fastify.prisma, request.user!.id, request.query.status));
  });

  fastify.post('/', async (request, reply) => {
    const parsed = createBulkRequirementSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const requirement = await bulkRequirementService.createRequirement(fastify.prisma, request.user!.id, parsed.data);
    reply.status(201).send(requirement);
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    reply.send(await bulkRequirementService.getMyRequirement(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.post<{ Params: { id: string } }>('/:id/cancel', async (request, reply) => {
    reply.send(await bulkRequirementService.cancelRequirement(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.post<{ Params: { id: string } }>('/responses/:id/accept', async (request, reply) => {
    reply.send(await bulkRequirementService.acceptResponse(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.post<{ Params: { id: string } }>('/responses/:id/decline', async (request, reply) => {
    reply.send(await bulkRequirementService.declineResponse(fastify.prisma, request.user!.id, request.params.id));
  });
}
