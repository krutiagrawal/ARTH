// Shared field-format validators, used across every signup/edit form in the app so "is this a
// real email/phone/etc." is checked the same way everywhere instead of ad hoc per screen.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/** Bare 10-digit Indian mobile number — the +91 is a fixed UI prefix, never part of this value. */
const PHONE_REGEX = /^[6-9]\d{9}$/;

export function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(value);
}

/** Strips everything but digits and caps at 10 — feed every keystroke through this before storing
 * it in state, so the field can never even display more than a bare 10-digit number. */
export function sanitizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

export function isValidPincode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function isValidGstin(value: string): boolean {
  return GSTIN_REGEX.test(value.trim().toUpperCase());
}

export function isValidWebsite(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return /\.[a-z]{2,}$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8;
}
