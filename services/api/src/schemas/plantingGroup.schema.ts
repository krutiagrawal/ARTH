import { z } from 'zod';

const handleSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores');

const GROUP_TYPES = ['family', 'friends', 'school', 'college', 'club', 'neighbourhood', 'workplace', 'other'] as const;

export const groupIdParamSchema = z.object({ id: z.string().uuid() });
export const groupMemberParamSchema = z.object({ id: z.string().uuid(), userId: z.string().uuid() });
export const groupRequestParamSchema = z.object({ id: z.string().uuid(), requestId: z.string().uuid() });
export const requestIdParamSchema = z.object({ requestId: z.string().uuid() });

export const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(60),
  handle: handleSchema,
  groupType: z.enum(GROUP_TYPES).default('other'),
  description: z.string().trim().min(1).max(500),
  // Must be a launched city (checked against the cities table by the service).
  city: z.string().trim().min(1).max(80),
});

// The handle is fixed once created, so it is deliberately not editable here.
export const updateGroupSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  groupType: z.enum(GROUP_TYPES).optional(),
  description: z.string().trim().min(1).max(500).optional(),
  city: z.string().trim().min(1).max(80).optional(),
});

export const discoverGroupsQuerySchema = z.object({
  q: z.string().trim().min(2).max(60),
});

export const inviteSchema = z.object({
  handle: handleSchema,
});

export const setRoleSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export const challengeParamSchema = z.object({ id: z.string().uuid(), challengeId: z.string().uuid() });

export const createChallengeSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().min(1).max(300),
  goalTotal: z.coerce.number().int().min(1).max(100_000),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});

export const themeParamSchema = z.object({ id: z.string().uuid(), themeId: z.string().uuid() });

export const membershipSchema = z.object({ shareActivity: z.boolean() });

export const analyticsQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(26).optional(),
});
