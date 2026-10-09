import { LESSONS_1 } from './dailyLessons1';
import { LESSONS_2 } from './dailyLessons2';
import { LESSONS_3 } from './dailyLessons3';
import { EXTRAS_1 } from './lessonExtras1';
import { EXTRAS_2 } from './lessonExtras2';
import { EXTRAS_3 } from './lessonExtras3';
import { LESSON_ACTIONS } from './lessonActions';
import { LONG_A } from './longLessonsA';
import { LONG_B } from './longLessonsB';
import { LONG_C } from './longLessonsC';
import { LONG_D } from './longLessonsD';
import { LONG_E } from './longLessonsE';
import { s } from './lessonHelpers';
import type { SeedLesson } from './lessonHelpers';

const EXTRAS = { ...EXTRAS_1, ...EXTRAS_2, ...EXTRAS_3 };

// Comfortable reading speed for an article you want to absorb.
const WORDS_PER_MINUTE = 200;

// Full-length (Substack-style) articles with photos. These replace the short version of the same key.
const LONG: Record<string, SeedLesson> = Object.fromEntries([...LONG_A, ...LONG_B, ...LONG_C, ...LONG_D, ...LONG_E].map((l) => [l.key, l]));

const wordCount = (sections: { body: string }[]) => sections.reduce((total, sec) => total + sec.body.split(/\s+/).length, 0);
const minutes = (sections: { body: string }[]) => Math.max(2, Math.round(wordCount(sections) / WORDS_PER_MINUTE));

// 30 launch lessons, in the order they cycle (sortOrder = position).
//   - Lessons with a full-length article (LONG) use it as written.
//   - The rest are shorter: core explanation + two deeper sections + a closing "Try this today".
//     They are the next ones to be expanded; add new lessons from the admin catalog rather than here.
export const DAILY_LESSONS: SeedLesson[] = [...LESSONS_1, ...LESSONS_2, ...LESSONS_3].map((lesson) => {
  const long = LONG[lesson.key];
  // The full article keeps the original, shorter headline: it reads better than a long subtitle.
  if (long) return { ...long, title: lesson.title, readMinutes: minutes(long.sections) };

  const extras = EXTRAS[lesson.key];
  const action = LESSON_ACTIONS[lesson.key];
  if (!extras || extras.length !== 2) throw new Error(`Lesson ${lesson.key} needs exactly 2 extra sections`);
  if (!action) throw new Error(`Missing "Try this today" text for lesson ${lesson.key}`);
  const sections = [...lesson.sections, ...extras, s('Try this today', action)];
  return { ...lesson, readMinutes: minutes(sections), sections };
});

export const LONG_LESSON_KEYS = Object.keys(LONG);
