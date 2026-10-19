// Shared field-format validators, used across every signup/edit form in the app so "is this a
// real email/phone/etc." is checked the same way everywhere instead of ad hoc per screen.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

/** Bare 10-digit Indian mobile number – the +91 is a fixed UI prefix, never part of this value. */
const PHONE_REGEX = /^[6-9]\d{9}$/;

export function isValidPhone(value: string): boolean {
  return PHONE_REGEX.test(value);
}

/** Strips everything but digits and caps at 10 – feed every keystroke through this before storing
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

// Every dot-separated label is 1-63 alphanumeric/hyphen chars (no leading/trailing hyphen), ending in an alphabetic TLD.
const HOSTNAME_RE = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/i;

export function isValidWebsite(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) return false;
  // Only http(s) links - "ftp://", "javascript:" etc. are not websites.
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) return false;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return HOSTNAME_RE.test(url.hostname);
  } catch {
    return false;
  }
}

/** Adds https:// when the user typed a bare domain, so stored links are always openable. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Indian PAN: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F). */
export function isValidPan(value: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value.trim().toUpperCase());
}

/** A four-digit year between `min` and the current year. */
export function isValidYear(value: string, min = 1800): boolean {
  const v = value.trim();
  if (!/^\d{4}$/.test(v)) return false;
  const n = Number(v);
  return n >= min && n <= new Date().getFullYear();
}

export function isNonNegativeInt(value: string): boolean {
  return /^\d{1,9}$/.test(value.trim());
}

/** A whole number from 0 to `max`. */
export function isIntInRange(value: string, max: number): boolean {
  return isNonNegativeInt(value) && Number(value.trim()) <= max;
}

export function isValidPassword(value: string): boolean {
  return value.length >= 8;
}
