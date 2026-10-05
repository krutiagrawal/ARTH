import { z } from 'zod';

// For treeObservation.service.ts's logCommunityObservation. lat/lng/accuracy/mocked mirror
// trees.schema.ts's plantTreeSchema (same anti-cheat fields, same reasons — both required so a
// raw API call can't skip the mock/accuracy checks by omitting them).
export const logCommunityObservationSchema = z.object({
  targetKind: z.enum(['tree', 'planted-tree']),
  targetId: z.string().uuid(),
  status: z.enum(['healthy', 'struggling', 'dead', 'removed']),
  note: z.string().max(1000).optional(),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  accuracy: z.coerce.number().nonnegative(),
  mocked: z.enum(['true', 'false']).transform((v) => v === 'true'),
});
