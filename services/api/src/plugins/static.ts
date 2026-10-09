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

  // Photos that ship with the app (lesson images). Served by us rather than hotlinked: Wikimedia returns
  // 403 to React Native's Android networking stack, which made every remote photo silently disappear.
  // Files never change for a given name, so they can be cached hard.
  await fastify.register(fastifyStatic, {
    root: path.resolve(process.cwd(), 'public'),
    prefix: '/media/',
    decorateReply: false,
    maxAge: '30d',
    immutable: true,
  });
});
