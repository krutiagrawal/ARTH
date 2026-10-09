import { Prisma, PrismaClient } from '@arth/db';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { lessonImageSchema, lessonQuizSchema, lessonSectionsSchema } from '../games/lessonSchema';

// Every catalog route (species/achievements/challenges/missions/themes/decorations)
// was GET-only before this — the only writer was packages/db/prisma/seed.ts. This
// gives admin the same create/update capability at runtime, keyed off the same
// Prisma delegate names seed.ts already upserts against.
export type CatalogModel = 'species' | 'achievements' | 'challenges' | 'missions' | 'themes' | 'decorations' | 'lessons';

const DELEGATE: Record<CatalogModel, string> = {
  species: 'treeSpecies',
  achievements: 'achievement',
  challenges: 'challenge',
  missions: 'dailyMission',
  themes: 'forestTheme',
  decorations: 'decorationType',
  lessons: 'dailyLesson',
};

const NOT_FOUND_MESSAGE: Record<CatalogModel, string> = {
  species: 'Tree species not found',
  achievements: 'Achievement not found',
  challenges: 'Challenge not found',
  missions: 'Daily mission not found',
  themes: 'Forest theme not found',
  decorations: 'Decoration type not found',
  lessons: 'Lesson not found',
};

const ORDER_BY: Record<CatalogModel, Record<string, 'asc' | 'desc'>> = {
  species: { sortOrder: 'asc' },
  achievements: { sortOrder: 'asc' },
  challenges: { startsAt: 'desc' },
  missions: { title: 'asc' },
  themes: { sortOrder: 'asc' },
  decorations: { sortOrder: 'asc' },
  lessons: { sortOrder: 'asc' },
};

// Only these four models have an isActive field — Achievement/DecorationType
// don't, so deactivating them isn't offered (they're referenced by already-
// unlocked user rows either way, same reasoning as the others).
export const DEACTIVATABLE_MODELS: CatalogModel[] = ['species', 'challenges', 'missions', 'themes', 'lessons'];

function delegateFor(prisma: PrismaClient, model: CatalogModel) {
  return (prisma as unknown as Record<string, any>)[DELEGATE[model]];
}

export async function listCatalogItems(prisma: PrismaClient, model: CatalogModel) {
  return delegateFor(prisma, model).findMany({ orderBy: ORDER_BY[model] });
}

const LESSON_TAGS = ['Waste', 'Water', 'Energy', 'Food', 'Air', 'Climate', 'Community', 'Lifestyle', 'Nature', 'Travel'];
const LESSON_TEXT_LIMITS: Record<string, number> = { key: 60, title: 100, emoji: 8, tag: 30, summary: 240, takeaway: 280, sourceNote: 300 };

/**
 * Lessons are shown to every user, so unlike the other catalog models they are whitelisted and
 * validated on write: a malformed quiz or section list is rejected here with a readable message
 * instead of reaching the app.
 */
function prepareLessonData(data: Record<string, unknown>, isCreate: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [field, limit] of Object.entries(LESSON_TEXT_LIMITS)) {
    if (!(field in data)) continue;
    const raw = data[field];
    if (raw === null || raw === '') {
      if (field === 'takeaway' || field === 'sourceNote') {
        out[field] = null;
        continue;
      }
      throw new BadRequestError(`${field} cannot be empty`);
    }
    if (typeof raw !== 'string') throw new BadRequestError(`${field} must be text`);
    const value = raw.trim();
    if (!value || value.length > limit) throw new BadRequestError(`${field} must be 1-${limit} characters`);
    out[field] = value;
  }

  if (typeof out.key === 'string' && !/^[a-z0-9_]+$/.test(out.key)) {
    throw new BadRequestError('key may only contain lowercase letters, digits and underscores');
  }
  if (typeof out.tag === 'string' && !LESSON_TAGS.includes(out.tag)) {
    throw new BadRequestError(`tag must be one of: ${LESSON_TAGS.join(', ')}`);
  }

  if ('sections' in data) {
    const parsed = lessonSectionsSchema.safeParse(data.sections);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = typeof issue?.path[0] === 'number' ? ` (section ${issue.path[0] + 1})` : '';
      throw new BadRequestError(`sections${where}: ${issue?.message ?? 'invalid'}`);
    }
    out.sections = parsed.data;
  }
  if ('heroImage' in data) {
    if (data.heroImage === null || data.heroImage === '') {
      out.heroImage = Prisma.DbNull;
    } else {
      const parsed = lessonImageSchema.safeParse(data.heroImage);
      if (!parsed.success) throw new BadRequestError(`heroImage: ${parsed.error.issues[0]?.message ?? 'invalid'}`);
      out.heroImage = parsed.data;
    }
  }
  if ('quiz' in data) {
    const parsed = lessonQuizSchema.safeParse(data.quiz);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = typeof issue?.path[0] === 'number' ? ` (question ${issue.path[0] + 1})` : '';
      throw new BadRequestError(`quiz${where}: ${issue?.message ?? 'invalid'}`);
    }
    out.quiz = parsed.data;
  }

  for (const field of ['readMinutes', 'sortOrder'] as const) {
    if (!(field in data) || data[field] === null || data[field] === '') continue;
    const n = Number(data[field]);
    const max = field === 'readMinutes' ? 30 : 100000;
    if (!Number.isInteger(n) || n < (field === 'readMinutes' ? 1 : 0) || n > max) throw new BadRequestError(`${field} is out of range`);
    out[field] = n;
  }
  if ('isActive' in data) out.isActive = Boolean(data.isActive);

  if ('publishOn' in data) {
    if (data.publishOn === null || data.publishOn === '') {
      out.publishOn = null;
    } else {
      const d = new Date(String(data.publishOn));
      if (Number.isNaN(d.getTime())) throw new BadRequestError('publishOn is not a valid date');
      out.publishOn = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
  }

  if (isCreate) {
    for (const required of ['key', 'title', 'emoji', 'tag', 'summary', 'sections', 'quiz']) {
      if (out[required] === undefined) throw new BadRequestError(`${required} is required`);
    }
  }
  return out;
}

export async function createCatalogItem(prisma: PrismaClient, model: CatalogModel, data: Record<string, unknown>) {
  if (model === 'lessons') data = prepareLessonData(data, true);
  return delegateFor(prisma, model).create({ data });
}

export async function updateCatalogItem(
  prisma: PrismaClient,
  model: CatalogModel,
  id: string,
  data: Record<string, unknown>,
) {
  if (model === 'lessons') data = prepareLessonData(data, false);
  const existing = await delegateFor(prisma, model).findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(NOT_FOUND_MESSAGE[model]);
  return delegateFor(prisma, model).update({ where: { id }, data });
}
