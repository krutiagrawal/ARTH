import { FastifyInstance } from 'fastify';
import { ORG_ROLES } from '../constants/roles';
import * as ngoUpdateService from '../services/ngoUpdate.service';
import { saveUpdatePhoto } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import { createUpdateSchema, paginationQuerySchema } from '../schemas/ngoUpdates.schema';
import { BadRequestError } from '../utils/errors';

/**
 * Legacy endpoint kept for apps/web's NGO dashboard "Updates" page.
 *
 * NGO updates are ordinary NGO-authored Posts now; the service layer returns them already
 * serialized with the original key names (`photoUrl`, `ngoName`, ...) plus the new ones
 * (`media`, `likeCount`). New clients should use /api/posts and /api/social/feed instead.
 */
export default async function ngoUpdatesRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole(...ORG_ROLES));

  fastify.get('/', async (request, reply) => {
    const parsed = paginationQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    reply.send(await ngoUpdateService.listOwnUpdates(fastify.prisma, request.user!.id, parsed.data));
  });

  fastify.post('/', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any)
      : { fields: (request.body ?? {}) as Record<string, unknown>, file: undefined };

    const parsed = createUpdateSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let photoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      photoUrl = await saveUpdatePhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const update = await ngoUpdateService.createUpdate(fastify.prisma, request.user!.id, { ...parsed.data, photoUrl });
    reply.status(201).send(update);
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await ngoUpdateService.deleteUpdate(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });
}
