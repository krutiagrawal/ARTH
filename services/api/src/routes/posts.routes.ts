import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import * as postService from '../services/post.service';
import { MAX_MEDIA_PER_POST, serializePost } from '../services/post.service';
import { savePostMedia } from '../services/upload.service';
import { splitMultipartFiles } from '../utils/multipart';
import { BadRequestError } from '../utils/errors';

const createPostSchema = z.object({
  caption: z.string().max(2000).optional(),
  driveId: z.string().uuid().optional(),
  treeId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  // Multipart fields arrive as strings, so the flag is compared as one.
  asNgo: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
  asNursery: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
});

const cursorQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
});

function isTrue(v: unknown) {
  return v === true || v === 'true';
}

export default async function postsRoutes(fastify: FastifyInstance) {
  /**
   * Create a post. Multipart with up to 6 files under `photos`, or plain JSON for a text-only
   * post. `asNgo=true` publishes as the caller's approved NGO.
   */
  fastify.post('/', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, files } = isMultipart
      ? splitMultipartFiles(request.body as any, 'photos')
      : { fields: (request.body ?? {}) as Record<string, unknown>, files: [] };

    const parsed = createPostSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    // Checked before any file is written so an over-sized post doesn't leave orphans on disk.
    if (files.length > MAX_MEDIA_PER_POST) {
      throw new BadRequestError(`A post can have at most ${MAX_MEDIA_PER_POST} photos`);
    }

    const mediaUrls: string[] = [];
    for (const file of files) {
      const buffer = await file.toBuffer();
      mediaUrls.push(await savePostMedia({ filename: file.filename, mimetype: file.mimetype, buffer }));
    }

    const post = await postService.createPost(fastify.prisma, request.user!.id, {
      caption: parsed.data.caption,
      driveId: parsed.data.driveId,
      treeId: parsed.data.treeId,
      groupId: parsed.data.groupId,
      asNgo: isTrue(parsed.data.asNgo),
      asNursery: isTrue(parsed.data.asNursery),
      mediaUrls,
    });

    reply.status(201).send(serializePost(post as any, request.user!.id));
  });

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const post = await postService.getPost(fastify.prisma, request.user!.id, request.params.id);
    reply.send(serializePost(post as any, request.user!.id));
  });

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const parsed = z
      .object({ caption: z.string().max(2000).nullable() })
      .safeParse(request.body ?? {});
    if (!parsed.success) throw new BadRequestError('Invalid input');

    const post = await postService.updatePostCaption(
      fastify.prisma,
      request.user!.id,
      request.params.id,
      parsed.data.caption,
    );
    reply.send(serializePost(post as any, request.user!.id));
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await postService.deletePost(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });

  fastify.post<{ Params: { id: string } }>('/:id/like', async (request, reply) => {
    reply.send(await postService.likePost(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.delete<{ Params: { id: string } }>('/:id/like', async (request, reply) => {
    reply.send(await postService.unlikePost(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.get<{ Params: { id: string } }>('/:id/likes', async (request, reply) => {
    const parsed = cursorQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');
    reply.send(await postService.listLikers(fastify.prisma, request.params.id, parsed.data));
  });

  fastify.post<{ Params: { id: string } }>('/:id/save', async (request, reply) => {
    await postService.savePost(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });

  fastify.delete<{ Params: { id: string } }>('/:id/save', async (request, reply) => {
    await postService.unsavePost(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });
}
