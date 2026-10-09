import type { Prisma, PrismaClient } from '@prisma/client';
import { DAILY_LESSONS } from './dailyLessons';

// Inserts any launch lesson that does not exist yet. `update: {}` is deliberate: re-running the seed
// must never overwrite a lesson an admin has since edited, only add missing ones.
export async function seedDailyLessons(prisma: PrismaClient) {
  let created = 0;
  for (const [i, lesson] of DAILY_LESSONS.entries()) {
    const existing = await prisma.dailyLesson.findUnique({ where: { key: lesson.key }, select: { id: true } });
    if (existing) continue;
    const { heroImage, sections, quiz, ...rest } = lesson;
    await prisma.dailyLesson.create({
      data: {
        ...rest,
        sections: sections as unknown as Prisma.InputJsonValue,
        quiz: quiz as unknown as Prisma.InputJsonValue,
        ...(heroImage ? { heroImage: heroImage as unknown as Prisma.InputJsonValue } : {}),
        sortOrder: i + 1,
      },
    });
    created += 1;
  }
  return created;
}
