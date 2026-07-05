import { z } from 'zod';

const pathPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const createPlacementSchema = z.object({
  decorationTypeId: z.string().uuid(),
  positionX: z.number().min(0).max(1),
  positionY: z.number().min(0).max(1),
  scale: z.number().min(0.3).max(3).optional(),
  rotation: z.number().min(0).max(360).optional(),
  path: z.array(pathPointSchema).min(2).optional(),
});

export const updatePlacementSchema = z
  .object({
    positionX: z.number().min(0).max(1).optional(),
    positionY: z.number().min(0).max(1).optional(),
    scale: z.number().min(0.3).max(3).optional(),
    rotation: z.number().min(0).max(360).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
