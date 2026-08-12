import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { env } from '../config/env';

export default fp(async function staticPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyStatic, {
    root: path.resolve(process.cwd(), env.UPLOAD_DIR),
    prefix: '/uploads/',
  });
});
