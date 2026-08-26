import { FastifyInstance } from 'fastify';
import { ORG_ROLES } from '../constants/roles';
import * as ngoService from '../services/ngo.service';
import { requireNgoProfile } from '../services/ngo.service';
import { saveNgoLogo } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import { BadRequestError } from '../utils/errors';
import { updateProfileSchema, donationsQuerySchema } from '../schemas/ngo.schema';
import { startOfIsoWeekUtc, addWeeks } from '../services/ngoStreak.service';

interface NgoLeaderboardRow {
  id: string;
  org_name: string;
  logo_url: string | null;
  trees_planted: bigint;
  rank: bigint;
}

interface NgoRankRow {
  rank: bigint;
}

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
    followPolicy: profile.followPolicy,
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
  fastify.addHook('preHandler', fastify.requireRole(...ORG_ROLES));

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

  fastify.get('/achievements', async (request, reply) => {
    const ngo = await requireNgoProfile(fastify.prisma, request.user!.id);

    const achievements = await fastify.prisma.ngoAchievement.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        unlocks: { where: { ngoId: ngo.id } },
      },
    });

    reply.send(
      achievements.map((achievement) => {
        const unlock = achievement.unlocks[0];
        return {
          id: achievement.id,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          rarity: achievement.rarity,
          unlocked: unlock?.unlocked ?? false,
          progress: unlock?.progress ?? 0,
          total: achievement.criteriaTarget ?? undefined,
        };
      })
    );
  });

  fastify.get<{ Querystring: { weeks?: string } }>('/streaks/calendar', async (request, reply) => {
    const ngo = await requireNgoProfile(fastify.prisma, request.user!.id);
    const weeksCount = Math.min(Math.max(Number(request.query.weeks) || 12, 1), 26);

    const thisWeek = startOfIsoWeekUtc(new Date());
    const startWeek = addWeeks(thisWeek, -(weeksCount - 1));

    const rows = await fastify.prisma.ngoStreakHistory.findMany({
      where: { ngoId: ngo.id, weekStart: { gte: startWeek } },
    });
    const postedWeeks = new Set(rows.filter((r) => r.posted).map((r) => r.weekStart.toISOString().slice(0, 10)));

    const weeks = [];
    for (let w = 0; w < weeksCount; w++) {
      const weekStart = addWeeks(startWeek, w);
      weeks.push({
        weekLabel: `Week ${w + 1}`,
        posted: postedWeeks.has(weekStart.toISOString().slice(0, 10)),
      });
    }

    reply.send({ weeks });
  });

  fastify.get<{ Querystring: { limit?: string } }>('/leaderboard', async (request, reply) => {
    const ngoId = (await requireNgoProfile(fastify.prisma, request.user!.id)).id;
    const limit = Math.min(Number(request.query.limit) || 50, 200);

    const rows = await fastify.prisma.$queryRaw<NgoLeaderboardRow[]>`
      SELECT n.id, n.org_name, n.logo_url, COUNT(pt.id) AS trees_planted,
             RANK() OVER (ORDER BY COUNT(pt.id) DESC) AS rank
      FROM ngo_profiles n
      LEFT JOIN planted_trees pt ON pt.ngo_id = n.id
      WHERE n.status = 'approved'
      GROUP BY n.id
      ORDER BY trees_planted DESC
      LIMIT ${limit};
    `;

    const myRankRows = await fastify.prisma.$queryRaw<NgoRankRow[]>`
      SELECT rank FROM (
        SELECT n.id, RANK() OVER (ORDER BY COUNT(pt.id) DESC) AS rank
        FROM ngo_profiles n
        LEFT JOIN planted_trees pt ON pt.ngo_id = n.id
        WHERE n.status = 'approved'
        GROUP BY n.id
      ) ranked WHERE id = ${ngoId};
    `;

    const totalNgos = await fastify.prisma.ngoProfile.count({ where: { status: 'approved' } });

    reply.send({
      entries: rows.map((row) => ({
        rank: Number(row.rank),
        id: row.id,
        orgName: row.org_name,
        logoUrl: row.logo_url,
        treesPlanted: Number(row.trees_planted),
        isNgo: row.id === ngoId,
      })),
      totalNgos,
      myRank: myRankRows[0] ? Number(myRankRows[0].rank) : null,
    });
  });
}
