import { FastifyInstance } from 'fastify';
import { ORG_ROLES } from '../constants/roles';
import * as plantedTreeService from '../services/plantedTree.service';
import { savePlantedTreePhoto, saveHealthCheckPhoto } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import {
  bulkCreatePlantedTreesSchema,
  listQuerySchema,
  singleHealthCheckSchema,
  bulkHealthCheckSchema,
  survivalStatsQuerySchema,
} from '../schemas/plantedTrees.schema';
import { BadRequestError } from '../utils/errors';

function serializeTree(t: any) {
  return {
    id: t.id,
    ngoId: t.ngoId,
    driveId: t.driveId,
    driveTitle: t.drive?.title ?? null,
    speciesName: t.speciesName,
    label: t.label,
    plantedAt: t.plantedAt,
    locationLabel: t.locationLabel,
    lat: t.lat != null ? Number(t.lat) : null,
    lng: t.lng != null ? Number(t.lng) : null,
    photoUrl: t.photoUrl,
    latestStatus: t.latestStatus,
  };
}

export default async function plantedTreesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole(...ORG_ROLES));

  fastify.get('/', async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const { total, trees } = await plantedTreeService.listOwnPlantedTrees(fastify.prisma, request.user!.id, parsed.data);
    reply.send({ total, trees: trees.map(serializeTree) });
  });

  fastify.get('/survival-stats', async (request, reply) => {
    const parsed = survivalStatsQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const stats = await plantedTreeService.getSurvivalStats(fastify.prisma, request.user!.id, parsed.data);
    reply.send(stats);
  });

  fastify.post('/bulk', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any)
      : { fields: (request.body ?? {}) as Record<string, unknown>, file: undefined };

    const parsed = bulkCreatePlantedTreesSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    // Photo, if provided, is shared across the whole logged batch (a representative
    // photo of the planting), stored identically on every row created.
    let photoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      photoUrl = await savePlantedTreePhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const result = await plantedTreeService.bulkCreatePlantedTrees(fastify.prisma, request.user!.id, {
      ...parsed.data,
      photoUrl,
    });
    reply.status(201).send(result);
  });

  fastify.post<{ Params: { id: string } }>('/:id/health-checks', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any)
      : { fields: (request.body ?? {}) as Record<string, unknown>, file: undefined };

    const parsed = singleHealthCheckSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let photoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      photoUrl = await saveHealthCheckPhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const check = await plantedTreeService.logHealthCheck(fastify.prisma, request.user!.id, request.params.id, {
      ...parsed.data,
      photoUrl,
    });
    reply.status(201).send(check);
  });

  fastify.post('/health-checks/bulk', async (request, reply) => {
    const parsed = bulkHealthCheckSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const result = await plantedTreeService.logBulkHealthChecks(fastify.prisma, request.user!.id, parsed.data);
    reply.send(result);
  });
}
