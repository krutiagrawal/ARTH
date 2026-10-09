import { DailyLesson, Prisma } from '@arth/db';
import { BadRequestError } from '../utils/errors';
import { startOfUtcDay } from '../services/streak.service';
import { SubmitGame, PlayView } from './types';
import { dayNumber } from './util';
import { LESSON_QUIZ_LENGTH, lessonImageSchema, lessonQuizSchema, lessonSectionsSchema, LessonImage, LessonQuestion, LessonSection } from './lessonSchema';

const BASE_XP = 10;
const XP_PER_CORRECT = 5;

/**
 * Today's lesson. Returns the stored pick if the day already has one, so every user sees the same
 * lesson all day even if admins add, remove or deactivate lessons in the meantime. Otherwise picks
 * (1) an active lesson pinned to this date, else (2) the next unpinned active lesson in sortOrder
 * (cycling with the day number), and records the pick. Null when no lesson is available.
 */
export async function pickLessonForDate(tx: Prisma.TransactionClient, date: Date): Promise<DailyLesson | null> {
  const day = startOfUtcDay(date);

  const existing = await tx.dailyLessonPick.findUnique({ where: { playDate: day }, include: { lesson: true } });
  if (existing) return existing.lesson;

  let lesson = await tx.dailyLesson.findFirst({ where: { isActive: true, publishOn: day }, orderBy: { sortOrder: 'asc' } });
  if (!lesson) {
    const pool = await tx.dailyLesson.findMany({
      where: { isActive: true, publishOn: null },
      orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
      select: { id: true },
    });
    if (pool.length === 0) return null;
    lesson = await tx.dailyLesson.findUniqueOrThrow({ where: { id: pool[dayNumber(day) % pool.length].id } });
  }

  // Concurrent first requests all try to insert; the unique date makes exactly one win.
  await tx.dailyLessonPick.createMany({ data: [{ playDate: day, lessonId: lesson.id }], skipDuplicates: true });
  const pick = await tx.dailyLessonPick.findUniqueOrThrow({ where: { playDate: day }, include: { lesson: true } });
  return pick.lesson;
}

interface ParsedLesson {
  row: DailyLesson;
  sections: LessonSection[];
  quiz: LessonQuestion[];
  /** Null when the lesson has no (valid) hero image; a bad image never hides the lesson. */
  heroImage: LessonImage | null;
}

/** Re-validates a stored lesson; a malformed row is treated as "no lesson" instead of crashing. */
function parseLesson(row: DailyLesson | null | undefined): ParsedLesson | null {
  if (!row) return null;
  const sections = lessonSectionsSchema.safeParse(row.sections);
  const quiz = lessonQuizSchema.safeParse(row.quiz);
  if (!sections.success || !quiz.success) return null;
  const hero = row.heroImage == null ? null : lessonImageSchema.safeParse(row.heroImage);
  return { row, sections: sections.data, quiz: quiz.data, heroImage: hero?.success ? hero.data : null };
}

type Ctx = { lesson: ParsedLesson | null };
type StoredPlay = { lessonId: string; answers: number[]; quiz?: LessonQuestion[] };

export const dailyLesson: SubmitGame = {
  kind: 'submit',
  meta: {
    key: 'daily_lesson',
    title: 'Daily Lesson',
    description: 'Learn something new about the planet, then take a quick quiz',
    icon: '📘',
    category: 'learn',
    xp: { base: BASE_XP, winBonus: 0, perCorrect: XP_PER_CORRECT },
    maxXp: BASE_XP + XP_PER_CORRECT * LESSON_QUIZ_LENGTH,
  },
  maxAttempts: 1,

  async load(tx, date, play: PlayView | null): Promise<Ctx> {
    // A finished play reloads the exact lesson it was played against, even if admins edited or
    // deactivated it since, or a different lesson is today's pick.
    const stored = play?.guesses?.[0] as { lessonId?: string } | undefined;
    if (stored?.lessonId) {
      const played = parseLesson(await tx.dailyLesson.findUnique({ where: { id: stored.lessonId } }));
      if (played) return { lesson: played };
    }
    return { lesson: parseLesson(await pickLessonForDate(tx, date)) };
  },

  describe(ctx) {
    return (ctx as Ctx | undefined)?.lesson?.row.title ?? null;
  },

  state(_date, play, ctx) {
    const lesson = (ctx as Ctx | undefined)?.lesson ?? null;
    if (!lesson) return { lesson: null, puzzle: { rounds: [] }, result: null };

    const { row, sections } = lesson;
    const submitted = play?.finished ? (play.guesses[0] as StoredPlay | undefined) : undefined;
    // A finished play shows the quiz exactly as it was played, even if an admin has edited the
    // lesson since (the article text may update; the questions and answers do not).
    const quiz = submitted?.quiz ?? lesson.quiz;
    return {
      lesson: {
        key: row.key,
        title: row.title,
        emoji: row.emoji,
        tag: row.tag,
        summary: row.summary,
        readMinutes: row.readMinutes,
        sections,
        heroImage: lesson.heroImage,
        takeaway: row.takeaway,
        sourceNote: row.sourceNote,
      },
      puzzle: { rounds: quiz.map((q) => ({ prompt: q.q, options: q.options, visual: null })) },
      result: submitted
        ? {
            correctCount: submitted.answers.filter((a, i) => a === quiz[i]?.answer).length,
            total: quiz.length,
            review: quiz.map((q, i) => ({ correct: q.answer, chosen: submitted.answers[i] ?? -1, explanation: q.explanation })),
          }
        : null,
    };
  },

  submit(_date, payload, ctx) {
    const lesson = (ctx as Ctx | undefined)?.lesson;
    if (!lesson) throw new BadRequestError('There is no lesson available today');

    const answers = payload.answers;
    if (!answers || answers.length !== lesson.quiz.length) throw new BadRequestError(`Answer all ${lesson.quiz.length} questions`);
    if (answers.some((a, i) => !Number.isInteger(a) || a < 0 || a >= lesson.quiz[i].options.length)) {
      throw new BadRequestError('Invalid answer');
    }

    const correct = answers.filter((a, i) => a === lesson.quiz[i].answer).length;
    return {
      status: 'completed',
      xp: BASE_XP + XP_PER_CORRECT * correct,
      stored: { lessonId: lesson.row.id, answers, quiz: lesson.quiz } satisfies StoredPlay,
    };
  },
};

