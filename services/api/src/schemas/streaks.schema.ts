import { z } from 'zod';

export const reviveStreakSchema = z.object({
  method: z.enum(['freeze', 'xp']),
});

export const protectStreakSchema = z.object({
  method: z.enum(['plant', 'freeze', 'xp']),
});
