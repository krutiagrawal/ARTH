import { toCsv } from '../utils/csv';
import { FastifyInstance } from 'fastify';
import { ORG_ROLES } from '../constants/roles';
import {
  createAdoptableTreeSchema,
  updateAdoptableTreeSchema,
  adoptSchema,
  nearbyQuerySchema,
  ownedListQuerySchema,
  releaseAdoptionSchema,
} from '../schemas/adoptions.schema';
import { saveAdoptableTreePhoto, saveHealthCheckPhoto } from '../services/upload.service';
import { logOwnObservationSchema } from '../schemas/trees.schema';
import { logAdopterObservation } from '../services/treeObservation.service';
import { splitMultipartBody } from '../utils/multipart';
import * as adoptionService from '../services/adoption.service';
import { BadRequestError } from '../utils/errors';

// `includeAdopter` is only ever set for the NGO-only /mine listing — the
// public endpoints (list/detail/adopt) must never leak the adopter's
// identity to anonymous callers, only the NGO that owns the tree gets to
// see who adopted it (name + handle only, never email — see the supporter
// PII rule this dashboard redesign follows throughout).
export function serializeAdoptableTree(
  entry: any,
  opts: { includeAdopter?: boolean; health?: adoptionService.TreeHealthSummary } = {},
) {
  const t = entry.tree ?? entry;
  return {
    id: t.id,
    ngoId: t.ngoId,
    ngoName: t.ngo?.orgName,
    nickname: t.nickname,
    speciesName: t.speciesName,
    description: t.description,
    instructions: t.instructions,
    photoUri: t.photoUrl,
    location: t.locationLabel,
    city: t.city,
    lat: t.lat != null ? Number(t.lat) : null,
    lng: t.lng != null ? Number(t.lng) : null,
    status: t.status,
    isAdopted: t.status === 'adopted',
    isArchived: !!t.archivedAt,
    distanceKm: entry.distanceKm,
    createdAt: t.createdAt,
    // Set when the NGO created this listing from a real planted tree: what status and check-ins hang off.
    plantedTreeId: t.plantedTreeId ?? null,
    ...(opts.health
      ? {
          healthStatus: opts.health.healthStatus,
          lastCheckedAt: opts.health.lastCheckedAt,
          pendingUpdatesCount: opts.health.pendingUpdatesCount,
        }
      : {}),
    ...(opts.includeAdopter && t.adoption
      ? { adopter: { name: t.adoption.user.name, handle: t.adoption.user.handle, message: t.adoption.message, adoptedAt: t.adoption.createdAt } }
      : {}),
  };
}

export default async function adoptionsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const parsed = nearbyQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const results = await adoptionService.listAdoptableTrees(fastify.prisma, parsed.data);
    const health = await adoptionService.getHealthSummaries(fastify.prisma, results.map((r) => r.tree));
    reply.send(results.map((t) => serializeAdoptableTree(t, { health: health.get(t.tree.id) })));
  });

  fastify.get('/mine', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    const parsed = ownedListQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const trees = await adoptionService.listOwnedAdoptableTrees(fastify.prisma, request.user!.id, parsed.data);
    reply.send(trees.map((t) => serializeAdoptableTree(t, { includeAdopter: true })));
  });

  fastify.get('/mine/summary', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    reply.send(await adoptionService.getOwnedTreeSummary(fastify.prisma, request.user!.id));
  });

  // CSV rows as JSON ({ csv }) so the app can hand the text straight to the share sheet.
  fastify.get('/mine/export', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    const rows = await adoptionService.exportOwnedTrees(fastify.prisma, request.user!.id);
    reply.send({ csv: toCsv(rows), count: rows.length });
  });

  fastify.post<{ Params: { id: string } }>(
    '/:id/duplicate',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      reply.status(201).send(serializeAdoptableTree(await adoptionService.duplicateAdoptableTree(fastify.prisma, request.user!.id, request.params.id)));
    },
  );

  fastify.post<{ Params: { id: string }; Body: { archived?: boolean } }>(
    '/:id/archive',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const archived = request.body?.archived !== false;
      reply.send(serializeAdoptableTree(await adoptionService.setAdoptableTreeArchived(fastify.prisma, request.user!.id, request.params.id, archived)));
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const tree = await adoptionService.getAdoptableTree(fastify.prisma, request.params.id);
    const health = await adoptionService.getHealthSummaries(fastify.prisma, [tree]);
    reply.send(serializeAdoptableTree(tree, { health: health.get(tree.id) }));
  });

  fastify.get('/my-adoptions/summary', async (request, reply) => {
    reply.send(await adoptionService.getMyAdoptionsSummary(fastify.prisma, request.user!.id));
  });

  fastify.get('/my-adoptions/export', async (request, reply) => {
    const rows = await adoptionService.exportMyAdoptions(fastify.prisma, request.user!.id);
    reply.send({ csv: toCsv(rows), count: rows.length });
  });

  fastify.get<{ Querystring: { cursor?: string; take?: string; q?: string; sort?: string } }>('/my-adoptions', async (request, reply) => {
    const { q, sort, ...paging } = request.query;
    const page = await adoptionService.listMyAdoptedTrees(fastify.prisma, request.user!.id, {
      ...paging,
      search: q?.trim() || undefined,
      sort: sort as any,
    });
    const health = await adoptionService.getHealthSummaries(fastify.prisma, page.items, {
      countPendingForUserId: request.user!.id,
    });
    reply.send({
      items: page.items.map((t) => serializeAdoptableTree(t, { includeAdopter: true, health: health.get(t.id) })),
      nextCursor: page.nextCursor,
    });
  });

  // Status timeline for a listing, and (for its adopter only) the community updates awaiting a decision.
  fastify.get<{ Params: { id: string } }>('/:id/status', async (request, reply) => {
    reply.send(await adoptionService.getAdoptionStatus(fastify.prisma, request.params.id, request.user?.id));
  });

  // The adopter's own check-in on the tree they adopted. Live photo required, same as an
  // individual owner's self-check-in. Works for every listing, linked to a planted tree or not.
  fastify.post<{ Params: { id: string } }>('/:id/check-in', async (request, reply) => {
    const { fields, file } = splitMultipartBody(request.body as any);
    const parsed = logOwnObservationSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');
    if (!file) throw new BadRequestError('A photo is required to update tree health.');

    const buffer = await file.toBuffer();
    const photoUrl = await saveHealthCheckPhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
    const observation = await logAdopterObservation(fastify.prisma, request.user!.id, request.params.id, {
      ...parsed.data,
      photoUrl,
    });
    reply.status(201).send(observation);
  });

  fastify.post('/', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    const { fields, file } = splitMultipartBody(request.body as any);

    const parsed = createAdoptableTreeSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let photoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      photoUrl = await saveAdoptableTreePhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const tree = await adoptionService.createAdoptableTree(fastify.prisma, request.user!.id, {
      ...parsed.data,
      photoUrl,
    });
    reply.status(201).send(serializeAdoptableTree(tree));
  });

  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
      const { fields, file } = isMultipart
        ? splitMultipartBody(request.body as any)
        : { fields: (request.body ?? {}) as Record<string, unknown>, file: undefined };

      const parsed = updateAdoptableTreeSchema.safeParse(fields);
      if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

      let photoUrl: string | undefined;
      if (file) {
        const buffer = await file.toBuffer();
        photoUrl = await saveAdoptableTreePhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
      }

      const tree = await adoptionService.updateAdoptableTree(fastify.prisma, request.user!.id, request.params.id, {
        ...parsed.data,
        ...(photoUrl ? { photoUrl } : {}),
      });
      reply.send(serializeAdoptableTree(tree));
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const tree = await adoptionService.removeAdoptableTree(fastify.prisma, request.user!.id, request.params.id);
      reply.send(serializeAdoptableTree(tree));
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/relist',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const tree = await adoptionService.relistAdoptableTree(fastify.prisma, request.user!.id, request.params.id);
      reply.send(serializeAdoptableTree(tree));
    },
  );

  // Hard delete – only succeeds while nothing real depends on it (see the service for the rules).
  fastify.delete<{ Params: { id: string } }>(
    '/:id/permanent',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      reply.send(await adoptionService.deleteAdoptableTree(fastify.prisma, request.user!.id, request.params.id));
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/release',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const parsed = releaseAdoptionSchema.safeParse(request.body ?? {});
      if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

      const tree = await adoptionService.releaseAdoption(fastify.prisma, request.user!.id, request.params.id);
      reply.send(serializeAdoptableTree(tree));
    },
  );

  fastify.post<{ Params: { id: string } }>('/:id/adopt', async (request, reply) => {
    const parsed = adoptSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const adoption = await adoptionService.adoptTree(
      fastify.prisma,
      request.user!.id,
      request.params.id,
      parsed.data.message,
    );
    reply.status(201).send(serializeAdoptableTree(adoption.adoptableTree));
  });

  fastify.delete<{ Params: { id: string } }>('/:id/adopt', async (request, reply) => {
    const tree = await adoptionService.releaseAdoptionByUser(fastify.prisma, request.user!.id, request.params.id);
    reply.send(serializeAdoptableTree(tree));
  });

  // Same release, with the adopter's optional reason (DELETE has no reliable body).
  fastify.post<{ Params: { id: string } }>('/:id/adopt/release', async (request, reply) => {
    const parsed = releaseAdoptionSchema.safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');
    const tree = await adoptionService.releaseAdoptionByUser(fastify.prisma, request.user!.id, request.params.id, parsed.data.reason);
    reply.send(serializeAdoptableTree(tree));
  });
}
