import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  deviceInfo: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceInfo: z.string().max(200).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const registerNgoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  orgName: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  website: z.string().url().max(300).optional(),
  contactPhone: z.string().max(30).optional(),
  deviceInfo: z.string().max(200).optional(),
});
