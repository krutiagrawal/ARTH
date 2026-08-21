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
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
