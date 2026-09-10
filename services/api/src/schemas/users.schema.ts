import { z } from 'zod';

export const updateMeSchema = z.object({
  name: z.string().min(1).max(60).optional(),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  avatarEmoji: z.string().min(1).max(8).optional(),
  bio: z.string().max(160).nullable().optional(),
});

export const updateSettingsSchema = z.object({
  haptics: z.boolean().optional(),
  notifications: z.boolean().optional(),
  ambientMode: z.boolean().optional(),
  sounds: z.boolean().optional(),
  darkMode: z.boolean().optional(),
  streakReminders: z.boolean().optional(),
  locationTracking: z.boolean().optional(),
  publicProfile: z.boolean().optional(),
  analyticsEnabled: z.boolean().optional(),
  pinnedTimeTheme: z
    .enum(['dawn', 'morning', 'afternoon', 'goldenHour', 'sunset', 'blueHour', 'night', 'lateNight'])
    .nullable()
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
  deviceInfo: z.string().max(200).optional(),
});
