import Fastify, { FastifyError } from 'fastify';
import helmet from '@fastify/helmet';
import { AppError } from './utils/errors';

import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import corsPlugin from './plugins/cors';
import multipartPlugin from './plugins/multipart';
import staticPlugin from './plugins/static';
import rateLimitPlugin from './plugins/rateLimit';
import { captureServerError } from './lib/sentry';
import clientErrorsRoutes from './routes/clientErrors.routes';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import speciesRoutes, { speciesAuthRoutes } from './routes/species.routes';
import ecoFactsRoutes from './routes/ecoFacts.routes';
import citiesRoutes from './routes/cities.routes';
import communityRoutes from './routes/community.routes';
import challengesPublicRoutes from './routes/challenges.public.routes';
import usersPublicRoutes from './routes/users.public.routes';
import weatherRoutes from './routes/weather.routes';

import usersRoutes from './routes/users.routes';
import settingsRoutes from './routes/settings.routes';
import treesRoutes from './routes/trees.routes';
import plantingLocationsRoutes from './routes/plantingLocations.routes';
import achievementsRoutes from './routes/achievements.routes';
import friendsRoutes from './routes/friends.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import challengesRoutes from './routes/challenges.routes';
import missionsRoutes from './routes/missions.routes';
import gamesRoutes from './routes/games.routes';
import themesRoutes from './routes/themes.routes';
import decorationsRoutes from './routes/decorations.routes';
import streaksRoutes from './routes/streaks.routes';
import orgStreaksRoutes from './routes/orgStreaks.routes';
import xpRoutes from './routes/xp.routes';
import feedRoutes from './routes/feed.routes';
import storiesRoutes from './routes/stories.routes';
import ngoRoutes from './routes/ngo.routes';
import groupRoutes from './routes/group.routes';
import groupThemesRoutes from './routes/group-themes.routes';
import groupsRoutes from './routes/groups.routes';
import nurseryRoutes from './routes/nursery.routes';
import corporateRoutes from './routes/corporate.routes';
import adminRoutes from './routes/admin.routes';
import drivesRoutes from './routes/drives.routes';
import adoptionsRoutes from './routes/adoptions.routes';
import donationsRoutes from './routes/donations.routes';
import donationsWebhookRoutes from './routes/donationsWebhook.routes';
import ngosPublicRoutes from './routes/ngos.public.routes';
import nurseriesPublicRoutes from './routes/nurseries.public.routes';
import reservationsRoutes from './routes/reservations.routes';
import followRoutes from './routes/follow.routes';
import ngoUpdatesRoutes from './routes/ngoUpdates.routes';
import staffRoutes from './routes/staff.routes';
import postsRoutes from './routes/posts.routes';
import socialRoutes from './routes/social.routes';
import ngoFollowersRoutes from './routes/ngoFollowers.routes';
import portfolioRoutes from './routes/portfolio.routes';
import portfolioLikesRoutes from './routes/portfolioLikes.routes';
import plantedTreesRoutes from './routes/plantedTrees.routes';
import treeObservationsRoutes from './routes/treeObservations.routes';
import competitionsPublicRoutes from './routes/competitions.public.routes';
import httpCachePlugin from './plugins/httpCache';
import competitionsRoutes from './routes/competitions.routes';
import nurseryFollowersRoutes from './routes/nurseryFollowers.routes';
import addressesRoutes from './routes/addresses.routes';
import geocodeRoutes from './routes/geocode.routes';
import cartRoutes from './routes/cart.routes';
import ordersRoutes from './routes/orders.routes';
import wishlistRoutes from './routes/wishlist.routes';
import ngoBulkRequirementsRoutes from './routes/ngoBulkRequirements.routes';
import nurseryBulkRequirementsRoutes from './routes/nurseryBulkRequirements.routes';
import nurseryDeliveryPartnersRoutes from './routes/nurseryDeliveryPartners.routes';
import deliveryPartnerRoutes from './routes/deliveryPartner.routes';

export async function buildApp() {
  // trustProxy: nginx (and the Next.js server) reach us over loopback, so without it every request appears
  // to come from 127.0.0.1 and per-IP rate limits would treat the whole internet as one caller. Only
  // loopback hops are trusted; nginx overwrites X-Forwarded-For, so a client can't spoof its own IP.
  const app = Fastify({ logger: true, trustProxy: 'loopback' });

  // Security headers (nosniff, no framing, HSTS...). The CORP override lets the web app and other
  // origins display images served from /uploads.
  await app.register(helmet, { crossOriginResourcePolicy: { policy: 'cross-origin' } });
  await app.register(rateLimitPlugin);
  await app.register(corsPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(multipartPlugin);
  await app.register(staticPlugin);
  await app.register(httpCachePlugin);

  app.setErrorHandler((error: FastifyError | AppError, request, reply) => {
    if (error instanceof AppError) {
      reply
        .status(error.statusCode)
        .send({ error: error.code, message: error.message, ...(error.details !== undefined ? { details: error.details } : {}) });
      return;
    }
    if (error.statusCode === 429) {
      const body = error as unknown as { error?: string; message?: string };
      reply.status(429).send({ error: body.error ?? 'TOO_MANY_REQUESTS', message: body.message ?? 'Too many requests. Please try again shortly.' });
      return;
    }
    if (error.validation) {
      reply.status(400).send({ error: 'VALIDATION_ERROR', message: error.message });
      return;
    }
    // @fastify/multipart aborts oversized or over-count uploads with its own FastifyErrors; without
    // this they fall through to the generic 500 below and the client can't tell the user what to fix.
    if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
      reply.status(413).send({ error: 'FILE_TOO_LARGE', message: 'One of your files is larger than 8 MB. Please choose a smaller file or photo.' });
      return;
    }
    if (error.code === 'FST_FILES_LIMIT') {
      reply.status(400).send({ error: 'TOO_MANY_FILES', message: 'Too many files were attached.' });
      return;
    }
    // Malformed requests (bad JSON, wrong content type...) are the caller's fault, not a server crash: answer with
    // their real 4xx status instead of a 500, and keep them out of error reporting.
    if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500) {
      reply.status(error.statusCode).send({ error: error.code ?? 'BAD_REQUEST', message: error.message });
      return;
    }
    app.log.error(error);
    captureServerError(error, { method: request.method, route: request.routeOptions?.url, userId: request.user?.id });
    reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Something went wrong' });
  });

  // Public routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(speciesRoutes, { prefix: '/api/species' });
  await app.register(ecoFactsRoutes, { prefix: '/api/eco-facts' });
  await app.register(citiesRoutes, { prefix: '/api/cities' });
  await app.register(communityRoutes, { prefix: '/api/community' });
  await app.register(challengesPublicRoutes, { prefix: '/api/challenges' });
  await app.register(usersPublicRoutes, { prefix: '/api/users' });
  await app.register(weatherRoutes, { prefix: '/api/weather' });
  await app.register(donationsWebhookRoutes, { prefix: '/api/donations' });
  await app.register(ngosPublicRoutes, { prefix: '/api/ngos' });
  await app.register(nurseriesPublicRoutes, { prefix: '/api/nurseries' });
  await app.register(competitionsPublicRoutes, { prefix: '/api/competitions' });
  await app.register(clientErrorsRoutes, { prefix: '/api/client-errors' });
  // No user identity needed to geocode — and it must work pre-signup, since the nursery
  // registration wizard's address field/current-location button run before any account exists.
  await app.register(geocodeRoutes, { prefix: '/api/geocode' });

  // Protected routes (JWT required)
  await app.register(async (instance) => {
    instance.addHook('onRequest', instance.authenticate);

    await instance.register(speciesAuthRoutes, { prefix: '/api/species' });
    await instance.register(usersRoutes, { prefix: '/api/users' });
    await instance.register(settingsRoutes, { prefix: '/api/users/me/settings' });
    await instance.register(treesRoutes, { prefix: '/api/trees' });
    await instance.register(plantingLocationsRoutes, { prefix: '/api/planting-locations' });
    await instance.register(achievementsRoutes, { prefix: '/api/achievements' });
    await instance.register(friendsRoutes, { prefix: '/api/friends' });
    await instance.register(leaderboardRoutes, { prefix: '/api/leaderboard' });
    await instance.register(challengesRoutes, { prefix: '/api/challenges' });
    await instance.register(missionsRoutes, { prefix: '/api/missions' });
    await instance.register(gamesRoutes, { prefix: '/api/games' });
    await instance.register(themesRoutes, { prefix: '/api/themes' });
    await instance.register(decorationsRoutes, { prefix: '/api/decorations' });
    await instance.register(streaksRoutes, { prefix: '/api/streaks' });
    await instance.register(orgStreaksRoutes, { prefix: '/api/org-streaks' });
    await instance.register(xpRoutes, { prefix: '/api/xp' });
    await instance.register(feedRoutes, { prefix: '/api/feed' });
    await instance.register(storiesRoutes, { prefix: '/api/stories' });
    await instance.register(ngoRoutes, { prefix: '/api/ngo' });
    await instance.register(groupRoutes, { prefix: '/api/group' });
    await instance.register(groupThemesRoutes, { prefix: '/api/group/themes' });
    await instance.register(groupsRoutes, { prefix: '/api/groups' });
    await instance.register(nurseryRoutes, { prefix: '/api/nursery' });
    await instance.register(reservationsRoutes, { prefix: '/api/reservations' });
    await instance.register(corporateRoutes, { prefix: '/api/corporate' });
    await instance.register(adminRoutes, { prefix: '/api/admin' });
    await instance.register(drivesRoutes, { prefix: '/api/drives' });
    await instance.register(adoptionsRoutes, { prefix: '/api/adoptable-trees' });
    await instance.register(donationsRoutes, { prefix: '/api/campaigns' });
    await instance.register(followRoutes, { prefix: '/api/follows' });
    await instance.register(ngoUpdatesRoutes, { prefix: '/api/ngo/updates' });
    await instance.register(staffRoutes, { prefix: '/api/ngo/staff' });
    await instance.register(ngoFollowersRoutes, { prefix: '/api/ngo/followers' });
    await instance.register(portfolioRoutes, { prefix: '/api/ngo/portfolio' });
    await instance.register(portfolioLikesRoutes, { prefix: '/api/portfolio' });
    await instance.register(postsRoutes, { prefix: '/api/posts' });
    // Mounted at the bare /api root: it owns several unrelated paths (/social/feed,
    // /notifications, /blocks, /reports, /push-tokens) that don't share one prefix.
    await instance.register(socialRoutes, { prefix: '/api' });
    await instance.register(plantedTreesRoutes, { prefix: '/api/ngo/planted-trees' });
    await instance.register(treeObservationsRoutes, { prefix: '/api/tree-observations' });
    await instance.register(competitionsRoutes, { prefix: '/api/competitions' });
    await instance.register(addressesRoutes, { prefix: '/api/addresses' });
    await instance.register(cartRoutes, { prefix: '/api/cart' });
    await instance.register(ordersRoutes, { prefix: '/api/orders' });
    await instance.register(wishlistRoutes, { prefix: '/api/wishlist' });
    await instance.register(nurseryFollowersRoutes, { prefix: '/api/nursery/followers' });
    await instance.register(ngoBulkRequirementsRoutes, { prefix: '/api/ngo/bulk-requirements' });
    await instance.register(nurseryBulkRequirementsRoutes, { prefix: '/api/nursery/bulk-requirements' });
    await instance.register(nurseryDeliveryPartnersRoutes, { prefix: '/api/nursery/delivery-partners' });
    await instance.register(deliveryPartnerRoutes, { prefix: '/api/delivery-partner' });
  });

  return app;
}
