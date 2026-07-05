import { z } from 'zod';

export const createFriendRequestSchema = z.object({
  addresseeId: z.string().uuid(),
});
