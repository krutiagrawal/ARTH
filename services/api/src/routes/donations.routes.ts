import { FastifyInstance } from 'fastify';
import { ORG_ROLES } from '../constants/roles';
import {
  createCampaignSchema,
  updateCampaignSchema,
  createDonationSchema,
  ownedListQuerySchema,
  paginationQuerySchema,
} from '../schemas/donations.schema';
import { saveCampaignPhoto } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import * as donationService from '../services/donation.service';
import { BadRequestError } from '../utils/errors';

function serializeCampaign(c: any) {
  return {
    id: c.id,
    ngoId: c.ngoId,
    ngoName: c.ngo?.orgName,
    title: c.title,
    description: c.description,
    coverPhotoUri: c.coverPhotoUrl,
    goalAmountCents: c.goalAmountCents ?? null,
    raisedAmountCents: c.raisedAmountCents,
    status: c.status,
    createdAt: c.createdAt,
  };
}

export default async function donationsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    const campaigns = await donationService.listCampaigns(fastify.prisma);
    reply.send(campaigns.map(serializeCampaign));
  });

  fastify.get('/mine', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    const parsed = ownedListQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const campaigns = await donationService.listOwnedCampaigns(fastify.prisma, request.user!.id, parsed.data);
    reply.send(campaigns.map(serializeCampaign));
  });

  fastify.get('/mine-donations', async (request, reply) => {
    const parsed = paginationQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const { donations, total } = await donationService.listMyDonations(fastify.prisma, request.user!.id, parsed.data);
    reply.send({
      total,
      donations: donations.map((d) => ({
        id: d.id,
        amountCents: d.amountCents,
        currency: d.currency,
        status: d.status,
        donatedAt: d.createdAt,
        campaignId: d.campaignId,
        campaignTitle: d.campaign.title,
        ngoName: d.campaign.ngo?.orgName,
      })),
    });
  });

  fastify.get<{ Params: { id: string } }>(
    '/:id/donations',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const parsed = paginationQuerySchema.safeParse(request.query);
      if (!parsed.success) throw new BadRequestError('Invalid query parameters');

      const { donations, total } = await donationService.listCampaignDonations(
        fastify.prisma,
        request.user!.id,
        request.params.id,
        parsed.data,
      );
      reply.send({
        total,
        donations: donations.map((d) => ({
          id: d.id,
          name: d.user.name,
          handle: d.user.handle,
          amountCents: d.amountCents,
          currency: d.currency,
          donatedAt: d.createdAt,
        })),
      });
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const campaign = await donationService.getCampaign(fastify.prisma, request.params.id);
    reply.send(serializeCampaign(campaign));
  });

  fastify.post('/', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    const { fields, file } = splitMultipartBody(request.body as any);

    const parsed = createCampaignSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let coverPhotoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      coverPhotoUrl = await saveCampaignPhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const campaign = await donationService.createCampaign(fastify.prisma, request.user!.id, {
      ...parsed.data,
      coverPhotoUrl,
    });
    reply.status(201).send(serializeCampaign(campaign));
  });

  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
      const { fields, file } = isMultipart
        ? splitMultipartBody(request.body as any)
        : { fields: (request.body ?? {}) as Record<string, unknown>, file: undefined };

      const parsed = updateCampaignSchema.safeParse(fields);
      if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

      let coverPhotoUrl: string | undefined;
      if (file) {
        const buffer = await file.toBuffer();
        coverPhotoUrl = await saveCampaignPhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
      }

      const campaign = await donationService.updateCampaign(fastify.prisma, request.user!.id, request.params.id, {
        ...parsed.data,
        ...(coverPhotoUrl ? { coverPhotoUrl } : {}),
      });
      reply.send(serializeCampaign(campaign));
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const campaign = await donationService.closeCampaign(fastify.prisma, request.user!.id, request.params.id);
      reply.send(serializeCampaign(campaign));
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/reopen',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const campaign = await donationService.reopenCampaign(fastify.prisma, request.user!.id, request.params.id);
      reply.send(serializeCampaign(campaign));
    },
  );

  fastify.post<{ Params: { id: string } }>('/:id/donate', async (request, reply) => {
    const parsed = createDonationSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const { donation, clientSecret } = await donationService.createDonationIntent(
      fastify.prisma,
      request.user!.id,
      request.params.id,
      parsed.data.amountCents,
      parsed.data.currency ?? 'inr',
    );

    reply.status(201).send({ donationId: donation.id, clientSecret });
  });
}
