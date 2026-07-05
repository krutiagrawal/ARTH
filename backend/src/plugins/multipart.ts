import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

export default fp(async function multipartPlugin(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    attachFieldsToBody: true,
    limits: {
      fileSize: 8 * 1024 * 1024, // 8MB
      files: 1,
    },
  });
});
