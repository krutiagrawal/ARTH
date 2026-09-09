import { FastifyInstance } from 'fastify';
import { saveStorySnapshot } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import * as storyService from '../services/story.service';
import { BadRequestError } from '../utils/errors';

export default async function storiesRoutes(fastify: FastifyInstance) {
  /**
   * Create a story. Two shapes, because two callers:
   *  - JSON `{ imageBase64, caption }` — the user forest snapshot, composited on-device by Skia
   *  - multipart `photo` — a camera/gallery photo, which is how NGOs/Groups post
   * `asNgo`/`asGroup` publish as the caller's NGO/Group instead of as themselves.
   */
  fastify.post('/', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');

    let buffer: Buffer;
    let filename = 'forest.jpg';
    let mimetype = 'image/jpeg';
    let caption: string | undefined;
    let asNgo = false;
    let asGroup = false;
    let asNursery = false;

    if (isMultipart) {
      const { fields, file } = splitMultipartBody(request.body as any);
      if (!file) throw new BadRequestError('Image is required');
      buffer = await file.toBuffer();
      filename = file.filename;
      mimetype = file.mimetype;
      caption = fields.caption?.trim();
      asNgo = fields.asNgo === 'true';
      asGroup = fields.asGroup === 'true';
      asNursery = fields.asNursery === 'true';
    } else {
      const body = (request.body ?? {}) as {
        imageBase64?: string;
        caption?: string;
        asNgo?: boolean;
        asGroup?: boolean;
        asNursery?: boolean;
      };
      const imageBase64 = body.imageBase64?.replace(/^data:image\/\w+;base64,/, '');
      if (!imageBase64) throw new BadRequestError('Image is required');

      try {
        buffer = Buffer.from(imageBase64, 'base64');
      } catch {
        throw new BadRequestError('Invalid image data');
      }
      if (buffer.length === 0) throw new BadRequestError('Invalid image data');

      caption = body.caption?.trim();
      asNgo = body.asNgo === true;
      asGroup = body.asGroup === true;
      asNursery = body.asNursery === true;
    }

    if (caption && caption.length > 280) throw new BadRequestError('Caption is too long');

    const imageUrl = await saveStorySnapshot({ filename, mimetype, buffer });
    const story = await storyService.createStory(fastify.prisma, request.user!.id, {
      imageUrl,
      caption,
      asNgo,
      asGroup,
      asNursery,
    });

    reply.status(201).send(storyService.serializeStory(story));
  });

  // Everything I've posted, newest first — no expiry filter, this is the permanent gallery.
  fastify.get('/me', async (request, reply) => {
    reply.send(await storyService.listOwnStories(fastify.prisma, request.user!.id));
  });

  // Active stories from friends and followed NGOs, grouped by author, unseen rings first.
  fastify.get('/feed', async (request, reply) => {
    reply.send(await storyService.getStoryFeed(fastify.prisma, request.user!.id));
  });

  // Batch seen/unseen ring lookup for avatars rendered outside the tray/feed (profile headers,
  // leaderboard rows, follower lists, ...). Comma-separated id lists, any subset may be omitted.
  fastify.get<{ Querystring: { userIds?: string; ngoIds?: string; nurseryIds?: string; groupIds?: string } }>(
    '/ring-status',
    async (request, reply) => {
      const split = (s?: string) => (s ? s.split(',').filter(Boolean) : []);
      reply.send(
        await storyService.getRingStatus(fastify.prisma, request.user!.id, {
          userIds: split(request.query.userIds),
          ngoIds: split(request.query.ngoIds),
          nurseryIds: split(request.query.nurseryIds),
          groupIds: split(request.query.groupIds),
        }),
      );
    },
  );

  fastify.post<{ Params: { id: string } }>('/:id/view', async (request, reply) => {
    await storyService.markStoryViewed(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await storyService.deleteStory(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });

  // Owner-only: who has viewed (and, per storyService, liked) this story.
  fastify.get<{ Params: { id: string } }>('/:id/viewers', async (request, reply) => {
    const viewers = await storyService.listStoryViewers(fastify.prisma, request.user!.id, request.params.id);
    reply.send(
      viewers.map((v) => ({
        userId: v.user.id,
        name: v.user.name,
        handle: v.user.handle,
        avatarEmoji: v.user.avatarEmoji,
        viewedAt: v.viewedAt,
        liked: v.liked,
      })),
    );
  });

  fastify.post<{ Params: { id: string } }>('/:id/like', async (request, reply) => {
    reply.send(await storyService.likeStory(fastify.prisma, request.user!.id, request.params.id));
  });

  fastify.delete<{ Params: { id: string } }>('/:id/like', async (request, reply) => {
    reply.send(await storyService.unlikeStory(fastify.prisma, request.user!.id, request.params.id));
  });
}
