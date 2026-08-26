import { FastifyInstance } from 'fastify';
import { ORG_ROLES } from '../constants/roles';
import {
  createDriveSchema,
  updateDriveSchema,
  nearbyQuerySchema,
  ownedListQuerySchema,
  paginationQuerySchema,
} from '../schemas/drives.schema';
import { saveDrivePhoto } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import * as driveService from '../services/drive.service';
import { BadRequestError } from '../utils/errors';

function serializeDrive(entry: any) {
  const d = entry.drive ?? entry;
  return {
    id: d.id,
    ngoId: d.ngoId,
    ngoName: d.ngo?.orgName,
    title: d.title,
    description: d.description,
    instructions: d.instructions,
    photoUri: d.photoUrl,
    address: d.address,
    city: d.city,
    lat: d.lat != null ? Number(d.lat) : null,
    lng: d.lng != null ? Number(d.lng) : null,
    transportMode: d.transportMode,
    pickupPoints: (d.pickupPoints ?? []).map((p: any) => ({ id: p.id, address: p.address, arrivalBy: p.arrivalBy, order: p.order })),
    plants: (d.plants ?? []).map((p: any) => ({
      id: p.id,
      speciesName: p.speciesName,
      priceCents: p.priceCents,
      sponsoredCount: p._count?.sponsorships ?? 0,
    })),
    startsAt: d.startsAt,
    durationMinutes: d.durationMinutes,
    capacity: d.capacity,
    confirmedCount: d._count?.rsvps ?? 0,
    status: d.status,
    isRsvped: d.isRsvped,
    distanceKm: entry.distanceKm,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export default async function drivesRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    const parsed = nearbyQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const results = await driveService.listDrives(fastify.prisma, parsed.data);
    reply.send(results.map(serializeDrive));
  });

  fastify.get('/mine', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    const parsed = ownedListQuerySchema.safeParse(request.query);
    if (!parsed.success) throw new BadRequestError('Invalid query parameters');

    const drives = await driveService.listOwnedDrives(fastify.prisma, request.user!.id, parsed.data);
    reply.send(drives.map(serializeDrive));
  });

  fastify.get<{ Params: { id: string } }>(
    '/:id/attendees',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const parsed = paginationQuerySchema.safeParse(request.query);
      if (!parsed.success) throw new BadRequestError('Invalid query parameters');

      const { attendees, total } = await driveService.listDriveAttendees(
        fastify.prisma,
        request.user!.id,
        request.params.id,
        parsed.data,
      );
      reply.send({
        total,
        attendees: attendees.map((a) => ({ id: a.id, name: a.user.name, handle: a.user.handle, rsvpedAt: a.createdAt })),
      });
    },
  );

  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const drive = await driveService.getDrive(fastify.prisma, request.params.id, request.user?.id);
    reply.send(serializeDrive(drive));
  });

  fastify.post('/', { preHandler: [fastify.requireRole(...ORG_ROLES)] }, async (request, reply) => {
    const { fields, file } = splitMultipartBody(request.body as any);

    const parsed = createDriveSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let photoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      photoUrl = await saveDrivePhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const drive = await driveService.createDrive(fastify.prisma, request.user!.id, { ...parsed.data, photoUrl });
    reply.status(201).send(serializeDrive(drive));
  });

  fastify.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
      const { fields, file } = isMultipart
        ? splitMultipartBody(request.body as any)
        : { fields: (request.body ?? {}) as Record<string, unknown>, file: undefined };

      const parsed = updateDriveSchema.safeParse(fields);
      if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

      let photoUrl: string | undefined;
      if (file) {
        const buffer = await file.toBuffer();
        photoUrl = await saveDrivePhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
      }

      const drive = await driveService.updateDrive(fastify.prisma, request.user!.id, request.params.id, {
        ...parsed.data,
        ...(photoUrl ? { photoUrl } : {}),
      });
      reply.send(serializeDrive(drive));
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const drive = await driveService.cancelDrive(fastify.prisma, request.user!.id, request.params.id);
      reply.send(serializeDrive(drive));
    },
  );

  fastify.post<{ Params: { id: string } }>(
    '/:id/complete',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const drive = await driveService.completeDrive(fastify.prisma, request.user!.id, request.params.id);
      reply.send(serializeDrive(drive));
    },
  );

  fastify.post<{ Params: { id: string }; Body: { featured?: boolean } }>(
    '/:id/feature',
    { preHandler: [fastify.requireRole(...ORG_ROLES)] },
    async (request, reply) => {
      const featured = request.body?.featured !== false;
      const drive = await driveService.setDriveFeatured(
        fastify.prisma,
        request.user!.id,
        request.params.id,
        featured,
      );
      reply.send(serializeDrive(drive));
    },
  );

  fastify.post<{ Params: { id: string } }>('/:id/rsvp', async (request, reply) => {
    await driveService.rsvp(fastify.prisma, request.user!.id, request.params.id);
    const drive = await driveService.getDrive(fastify.prisma, request.params.id, request.user!.id);
    reply.status(201).send(serializeDrive(drive));
  });

  fastify.delete<{ Params: { id: string } }>('/:id/rsvp', async (request, reply) => {
    await driveService.cancelRsvp(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });

  fastify.post<{ Params: { id: string; plantId: string } }>(
    '/:id/plants/:plantId/sponsor',
    async (request, reply) => {
      const { sponsorship, clientSecret } = await driveService.sponsorPlant(
        fastify.prisma,
        request.user!.id,
        request.params.id,
        request.params.plantId,
      );
      reply.status(201).send({ sponsorshipId: sponsorship.id, clientSecret });
    },
  );
}
