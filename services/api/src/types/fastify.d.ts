import { PrismaClient, UserRole } from '@plant/db';
import 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    optionalAuthenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      role: UserRole;
    };
  }
}
