import Fastify, { FastifyError } from 'fastify';
import { AppError } from './utils/errors';

import prismaPlugin from './plugins/prisma';
import authPlugin from './plugins/auth';
import corsPlugin from './plugins/cors';
import multipartPlugin from './plugins/multipart';
import staticPlugin from './plugins/static';

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
import themesRoutes from './routes/themes.routes';
import decorationsRoutes from './routes/decorations.routes';
import streaksRoutes from './routes/streaks.routes';
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
import plantedTreesRoutes from './routes/plantedTrees.routes';
import competitionsPublicRoutes from './routes/competitions.public.routes';
import competitionsRoutes from './routes/competitions.routes';
import nurseryFollowersRoutes from './routes/nurseryFollowers.routes';
import addressesRoutes from './routes/addresses.routes';
import cartRoutes from './routes/cart.routes';
import ordersRoutes from './routes/orders.routes';
import wishlistRoutes from './routes/wishlist.routes';
import ngoBulkRequirementsRoutes from './routes/ngoBulkRequirements.routes';
import nurseryBulkRequirementsRoutes from './routes/nurseryBulkRequirements.routes';
import saplingUnitsPublicRoutes from './routes/saplingUnits.public.routes';

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
  await app.register(citiesRoutes, { prefix: '/api/cities' });
  await app.register(communityRoutes, { prefix: '/api/community' });
  await app.register(challengesPublicRoutes, { prefix: '/api/challenges' });
  await app.register(usersPublicRoutes, { prefix: '/api/users' });
  await app.register(weatherRoutes, { prefix: '/api/weather' });
  await app.register(donationsWebhookRoutes, { prefix: '/api/donations' });
  await app.register(ngosPublicRoutes, { prefix: '/api/ngos' });
  await app.register(nurseriesPublicRoutes, { prefix: '/api/nurseries' });
  await app.register(competitionsPublicRoutes, { prefix: '/api/competitions' });
  await app.register(saplingUnitsPublicRoutes, { prefix: '/api/sapling-units' });

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
    await instance.register(themesRoutes, { prefix: '/api/themes' });
    await instance.register(decorationsRoutes, { prefix: '/api/decorations' });
    await instance.register(streaksRoutes, { prefix: '/api/streaks' });
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
    await instance.register(postsRoutes, { prefix: '/api/posts' });
    // Mounted at the bare /api root: it owns several unrelated paths (/social/feed,
    // /notifications, /blocks, /reports, /push-tokens) that don't share one prefix.
    await instance.register(socialRoutes, { prefix: '/api' });
    await instance.register(plantedTreesRoutes, { prefix: '/api/ngo/planted-trees' });
    await instance.register(competitionsRoutes, { prefix: '/api/competitions' });
    await instance.register(addressesRoutes, { prefix: '/api/addresses' });
    await instance.register(cartRoutes, { prefix: '/api/cart' });
    await instance.register(ordersRoutes, { prefix: '/api/orders' });
    await instance.register(wishlistRoutes, { prefix: '/api/wishlist' });
    await instance.register(nurseryFollowersRoutes, { prefix: '/api/nursery/followers' });
    await instance.register(ngoBulkRequirementsRoutes, { prefix: '/api/ngo/bulk-requirements' });
    await instance.register(nurseryBulkRequirementsRoutes, { prefix: '/api/nursery/bulk-requirements' });
  });

  return app;
}
