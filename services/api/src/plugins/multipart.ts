import fp from 'fastify-plugin';
import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

export default fp(async function multipartPlugin(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    attachFieldsToBody: true,
    limits: {
      fileSize: 8 * 1024 * 1024, // 8MB
      // Posts and portfolio entries carry a carousel; NGO registration is the heaviest consumer
      // (up to 6 certificate documents + up to 5 past-work photos = 11 files) — every other route
      // still reads exactly one file via splitMultipartBody, so raising the ceiling here doesn't
      // change their behaviour.
      //
      // Set deliberately ABOVE what any single route allows: this limit aborts the request
      // mid-stream, which surfaces as an opaque 500, whereas letting a slightly over-sized
      // upload through lets the route reject it with a readable "at most N files" 400. This is
      // the backstop for a runaway client, not the product rule.
      files: 16,
    },
  });
});
