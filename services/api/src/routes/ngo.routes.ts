import { FastifyInstance } from 'fastify';
import * as ngoService from '../services/ngo.service';
import { saveNgoLogo } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import { BadRequestError } from '../utils/errors';
import { updateProfileSchema, donationsQuerySchema } from '../schemas/ngo.schema';

function serializeNgoProfile(profile: any) {
  return {
    id: profile.id,
    orgName: profile.orgName,
    description: profile.description,
    website: profile.website,
    contactPhone: profile.contactPhone,
    logoUrl: profile.logoUrl,
    city: profile.city,
    foundedYear: profile.foundedYear,
    volunteerCountEstimate: profile.volunteerCountEstimate,
    awards: profile.awards ?? [],
    status: profile.status,
    rejectionReason: profile.rejectionReason,
    createdAt: profile.createdAt,
  };
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const s = value == null ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))];
  return lines.join('\n');
}

export default async function ngoRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('ngo'));

  fastify.get('/profile', async (request, reply) => {
    const profile = await ngoService.getOwnProfile(fastify.prisma, request.user!.id);
    reply.send(serializeNgoProfile(profile));
  });

  fastify.patch('/profile', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any, 'logo')
      : { fields: (request.body ?? {}) as Record<string, string>, file: undefined };

    const parsed = updateProfileSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let logoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      logoUrl = await saveNgoLogo({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const profile = await ngoService.updateOwnProfile(fastify.prisma, request.user!.id, {
      ...parsed.data,
      ...(logoUrl ? { logoUrl } : {}),
    });
    reply.send(serializeNgoProfile(profile));
  });

  fastify.post('/resubmit', async (request, reply) => {
    const profile = await ngoService.resubmitProfile(fastify.prisma, request.user!.id);
    reply.send(serializeNgoProfile(profile));
  });

  fastify.get('/stats', async (request, reply) => {
    const stats = await ngoService.getOwnStats(fastify.prisma, request.user!.id);
    reply.send(stats);
  });

  fastify.get('/donations', async (request, reply) => {
    const parsed = donationsQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const result = await ngoService.getOwnDonations(fastify.prisma, request.user!.id, parsed.data);
    reply.send(result);
  });

  fastify.get('/donations/summary', async (request, reply) => {
    const summary = await ngoService.getOwnDonationsSummary(fastify.prisma, request.user!.id);
    reply.send(summary);
  });

  fastify.get('/donations/export', async (request, reply) => {
    const parsed = donationsQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const { donations } = await ngoService.getOwnDonations(fastify.prisma, request.user!.id, {
      ...parsed.data,
      take: 200,
      page: 1,
    });
    const csv = toCsv(
      donations.map((d) => ({
        date: d.createdAt.toISOString(),
        campaign: d.campaignTitle,
        donor: d.donor.name,
        donorHandle: d.donor.handle,
        amount: (d.amountCents / 100).toFixed(2),
        currency: d.currency,
        status: d.status,
      })),
    );
    reply.header('Content-Type', 'text/csv').header('Content-Disposition', 'attachment; filename="donations.csv"').send(csv);
  });

  fastify.get('/volunteers', async (request, reply) => {
    const volunteers = await ngoService.getOwnVolunteers(fastify.prisma, request.user!.id);
    reply.send(volunteers);
  });

  fastify.get('/reports', async (request, reply) => {
    const reports = await ngoService.getOwnReports(fastify.prisma, request.user!.id);
    reply.send(reports);
  });
}
