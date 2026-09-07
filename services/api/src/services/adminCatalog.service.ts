import { PrismaClient } from '@plant/db';
import { NotFoundError } from '../utils/errors';

// Every catalog route (species/achievements/challenges/missions/themes/decorations)
// was GET-only before this — the only writer was packages/db/prisma/seed.ts. This
// gives admin the same create/update capability at runtime, keyed off the same
// Prisma delegate names seed.ts already upserts against.
export type CatalogModel = 'species' | 'achievements' | 'challenges' | 'missions' | 'themes' | 'decorations';

const DELEGATE: Record<CatalogModel, string> = {
  species: 'treeSpecies',
  achievements: 'achievement',
  challenges: 'challenge',
  missions: 'dailyMission',
  themes: 'forestTheme',
  decorations: 'decorationType',
};

const NOT_FOUND_MESSAGE: Record<CatalogModel, string> = {
  species: 'Tree species not found',
  achievements: 'Achievement not found',
  challenges: 'Challenge not found',
  missions: 'Daily mission not found',
  themes: 'Forest theme not found',
  decorations: 'Decoration type not found',
};

const ORDER_BY: Record<CatalogModel, Record<string, 'asc' | 'desc'>> = {
  species: { sortOrder: 'asc' },
  achievements: { sortOrder: 'asc' },
  challenges: { startsAt: 'desc' },
  missions: { title: 'asc' },
  themes: { sortOrder: 'asc' },
  decorations: { sortOrder: 'asc' },
};

// Only these four models have an isActive field — Achievement/DecorationType
// don't, so deactivating them isn't offered (they're referenced by already-
// unlocked user rows either way, same reasoning as the others).
export const DEACTIVATABLE_MODELS: CatalogModel[] = ['species', 'challenges', 'missions', 'themes'];

function delegateFor(prisma: PrismaClient, model: CatalogModel) {
  return (prisma as unknown as Record<string, any>)[DELEGATE[model]];
}

export async function listCatalogItems(prisma: PrismaClient, model: CatalogModel) {
  return delegateFor(prisma, model).findMany({ orderBy: ORDER_BY[model] });
}

export async function createCatalogItem(prisma: PrismaClient, model: CatalogModel, data: Record<string, unknown>) {
  return delegateFor(prisma, model).create({ data });
}

export async function updateCatalogItem(
  prisma: PrismaClient,
  model: CatalogModel,
  id: string,
  data: Record<string, unknown>,
) {
  const existing = await delegateFor(prisma, model).findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(NOT_FOUND_MESSAGE[model]);
  return delegateFor(prisma, model).update({ where: { id }, data });
}
