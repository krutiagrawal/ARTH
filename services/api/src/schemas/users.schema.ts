import { z } from 'zod';

// Same character rules as the Edit Profile form, so the API rejects what the form already blocks.
const personName = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(60)
  .regex(/^\p{L}[\p{L}\p{M} .'’-]*$/u, 'Name can only contain letters, spaces, . - and apostrophes');
const cityName = z
  .string()
  .trim()
  .min(2, 'City must be at least 2 characters')
  .max(100)
  .regex(/^\p{L}[\p{L}\p{M} .,'’-]*$/u, 'City can only contain letters, spaces, commas, . - and apostrophes');

export const updateMeSchema = z.object({
  name: personName.optional(),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  avatarEmoji: z.string().min(1).max(8).optional(),
  bio: z.string().max(160).nullable().optional(),
  city: cityName.nullable().optional(),
});

// Fields collected on the optional, skippable "personalize your experience" step shown
// right after Individual signup. Every field is optional since the step can be skipped —
// the route always stamps personalizationCompletedAt so the step isn't shown again.
export const personalizeSchema = z.object({
  city: z.string().min(1).max(100).optional(),
  plantingSpace: z.array(z.enum(['balcony', 'terrace', 'garden', 'farmland', 'city_outskirts', 'open_land', 'none'])).optional(),
  gardeningExperience: z.enum(['beginner', 'intermediate', 'experienced']).optional(),
  motivation: z.array(z.enum(['home_gardening', 'environmental_cause', 'school_or_csr_project', 'hobby', 'other'])).optional(),
  dateOfBirth: z.coerce.date().optional(),
  speciesInterest: z.array(z.enum(['fruit', 'flowering', 'shade', 'medicinal', 'native'])).optional(),
  homeSunlight: z.enum(['full_sun', 'partial_shade', 'shade']).optional(),
  plantingGoal: z.coerce.number().int().min(1).max(10000).optional(),
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
  showCity: z.boolean().optional(),
  showStats: z.boolean().optional(),
  showInterests: z.boolean().optional(),
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
