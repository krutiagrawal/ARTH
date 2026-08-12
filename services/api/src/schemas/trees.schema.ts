import { z } from 'zod';

export const plantTreeSchema = z.object({
  speciesId: z.string().uuid(),
  nickname: z.string().min(1).max(60),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  locationLabel: z.string().max(200).optional(),
});

export const updateTreeSchema = z.object({
  nickname: z.string().min(1).max(60).optional(),
});
