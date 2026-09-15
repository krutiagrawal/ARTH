'use client'

import { isValidEmail } from './validation'
import { useAvailabilityCheck } from './useAvailabilityCheck'

/**
 * Bundles the repeated email-field validation pattern used across every signup form: format
 * validation, "touched" gating so errors don't flash before the user finishes typing, and a
 * debounced real-time "already registered" check once the format is valid. Mirrors
 * apps/mobile/src/hooks/useEmailField.ts, but doesn't own the field's value/setter — callers here
 * already keep a single `form` state object, so this just derives status from it.
 *
 * Pass `checkAvailability: false` for fields that edit an existing account's contact info rather
 * than claiming a new identity (none currently need this for email, but kept for parity with
 * usePhoneField).
 */
export function useEmailField(value, touched, { checkAvailability = true } = {}) {
  const valid = isValidEmail(value)
  const { checking, taken } = useAvailabilityCheck('email', value.trim().toLowerCase(), valid && checkAvailability)

  const error = touched && value.trim() && !valid
    ? 'Enter a valid email address'
    : checkAvailability && taken
      ? 'This email is already registered'
      : null

  return { valid, checking: checkAvailability && checking, taken: checkAvailability && taken, error, isOk: valid && (!checkAvailability || !taken) }
}
