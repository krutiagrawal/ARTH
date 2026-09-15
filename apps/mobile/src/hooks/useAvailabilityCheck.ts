import { useEffect, useRef, useState } from 'react';
import { checkAvailability } from '../api/auth';

type FieldKind = 'email' | 'phone' | 'handle';

const DEBOUNCE_MS = 500;

/**
 * Debounced "is this already taken" check for a single registration field — fires ~500ms after
 * the value settles, and only while `enabled` (pass the field's own format validity, so a
 * half-typed email/phone never triggers a request). Ignores stale responses if the value changes
 * again before a request resolves, same request-id-ref pattern as AddressSearchField's search.
 */
export function useAvailabilityCheck(kind: FieldKind, value: string, enabled: boolean) {
  const [checking, setChecking] = useState(false);
  const [taken, setTaken] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled || !value) {
      requestIdRef.current += 1;
      setChecking(false);
      setTaken(false);
      return;
    }

    setChecking(true);
    const id = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const params: { email?: string; phone?: string; handle?: string } = {};
        params[kind] = value;
        const result = await checkAvailability(params);
        if (requestIdRef.current === id) setTaken(result[kind]?.available === false);
      } catch {
        if (requestIdRef.current === id) setTaken(false);
      } finally {
        if (requestIdRef.current === id) setChecking(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [kind, value, enabled]);

  return { checking, taken };
}
