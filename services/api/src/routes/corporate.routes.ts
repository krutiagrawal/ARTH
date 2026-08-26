import { FastifyInstance } from 'fastify';
import * as corporateService from '../services/corporate.service';
import { saveCorporateLogo } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import { BadRequestError } from '../utils/errors';
import { updateCorporateProfileSchema, createSponsorshipSchema } from '../schemas/corporate.schema';

function serializeProfile(profile: any) {
  return {
    id: profile.id,
    companyName: profile.companyName,
    description: profile.description,
    logoUrl: profile.logoUrl,
    city: profile.city,
    industry: profile.industry,
    status: profile.status,
    rejectionReason: profile.rejectionReason,
    streakCurrent: profile.streakCurrent,
    streakMax: profile.streakMax,
    badgesCount: profile.badgesCount,
    createdAt: profile.createdAt,
  };
}

export default async function corporateRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('corporate'));

  fastify.get('/profile', async (request, reply) => {
    reply.send(serializeProfile(await corporateService.getOwnProfile(fastify.prisma, request.user!.id)));
  });

  fastify.patch('/profile', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any, 'logo')
      : { fields: (request.body ?? {}) as Record<string, string>, file: undefined };

    const parsed = updateCorporateProfileSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let logoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      logoUrl = await saveCorporateLogo({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const profile = await corporateService.updateOwnProfile(fastify.prisma, request.user!.id, {
      ...parsed.data,
      ...(logoUrl ? { logoUrl } : {}),
    });
    reply.send(serializeProfile(profile));
  });

  fastify.post('/resubmit', async (request, reply) => {
    reply.send(serializeProfile(await corporateService.resubmitProfile(fastify.prisma, request.user!.id)));
  });

  fastify.get('/stats', async (request, reply) => {
    reply.send(await corporateService.getOwnStats(fastify.prisma, request.user!.id));
  });

  fastify.get('/sponsorships', async (request, reply) => {
    reply.send(await corporateService.listSponsorships(fastify.prisma, request.user!.id));
  });

  fastify.post('/sponsorships', async (request, reply) => {
    const parsed = createSponsorshipSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const sponsorship = await corporateService.createSponsorship(fastify.prisma, request.user!.id, parsed.data);
    reply.status(201).send(sponsorship);
  });

  fastify.delete<{ Params: { id: string } }>('/sponsorships/:id', async (request, reply) => {
    await corporateService.deleteSponsorship(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });
}
