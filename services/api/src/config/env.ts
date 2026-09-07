import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  PORT: z.coerce.number().default(4000),
  UPLOAD_DIR: z.string().default('./uploads'),
  CORS_ORIGIN: z.string().default('*'),
  OWM_API_KEY: z.string().min(1),
  // Optional so the whole API doesn't fail to boot before Stripe is configured —
  // donation endpoints throw a clear 503 instead (see lib/stripe.ts).
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Expo push delivery. Off by default: push doesn't work in Expo Go on iOS (removed in SDK 53),
  // so local development runs on the in-app notification centre alone. Notification rows are
  // written either way — this only controls whether a device push is also attempted.
  EXPO_PUSH_ENABLED: z.enum(['true', 'false']).default('false'),
  // Password reset emails (Resend). Leave unset in dev and reset links are logged to the
  // console instead of sent — see services/email.service.ts.
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('PLANT <hello@plant.example.org>'),
  // Base URL of the web app, used to build the password-reset link sent by email.
  WEB_URL: z.string().default('http://localhost:3000'),
  // Gemini (https://aistudio.google.com/apikey) — powers AI verification of tree-planting
  // photos. Leave unset in dev and aiVerification.service.ts skips the check (photo passes
  // through unverified) instead of blocking planting — see services/aiVerification.service.ts.
  GEMINI_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
