import { FastifyInstance } from 'fastify';
import { createPlacementSchema, updatePlacementSchema } from '../schemas/decorations.schema';
import { BadRequestError, NotFoundError } from '../utils/errors';

export default async function decorationsRoutes(fastify: FastifyInstance) {
  fastify.get('/types', async (_request, reply) => {
    const types = await fastify.prisma.decorationType.findMany({
      orderBy: [{ zone: 'asc' }, { sortOrder: 'asc' }],
    });
    reply.send(types);
  });

  fastify.get('/placements', async (request, reply) => {
    const placements = await fastify.prisma.decorationPlacement.findMany({
      where: { userId: request.user!.id },
      include: { decorationType: true },
      orderBy: { createdAt: 'asc' },
    });
    reply.send(placements);
  });

  fastify.post('/placements', async (request, reply) => {
    const parsed = createPlacementSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const decorationType = await fastify.prisma.decorationType.findUnique({
      where: { id: parsed.data.decorationTypeId },
    });
    if (!decorationType) throw new NotFoundError('Decoration type not found');

    const placement = await fastify.prisma.decorationPlacement.create({
      data: {
        userId: request.user!.id,
        decorationTypeId: parsed.data.decorationTypeId,
        positionX: parsed.data.positionX,
        positionY: parsed.data.positionY,
        scale: parsed.data.scale ?? 1,
        rotation: parsed.data.rotation ?? 0,
        path: parsed.data.path ?? undefined,
      },
      include: { decorationType: true },
    });

    reply.status(201).send(placement);
  });

  fastify.patch<{ Params: { id: string } }>('/placements/:id', async (request, reply) => {
    const parsed = updatePlacementSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const data: {
      positionX?: number;
      positionY?: number;
      scale?: number;
      rotation?: number;
    } = {};
    if (parsed.data.positionX !== undefined) data.positionX = parsed.data.positionX;
    if (parsed.data.positionY !== undefined) data.positionY = parsed.data.positionY;
    if (parsed.data.scale !== undefined) data.scale = parsed.data.scale;
    if (parsed.data.rotation !== undefined) data.rotation = parsed.data.rotation;

    const result = await fastify.prisma.decorationPlacement.updateMany({
      where: { id: request.params.id, userId: request.user!.id },
      data,
    });
    if (result.count === 0) throw new NotFoundError('Placement not found');

    const updated = await fastify.prisma.decorationPlacement.findUnique({
      where: { id: request.params.id },
      include: { decorationType: true },
    });
    reply.send(updated);
  });

  fastify.delete<{ Params: { id: string } }>('/placements/:id', async (request, reply) => {
    const result = await fastify.prisma.decorationPlacement.deleteMany({
      where: { id: request.params.id, userId: request.user!.id },
    });
    if (result.count === 0) throw new NotFoundError('Placement not found');
    reply.status(204).send();
  });
}
