import { z } from 'zod';

/**
 * Bare 10-digit Indian mobile number — the +91 country code is a fixed UI prefix on every client
 * and is never stored, so `User.phone`/`contactPhone` columns hold just the 10 digits. Accepts (and
 * strips) a leading +91/91/0 in case a caller sends the prefix anyway, rather than hard-failing.
 */
function normalizePhone(value: unknown) {
  if (typeof value !== 'string') return value;
  const digits = value.replace(/\D/g, '');
  return digits.replace(/^(0|91)(?=\d{10}$)/, '');
}

export const phoneSchema = z.preprocess(
  normalizePhone,
  z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
);
