import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { captureClientError } from '../lib/sentry';
import { limit } from '../plugins/rateLimit';

const reportSchema = z.object({
  message: z.string().min(1).max(500),
  stack: z.string().max(4000).optional(),
  screen: z.string().max(100).optional(),
  appVersion: z.string().max(30).optional(),
  platform: z.string().max(20).optional(),
  fatal: z.boolean().optional(),
});

// Receives JavaScript errors from the mobile app so they show up in crash reporting without shipping a
// native crash SDK (which would force every tester to reinstall the APK). Unauthenticated on purpose — a
// crash can happen before login — so it is tightly size- and rate-limited, and always answers 204.
export default async function clientErrorsRoutes(fastify: FastifyInstance) {
  fastify.post('/', { ...limit(10, '1 minute'), preHandler: fastify.optionalAuthenticate }, async (request, reply) => {
    const parsed = reportSchema.safeParse(request.body);
    if (parsed.success) {
      const report = { ...parsed.data, userId: request.user?.id };
      request.log.warn({ clientError: { message: report.message, screen: report.screen, appVersion: report.appVersion } }, 'mobile error report');
      captureClientError(report);
    }
    reply.status(204).send();
  });
}
