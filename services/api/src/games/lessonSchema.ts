import { z } from 'zod';

// The shape of a DailyLesson's JSON columns. Used twice: the admin catalog rejects malformed
// lessons on write, and the game re-validates what it reads so one bad row can never crash the app.

export const LESSON_QUIZ_LENGTH = 5;

// An article image. Credit is required so every photo can show who made it and under what licence.
export const lessonImageSchema = z.object({
  // Either an https link, or a path to a photo the API serves itself (/media/...), which is what
  // the launch lessons use because remote hosts can refuse requests from the mobile app.
  url: z
    .string()
    .trim()
    .max(600)
    .refine(
      (u) => /^\/media\/[A-Za-z0-9_./-]+$/.test(u) || (u.startsWith('https://') && URL.canParse(u)),
      'Image url must be an https link or a /media/ path',
    ),
  alt: z.string().trim().min(1, 'Every image needs alt text').max(240),
  caption: z.string().trim().max(300).optional(),
  credit: z.string().trim().min(1, 'Every image needs a credit line').max(300),
  sourceUrl: z.string().trim().url().max(600).optional(),
});

/**
 * Sections are long-form article parts. `body` is light markdown (see the mobile RichText renderer):
 * blank-line separated paragraphs, "- " bullets, "> " pull quotes, and **bold**.
 */
export const lessonSectionSchema = z.object({
  heading: z.string().trim().min(1, 'Every section needs a heading').max(100),
  body: z.string().trim().min(1, 'Every section needs body text').max(6000),
  image: lessonImageSchema.optional(),
});

export const lessonSectionsSchema = z.array(lessonSectionSchema).min(2, 'Add at least 2 sections').max(12, 'Use at most 12 sections');

export const lessonQuestionSchema = z
  .object({
    q: z.string().trim().min(1, 'Every question needs text').max(200),
    options: z.array(z.string().trim().min(1, 'Options cannot be empty').max(120)).length(4, 'Every question needs exactly 4 options'),
    answer: z.number().int().min(0, 'answer must be 0-3').max(3, 'answer must be 0-3'),
    explanation: z.string().trim().min(1, 'Every question needs an explanation').max(300),
  })
  .refine((q) => new Set(q.options.map((o) => o.toLowerCase())).size === q.options.length, {
    message: 'A question has duplicate options',
  });

export const lessonQuizSchema = z.array(lessonQuestionSchema).length(LESSON_QUIZ_LENGTH, `The quiz needs exactly ${LESSON_QUIZ_LENGTH} questions`);

export type LessonSection = z.infer<typeof lessonSectionSchema>;
export type LessonImage = z.infer<typeof lessonImageSchema>;
export type LessonQuestion = z.infer<typeof lessonQuestionSchema>;
