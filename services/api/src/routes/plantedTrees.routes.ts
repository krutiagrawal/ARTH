import { FastifyInstance } from 'fastify';
import { ORG_ROLES } from '../constants/roles';
import * as plantedTreeService from '../services/plantedTree.service';
import * as plantationZoneService from '../services/plantationZone.service';
import { savePlantedTreePhoto, saveHealthCheckPhoto } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import {
  bulkCreatePlantedTreesSchema,
  listQuerySchema,
  singleHealthCheckSchema,
  bulkHealthCheckSchema,
  survivalStatsQuerySchema,
  createZoneSchema,
  renameZoneSchema,
  listZonesQuerySchema,
  zoneBulkHealthCheckSchema,
} from '../schemas/plantedTrees.schema';
import { BadRequestError } from '../utils/errors';

function serializeTree(t: any) {
  return {
    id: t.id,
    ngoId: t.ngoId,
    driveId: t.driveId,
    driveTitle: t.drive?.title ?? null,
    zoneId: t.zoneId,
    zoneName: t.zone?.name ?? null,
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

    const { zoneId, ...rest } = parsed.data;
    const { total, trees } = await plantedTreeService.listOwnPlantedTrees(fastify.prisma, request.user!.id, {
      ...rest,
      zoneId: zoneId === 'unzoned' ? null : zoneId,
    });
    reply.send({ total, trees: trees.map(serializeTree) });
  });

  fastify.get('/survival-stats', async (request, reply) => {
    const parsed = survivalStatsQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const stats = await plantedTreeService.getSurvivalStats(fastify.prisma, request.user!.id, parsed.data);
    reply.send(stats);
  });

  fastify.get('/plantations', async (request, reply) => {
    const plantations = await plantationZoneService.getPlantationsOverview(fastify.prisma, request.user!.id);
    reply.send({ plantations });
  });

  fastify.get('/zones', async (request, reply) => {
    const parsed = listZonesQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const result = await plantationZoneService.listZonesForDrive(fastify.prisma, request.user!.id, parsed.data.driveId);
    reply.send(result);
  });

  fastify.post('/zones', async (request, reply) => {
    const parsed = createZoneSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const zone = await plantationZoneService.createZone(fastify.prisma, request.user!.id, parsed.data);
    reply.status(201).send(zone);
  });

  fastify.patch<{ Params: { id: string } }>('/zones/:id', async (request, reply) => {
    const parsed = renameZoneSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const zone = await plantationZoneService.renameZone(fastify.prisma, request.user!.id, request.params.id, parsed.data.name);
    reply.send(zone);
  });

  fastify.delete<{ Params: { id: string } }>('/zones/:id', async (request, reply) => {
    await plantationZoneService.deleteZone(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });

  fastify.get<{ Params: { id: string } }>('/zones/:id', async (request, reply) => {
    const zone = await plantationZoneService.getZoneDetail(fastify.prisma, request.user!.id, request.params.id);
    reply.send(zone);
  });

  fastify.post<{ Params: { id: string } }>('/zones/:id/health-checks/bulk', async (request, reply) => {
    const parsed = zoneBulkHealthCheckSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const result = await plantationZoneService.bulkMarkZoneHealth(
      fastify.prisma,
      request.user!.id,
      request.params.id,
      parsed.data.status,
      parsed.data.notes,
    );
    reply.send(result);
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

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const tree = await plantedTreeService.getPlantedTreeDetail(fastify.prisma, request.user!.id, request.params.id);
    reply.send(serializeTree(tree));
  });

  fastify.get<{ Params: { id: string } }>('/:id/health-checks', async (request, reply) => {
    const checks = await plantedTreeService.listHealthChecksForTree(fastify.prisma, request.user!.id, request.params.id);
    reply.send({ checks });
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
