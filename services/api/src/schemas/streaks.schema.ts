import { z } from 'zod';

export const protectStreakSchema = z.object({
  method: z.enum(['plant', 'freeze', 'xp']),
});
