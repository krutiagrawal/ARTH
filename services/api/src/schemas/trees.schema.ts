import { z } from 'zod';

export const plantTreeSchema = z.object({
  speciesId: z.string().uuid(),
  nickname: z.string().min(1).max(60),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  locationLabel: z.string().max(200).optional(),
  // The post caption shown alongside the planting on the planter's profile feed.
  caption: z.string().max(2200).optional(),
  accuracy: z.coerce.number().nonnegative().optional(),
  // Not z.coerce.boolean() — that treats any non-empty string, including "false", as truthy.
  // This also conveniently defaults a missing field to plain `false` via the transform.
  mocked: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
});

export const updateTreeSchema = z.object({
  nickname: z.string().min(1).max(60).optional(),
});
