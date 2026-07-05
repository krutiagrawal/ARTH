import { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth.schema';
import * as authService from '../services/auth.service';
import { BadRequestError } from '../utils/errors';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const result = await authService.register(fastify.prisma, {
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      handle: parsed.data.handle.toLowerCase(),
    });

    reply.status(201).send(result);
  });

  fastify.post('/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const result = await authService.login(fastify.prisma, {
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
    });

    reply.send(result);
  });

  fastify.post('/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    const result = await authService.refresh(fastify.prisma, parsed.data.refreshToken);
    reply.send(result);
  });

  fastify.post('/logout', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) throw new BadRequestError(parsed.error.errors[0]?.message ?? 'Invalid input');

    await authService.logout(fastify.prisma, parsed.data.refreshToken);
    reply.status(204).send();
  });

  fastify.register(async (instance) => {
    instance.addHook('onRequest', instance.authenticate);

    instance.post('/logout-all', async (request, reply) => {
      await authService.logoutAll(fastify.prisma, request.user!.id);
      reply.status(204).send();
    });

    instance.get('/me', async (request, reply) => {
      const user = await fastify.prisma.user.findUniqueOrThrow({ where: { id: request.user!.id } });
      reply.send(authService.toPublicUser(user));
    });

    instance.get('/sessions', async (request, reply) => {
      const sessions = await authService.listSessions(fastify.prisma, request.user!.id);
      reply.send(sessions);
    });

    instance.delete<{ Params: { id: string } }>('/sessions/:id', async (request, reply) => {
      await authService.revokeSession(fastify.prisma, request.user!.id, request.params.id);
      reply.status(204).send();
    });
  });
}
