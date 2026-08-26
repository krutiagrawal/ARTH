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
import { saveAdoptableTreePhoto } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import * as adoptionService from '../services/adoption.service';
import { BadRequestError } from '../utils/errors';

// `includeAdopter` is only ever set for the NGO-only /mine listing — the
// public endpoints (list/detail/adopt) must never leak the adopter's
// identity to anonymous callers, only the NGO that owns the tree gets to
// see who adopted it (name + handle only, never email — see the supporter
// PII rule this dashboard redesign follows throughout).
function serializeAdoptableTree(entry: any, opts: { includeAdopter?: boolean } = {}) {
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
    distanceKm: entry.distanceKm,
    createdAt: t.createdAt,
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
    reply.send(results.map((t) => serializeAdoptableTree(t)));
  });

  fastify.get('/mine', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    const parsed = ownedListQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const trees = await adoptionService.listOwnedAdoptableTrees(fastify.prisma, request.user!.id, parsed.data);
    reply.send(trees.map((t) => serializeAdoptableTree(t, { includeAdopter: true })));
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const tree = await adoptionService.getAdoptableTree(fastify.prisma, request.params.id);
    reply.send(serializeAdoptableTree(tree));
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
}
