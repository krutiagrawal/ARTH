import { FastifyInstance } from 'fastify';
import { saveStorySnapshot } from '../services/upload.service';
import { BadRequestError, NotFoundError } from '../utils/errors';

const STORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function serializeStory(story: any) {
  return {
    id: story.id,
    userId: story.userId,
    imageUrl: story.imageUrl,
    caption: story.caption,
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
  };
}

export default async function storiesRoutes(fastify: FastifyInstance) {
  // Create a story from a captured forest snapshot (JSON: base64 JPEG + optional caption)
  fastify.post('/', async (request, reply) => {
    const body = (request.body ?? {}) as { imageBase64?: string; caption?: string };

    const imageBase64 = body.imageBase64?.replace(/^data:image\/\w+;base64,/, '');
    if (!imageBase64) throw new BadRequestError('Image is required');

    const caption = body.caption?.trim();
    if (caption && caption.length > 280) throw new BadRequestError('Caption is too long');

    let buffer: Buffer;
    try {
      buffer = Buffer.from(imageBase64, 'base64');
    } catch {
      throw new BadRequestError('Invalid image data');
    }
    if (buffer.length === 0) throw new BadRequestError('Invalid image data');

    const imageUrl = await saveStorySnapshot({
      filename: 'forest.jpg',
      mimetype: 'image/jpeg',
      buffer,
    });

    const now = Date.now();
    const story = await fastify.prisma.story.create({
      data: {
        userId: request.user!.id,
        imageUrl,
        caption: caption || null,
        expiresAt: new Date(now + STORY_TTL_MS),
      },
    });

    reply.status(201).send(serializeStory(story));
  });

  // All of my stories, newest first — permanent gallery (no expiry filter)
  fastify.get('/me', async (request, reply) => {
    const stories = await fastify.prisma.story.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: 'desc' },
    });
    reply.send(stories.map(serializeStory));
  });

  // Friends' active (non-expired) stories, grouped by user — for the story rings
  fastify.get('/feed', async (request, reply) => {
    const userId = request.user!.id;
    const friendships = await fastify.prisma.friendship.findMany({
      where: {
        status: 'accepted',
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      select: { requesterId: true, addresseeId: true },
    });

    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );
    if (friendIds.length === 0) {
      reply.send([]);
      return;
    }

    const stories = await fastify.prisma.story.findMany({
      where: { userId: { in: friendIds }, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
      include: { user: true },
    });

    // Group by poster; preserve most-recent-first ordering of users
    const byUser = new Map<string, { user: any; stories: any[] }>();
    for (const story of stories) {
      let entry = byUser.get(story.userId);
      if (!entry) {
        entry = {
          user: {
            id: story.user.id,
            name: story.user.name,
            handle: story.user.handle,
            avatarEmoji: story.user.avatarEmoji,
          },
          stories: [],
        };
        byUser.set(story.userId, entry);
      }
      entry.stories.push(serializeStory(story));
    }

    const feed = [...byUser.values()].sort((a, b) => {
      const aLatest = a.stories[a.stories.length - 1].createdAt;
      const bLatest = b.stories[b.stories.length - 1].createdAt;
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

    reply.send(feed);
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const result = await fastify.prisma.story.deleteMany({
      where: { id: request.params.id, userId: request.user!.id },
    });
    if (result.count === 0) throw new NotFoundError('Story not found');
    reply.status(204).send();
  });
}
