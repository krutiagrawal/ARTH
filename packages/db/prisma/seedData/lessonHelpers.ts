// Helpers for writing the seeded daily lessons compactly. The runtime validator for this shape is
// services/api/src/games/lessonSchema.ts (the admin catalog rejects anything that doesn't fit).

/** A credited photo; credit and licence are always shown under it in the app. */
export interface SeedImage {
  url: string;
  alt: string;
  caption?: string;
  credit: string;
  sourceUrl?: string;
}

export interface SeedLesson {
  key: string;
  title: string;
  emoji: string;
  tag: 'Waste' | 'Water' | 'Energy' | 'Food' | 'Air' | 'Climate' | 'Community' | 'Lifestyle' | 'Nature' | 'Travel';
  summary: string;
  readMinutes: number;
  heroImage?: SeedImage;
  /** `body` is light markdown (see apps/mobile/src/components/lesson/RichText.tsx). */
  sections: { heading: string; body: string; image?: SeedImage }[];
  takeaway: string;
  quiz: { q: string; options: string[]; answer: number; explanation: string }[];
  sourceNote: string;
}

export const s = (heading: string, body: string) => ({ heading, body });

// The correct option's position rotates (0,1,2,3,0,...) so answers don't cluster in one slot.
let position = 0;
export function q(question: string, correct: string, wrong: [string, string, string], explanation: string) {
  const answer = position++ % 4;
  const options = [...wrong];
  options.splice(answer, 0, correct);
  return { q: question, options, answer, explanation };
}
