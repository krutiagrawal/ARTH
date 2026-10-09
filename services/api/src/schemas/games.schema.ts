import { z } from 'zod';

export const gameKeySchema = z.enum([
  'guess_tree',
  'grove_word',
  'eco_quiz',
  'grow_order',
  'species_scramble',
  'eco_connections',
  'missing_letters',
  'seed_memory',
  'waste_sort',
  'true_or_myth',
  'shadow_tree',
  'spot_difference',
  'co2_duel',
  'plant_grid',
  'daily_lesson',
]);

// A guess is a single string (a tree key, a word) or a list (4 board words, 16 grid cells).
export const guessSchema = z.object({
  guess: z.union([
    z.string().min(1).max(40),
    z.array(z.union([z.string().min(1).max(40), z.number().int().min(0).max(100)])).min(1).max(32),
  ]),
});

// Each game validates the fields it uses; this only bounds the shape and size of the body.
export const submitGameSchema = z
  .object({
    answers: z.array(z.number().int().min(0).max(10)).max(12),
    order: z.array(z.string().min(1).max(80)).max(10),
    words: z.array(z.string().min(1).max(20)).max(10),
    cells: z.array(z.number().int().min(0).max(100)).max(30),
    moves: z.number().int().min(0).max(1000),
    seconds: z.number().int().min(0).max(100_000),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing submitted' });
