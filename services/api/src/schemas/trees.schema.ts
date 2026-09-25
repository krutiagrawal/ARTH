import { z } from 'zod';

export const plantTreeSchema = z.object({
  speciesId: z.string().uuid(),
  nickname: z.string().min(1).max(60),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  locationLabel: z.string().max(200).optional(),
  // The post caption shown alongside the planting on the planter's profile feed.
  caption: z.string().max(2200).optional(),
  // Both required — a submission that omits either used to be silently trusted (accuracy
  // treated as "unknown, allow", mocked defaulted to false), which let a raw API call skip the
  // anti-cheat check entirely. The app always has both by the time it submits (a fresh
  // high-accuracy GPS read is taken right before submit — see PlantTreeScreen.tsx).
  accuracy: z.coerce.number().nonnegative(),
  // Not z.coerce.boolean() — that treats any non-empty string, including "false", as truthy.
  mocked: z.enum(['true', 'false']).transform((v) => v === 'true'),
});

export const updateTreeSchema = z.object({
  nickname: z.string().min(1).max(60).optional(),
});
