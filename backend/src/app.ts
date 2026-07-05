import Fastify, { FastifyError } from 'fastify';
import { AppError } from './utils/errors';

import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import corsPlugin from './plugins/cors';
import multipartPlugin from './plugins/multipart';
import staticPlugin from './plugins/static';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import speciesRoutes from './routes/species.routes';
import ecoFactsRoutes from './routes/ecoFacts.routes';
import communityRoutes from './routes/community.routes';
import challengesPublicRoutes from './routes/challenges.public.routes';
import usersPublicRoutes from './routes/users.public.routes';
import weatherRoutes from './routes/weather.routes';

import usersRoutes from './routes/users.routes';
import settingsRoutes from './routes/settings.routes';
import treesRoutes from './routes/trees.routes';
import achievementsRoutes from './routes/achievements.routes';
import friendsRoutes from './routes/friends.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import challengesRoutes from './routes/challenges.routes';
import missionsRoutes from './routes/missions.routes';
import themesRoutes from './routes/themes.routes';
import decorationsRoutes from './routes/decorations.routes';
import streaksRoutes from './routes/streaks.routes';
import xpRoutes from './routes/xp.routes';
import feedRoutes from './routes/feed.routes';
import storiesRoutes from './routes/stories.routes';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(corsPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(multipartPlugin);
  await app.register(staticPlugin);

  app.setErrorHandler((error: FastifyError | AppError, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ error: error.code, message: error.message });
      return;
    }
    if (error.validation) {
      reply.status(400).send({ error: 'VALIDATION_ERROR', message: error.message });
      return;
    }
    app.log.error(error);
    reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Something went wrong' });
  });

  // Public routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(speciesRoutes, { prefix: '/api/species' });
  await app.register(ecoFactsRoutes, { prefix: '/api/eco-facts' });
  await app.register(communityRoutes, { prefix: '/api/community' });
  await app.register(challengesPublicRoutes, { prefix: '/api/challenges' });
  await app.register(usersPublicRoutes, { prefix: '/api/users' });
  await app.register(weatherRoutes, { prefix: '/api/weather' });

  // Protected routes (JWT required)
  await app.register(async (instance) => {
    instance.addHook('onRequest', instance.authenticate);

    await instance.register(usersRoutes, { prefix: '/api/users' });
    await instance.register(settingsRoutes, { prefix: '/api/users/me/settings' });
    await instance.register(treesRoutes, { prefix: '/api/trees' });
    await instance.register(achievementsRoutes, { prefix: '/api/achievements' });
    await instance.register(friendsRoutes, { prefix: '/api/friends' });
    await instance.register(leaderboardRoutes, { prefix: '/api/leaderboard' });
    await instance.register(challengesRoutes, { prefix: '/api/challenges' });
    await instance.register(missionsRoutes, { prefix: '/api/missions' });
    await instance.register(themesRoutes, { prefix: '/api/themes' });
    await instance.register(decorationsRoutes, { prefix: '/api/decorations' });
    await instance.register(streaksRoutes, { prefix: '/api/streaks' });
    await instance.register(xpRoutes, { prefix: '/api/xp' });
    await instance.register(feedRoutes, { prefix: '/api/feed' });
    await instance.register(storiesRoutes, { prefix: '/api/stories' });
  });

  return app;
}
