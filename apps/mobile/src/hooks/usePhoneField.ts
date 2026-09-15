import { useState } from 'react';
import { isValidPhone } from '../utils/validation';
import { useAvailabilityCheck } from './useAvailabilityCheck';

/**
 * Bundles the repeated phone-field pattern: format validation (bare 10-digit, enforced by
 * PhoneField's own input sanitizing), "touched" gating, and a debounced real-time
 * "already registered" check once 10 digits have been entered. `required` only changes what
 * `error` says about an empty value — the field itself is always optional at the type level so a
 * screen with an optional phone field can reuse this without a false "required" error.
 */
export function usePhoneField(initial = '', required = false) {
  const [value, setValue] = useState(initial);
  const [touched, setTouched] = useState(false);
  const valid = isValidPhone(value);
  const { checking, taken } = useAvailabilityCheck('phone', value, valid);

  const error = touched && value && !valid
    ? 'Enter a valid 10-digit mobile number'
    : taken
      ? 'This phone number is already registered'
      : touched && required && !value
        ? 'Enter a phone number'
        : null;

  return {
    value,
    setValue,
    touched,
    setTouched,
    valid,
    checking,
    taken,
    error,
    isOk: (!required && !value) || (valid && !taken),
  };
}
