import { FastifyInstance } from 'fastify';
import { ORG_ROLES } from '../constants/roles';
import { z } from 'zod';
import * as portfolioService from '../services/portfolio.service';
import { MAX_PORTFOLIO_MEDIA } from '../services/portfolio.service';
import { savePortfolioMedia } from '../services/upload.service';
import { splitMultipartFiles } from '../utils/multipart';
import { BadRequestError } from '../utils/errors';

const entrySchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(4000).optional(),
  happenedOn: z.coerce.date(),
  locationLabel: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  treesPlanted: z.coerce.number().int().min(0).max(10_000_000).optional(),
  volunteersInvolved: z.coerce.number().int().min(0).max(1_000_000).optional(),
  partnerOrgs: z.string().max(500).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

const patchSchema = entrySchema.partial();

async function readMedia(request: any) {
  const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
  if (!isMultipart) {
    return { fields: (request.body ?? {}) as Record<string, unknown>, mediaUrls: undefined };
  }

  const { fields, files } = splitMultipartFiles(request.body, 'photos');
  if (files.length > MAX_PORTFOLIO_MEDIA) {
    throw new BadRequestError(`A past-work entry can have at most ${MAX_PORTFOLIO_MEDIA} photos`);
  }

  const mediaUrls: string[] = [];
  for (const file of files) {
    const buffer = await file.toBuffer();
    mediaUrls.push(await savePortfolioMedia({ filename: file.filename, mimetype: file.mimetype, buffer }));
  }

  return { fields, mediaUrls };
}

/** NGO-only CRUD over "past work" entries. Mounted at /api/ngo/portfolio. */
export default async function portfolioRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole(...ORG_ROLES));

  fastify.get('/', async (request, reply) => {
    reply.send(await portfolioService.listOwnPortfolio(fastify.prisma, request.user!.id));
  });

  fastify.post('/', async (request, reply) => {
    const { fields, mediaUrls } = await readMedia(request);

    const parsed = entrySchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const entry = await portfolioService.createPortfolioEntry(fastify.prisma, request.user!.id, {
      ...parsed.data,
      mediaUrls: mediaUrls ?? [],
    });
    reply.status(201).send(entry);
  });

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const { fields, mediaUrls } = await readMedia(request);

    const parsed = patchSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    // `mediaUrls` stays undefined when no files were sent, which the service reads as "leave the
    // existing photos alone" rather than "remove them all".
    const entry = await portfolioService.updatePortfolioEntry(
      fastify.prisma,
      request.user!.id,
      request.params.id,
      { ...parsed.data, mediaUrls },
    );
    reply.send(entry);
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await portfolioService.deletePortfolioEntry(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });
}
