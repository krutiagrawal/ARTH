import { FastifyInstance } from 'fastify';
import * as staffService from '../services/staff.service';
import { saveStaffPhoto } from '../services/upload.service';
import { splitMultipartBody } from '../utils/multipart';
import { createStaffSchema, updateStaffSchema } from '../schemas/staff.schema';
import { BadRequestError } from '../utils/errors';

function serializeStaff(s: any) {
  return {
    id: s.id,
    name: s.name,
    role: s.role,
    contactEmail: s.contactEmail,
    contactPhone: s.contactPhone,
    photoUrl: s.photoUrl,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt,
  };
}

export default async function staffRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', fastify.requireRole('ngo'));

  fastify.get('/', async (request, reply) => {
    const staff = await staffService.listOwnStaff(fastify.prisma, request.user!.id);
    reply.send(staff.map(serializeStaff));
  });

  fastify.post('/', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any)
      : { fields: (request.body ?? {}) as Record<string, unknown>, file: undefined };

    const parsed = createStaffSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let photoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      photoUrl = await saveStaffPhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const staff = await staffService.createStaff(fastify.prisma, request.user!.id, { ...parsed.data, photoUrl });
    reply.status(201).send(serializeStaff(staff));
  });

  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const isMultipart = (request.headers['content-type'] ?? '').includes('multipart/form-data');
    const { fields, file } = isMultipart
      ? splitMultipartBody(request.body as any)
      : { fields: (request.body ?? {}) as Record<string, unknown>, file: undefined };

    const parsed = updateStaffSchema.safeParse(fields);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    let photoUrl: string | undefined;
    if (file) {
      const buffer = await file.toBuffer();
      photoUrl = await saveStaffPhoto({ filename: file.filename, mimetype: file.mimetype, buffer });
    }

    const staff = await staffService.updateStaff(fastify.prisma, request.user!.id, request.params.id, {
      ...parsed.data,
      ...(photoUrl ? { photoUrl } : {}),
    });
    reply.send(serializeStaff(staff));
  });

  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    await staffService.deleteStaff(fastify.prisma, request.user!.id, request.params.id);
    reply.status(204).send();
  });
}
