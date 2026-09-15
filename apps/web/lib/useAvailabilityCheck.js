'use client'

import { useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 500

/** Hits the thin `/api/auth/check-availability` proxy (see app/api/auth/check-availability/route.js),
 * which forwards to services/api's public GET /api/auth/check-availability. */
export async function checkAvailability(params) {
  const query = new URLSearchParams(params)
  const res = await fetch(`/api/auth/check-availability?${query.toString()}`)
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.error) || 'Something went wrong.')
  return data || {}
}

/**
 * Debounced "is this already taken" check for a single registration field — fires ~500ms after
 * the value settles, and only while `enabled` (pass the field's own format validity, so a
 * half-typed email/phone never triggers a request). Ignores stale responses if the value changes
 * again before a request resolves. Mirrors apps/mobile/src/hooks/useAvailabilityCheck.ts.
 */
export function useAvailabilityCheck(kind, value, enabled) {
  const [checking, setChecking] = useState(false)
  const [taken, setTaken] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    if (!enabled || !value) {
      requestIdRef.current += 1
      setChecking(false)
      setTaken(false)
      return
    }

    setChecking(true)
    const id = ++requestIdRef.current
    const timer = setTimeout(async () => {
      try {
        const result = await checkAvailability({ [kind]: value })
        if (requestIdRef.current === id) setTaken(result[kind]?.available === false)
      } catch {
        if (requestIdRef.current === id) setTaken(false)
      } finally {
        if (requestIdRef.current === id) setChecking(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [kind, value, enabled])

  return { checking, taken }
}
