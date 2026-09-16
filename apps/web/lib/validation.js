// Shared field-format validators, mirroring apps/mobile/src/utils/validation.ts so "is this a
// real email/phone/pincode/website" is checked the same way on every ARTH client.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value) {
  return EMAIL_REGEX.test((value || '').trim())
}

/** Bare 10-digit Indian mobile number — the +91 is a fixed UI prefix, never part of this value. */
const PHONE_REGEX = /^[6-9]\d{9}$/

export function isValidPhone(value) {
  return PHONE_REGEX.test(value || '')
}

/** Strips everything but digits and caps at 10 — feed every keystroke through this before storing
 * it in state, so the field can never even hold more than a bare 10-digit number. */
export function sanitizePhoneDigits(value) {
  return (value || '').replace(/\D/g, '').slice(0, 10)
}

export function isValidPincode(value) {
  return /^\d{6}$/.test((value || '').trim())
}

/** Strips everything but digits and caps at 6, for pincode inputs. */
export function sanitizePincodeDigits(value) {
  return (value || '').replace(/\D/g, '').slice(0, 6)
}

export function isValidWebsite(value) {
  const trimmed = (value || '').trim()
  if (!trimmed) return false
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    return /\.[a-z]{2,}$/i.test(url.hostname)
  } catch {
    return false
  }
}

/** Loose GSTIN format check (not authoritative) — mirrors apps/mobile/src/utils/validation.ts.
 * The backend doesn't enforce this format, so this is only used for a friendly inline hint. */
const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export function isValidGstin(value) {
  return GSTIN_REGEX.test((value || '').trim().toUpperCase())
}
