'use client'

import { isValidPhone } from './validation'
import { useAvailabilityCheck } from './useAvailabilityCheck'

/**
 * Bundles the repeated phone-field validation pattern: format check (bare 10-digit, enforced by
 * PhoneInput's own digit-sanitizing), "touched" gating, and a debounced real-time "already
 * registered" check once 10 digits have been entered. Mirrors
 * apps/mobile/src/hooks/usePhoneField.ts. `required` only changes what `error` says about an
 * empty value — the field itself is always optional at the type level.
 *
 * Pass `checkAvailability: false` for fields that edit an existing NgoProfile/NurseryProfile
 * business-contact number rather than the User.phone identity field (settings/staff forms) —
 * duplicate-phone enforcement only applies at registration time.
 */
export function usePhoneField(value, touched, { required = false, checkAvailability = true } = {}) {
  const valid = isValidPhone(value)
  const { checking, taken } = useAvailabilityCheck('phone', value, valid && checkAvailability)

  const error = touched && value && !valid
    ? 'Enter a valid 10-digit mobile number'
    : checkAvailability && taken
      ? 'This phone number is already registered'
      : touched && required && !value
        ? 'Enter a phone number'
        : null

  return {
    valid,
    checking: checkAvailability && checking,
    taken: checkAvailability && taken,
    error,
    isOk: (!required && !value) || (valid && (!checkAvailability || !taken)),
  }
}
