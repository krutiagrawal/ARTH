import { z } from 'zod';
import { websiteUrlSchema } from '../utils/websiteUrl';

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

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(72),
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
  website: websiteUrlSchema.optional(),
  contactPhone: z.string().max(30).optional(),
  deviceInfo: z.string().max(200).optional(),
});

export const registerGroupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  groupName: z.string().min(1).max(120),
  groupType: z.enum(['family', 'school', 'club', 'other']).default('other'),
  description: z.string().min(1).max(2000),
  deviceInfo: z.string().max(200).optional(),
});

export const registerNurserySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  nurseryName: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  city: z.string().max(120).optional(),
  contactPhone: z.string().max(30).optional(),
  deviceInfo: z.string().max(200).optional(),
});

export const registerCorporateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(1).max(60),
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/, 'Handle may only contain lowercase letters, numbers, and underscores'),
  companyName: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
  industry: z.string().max(120).optional(),
  city: z.string().max(120).optional(),
  deviceInfo: z.string().max(200).optional(),
});
