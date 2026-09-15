import { useState } from 'react';
import { isValidEmail } from '../utils/validation';
import { useAvailabilityCheck } from './useAvailabilityCheck';

/**
 * Bundles the repeated email-field pattern used across every signup form: format validation,
 * "touched" gating so errors don't flash before the user finishes typing, and a debounced
 * real-time "already registered" check once the format is valid.
 */
export function useEmailField(initial = '') {
  const [value, setValue] = useState(initial);
  const [touched, setTouched] = useState(false);
  const valid = isValidEmail(value);
  const { checking, taken } = useAvailabilityCheck('email', value.trim().toLowerCase(), valid);

  const error = touched && value.trim() && !valid
    ? 'Enter a valid email address'
    : taken
      ? 'This email is already registered'
      : null;

  return { value, setValue, touched, setTouched, valid, checking, taken, error, isOk: valid && !taken };
}
