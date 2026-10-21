import { toCsv } from '../utils/csv';
import { FastifyInstance } from 'fastify';
import { ORG_ROLES } from '../constants/roles';
import {
  createCampaignSchema,
  updateCampaignSchema,
  createDonationSchema,
  listCampaignsQuerySchema,
  ownedListQuerySchema,
  paginationQuerySchema,
  myDonationsQuerySchema,
} from '../schemas/donations.schema';
import { saveCampaignPhoto } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import * as donationService from '../services/donation.service';
import { BadRequestError } from '../utils/errors';

export function serializeCampaign(c: any) {
  return {
    id: c.id,
    ngoId: c.ngoId,
    ngoName: c.ngo?.orgName,
    title: c.title,
    description: c.description,
    coverPhotoUri: c.coverPhotoUrl,
    goalAmountCents: c.goalAmountCents ?? null,
    raisedAmountCents: c.raisedAmountCents,
    anonymousRaisedCents: c.anonymousRaisedCents ?? 0,
    donorCount: c.donorCount ?? 0,
    recentDonors: c.recentDonors ?? [],
    category: c.category ?? null,
    endsAt: c.endsAt ?? null,
    status: c.status,
    isArchived: !!c.archivedAt,
    createdAt: c.createdAt,
  };
}

export default async function donationsRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const parsed = listCampaignsQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const campaigns = await donationService.listCampaigns(fastify.prisma, parsed.data);
    reply.send(campaigns.map(serializeCampaign));
  });

  fastify.get('/mine', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    const parsed = ownedListQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const campaigns = await donationService.listOwnedCampaigns(fastify.prisma, request.user!.id, parsed.data);
    reply.send(campaigns.map(serializeCampaign));
  });

  fastify.get('/mine/summary', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    reply.send(await donationService.getOwnedCampaignSummary(fastify.prisma, request.user!.id));
  });

  // CSV rows as JSON ({ csv }) so the app can hand the text straight to the share sheet.
  fastify.get('/mine/export', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    const rows = await donationService.exportOwnedCampaigns(fastify.prisma, request.user!.id);
    reply.send({ csv: toCsv(rows), count: rows.length });
  });

  fastify.post<{ Params: { id: string } }>(
    '/:id/duplicate',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      reply.status(201).send(serializeCampaign(await donationService.duplicateCampaign(fastify.prisma, request.user!.id, request.params.id)));
    },
  );

  fastify.post<{ Params: { id: string }; Body: { archived?: boolean } }>(
    '/:id/archive',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const archived = request.body?.archived !== false;
      reply.send(serializeCampaign(await donationService.setCampaignArchived(fastify.prisma, request.user!.id, request.params.id, archived)));
    },
  );

  fastify.get('/mine-donations/export', async (request, reply) => {
    const rows = await donationService.exportMyDonations(fastify.prisma, request.user!.id);
    reply.send({ csv: toCsv(rows), count: rows.length });
  });

  fastify.get('/mine-donations', async (request, reply) => {
    const parsed = myDonationsQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const { donations, total, summary } = await donationService.listMyDonations(fastify.prisma, request.user!.id, parsed.data);
    reply.send({
      total,
      summary,
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
          isAnonymous: d.isAnonymous,
          message: d.message,
        })),
      });
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const campaign = await donationService.getCampaign(fastify.prisma, request.params.id);
    reply.send(serializeCampaign(campaign));
  });

  // Viewable by either the donor or the NGO that received it — donationService.getDonationReceiptHtml
  // does that authorization check itself since it depends on the donation row, not a role.
  fastify.get<{ Params: { donationId: string } }>('/donations/:donationId/receipt', async (request, reply) => {
    const html = await donationService.getDonationReceiptHtml(fastify.prisma, request.user!.id, request.params.donationId);
    reply.type('text/html').send(html);
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

  // Hard delete – only succeeds while nothing real depends on it (see the service for the rules).
  fastify.delete<{ Params: { id: string } }>(
    '/:id/permanent',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      reply.send(await donationService.deleteCampaign(fastify.prisma, request.user!.id, request.params.id));
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
      { isAnonymous: parsed.data.isAnonymous, message: parsed.data.message, donorPan: parsed.data.donorPan },
    );

    reply.status(201).send({ donationId: donation.id, clientSecret });
  });
}
