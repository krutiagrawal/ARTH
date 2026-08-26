import { z } from 'zod';

export const updateGroupProfileSchema = z.object({
  groupName: z.string().min(1).max(120).optional(),
  groupType: z.enum(['family', 'school', 'club', 'other']).optional(),
  description: z.string().min(1).max(2000).optional(),
  logoUrl: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  avatarEmoji: z.string().min(1).max(8).optional(),
});

export const setMemberRoleSchema = z.object({
  role: z.enum(['owner', 'co_admin', 'member']),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(4).max(20),
});

export const createGroupChallengeSchema = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().min(1).max(2000),
    goalType: z.enum(['trees_planted_count', 'cities_count', 'streak_days', 'rare_species_count']),
    goalTotal: z.coerce.number().int().min(1).max(1_000_000),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
  })
  .refine((data) => data.endsAt > data.startsAt, { message: 'endsAt must be after startsAt', path: ['endsAt'] });
