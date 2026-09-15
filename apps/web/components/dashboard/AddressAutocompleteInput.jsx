'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin } from 'lucide-react'
import { fieldInputClassName, fieldTextareaClassName } from './DrawerFormShell'
import { cn } from '@/lib/utils'

const MIN_QUERY_LENGTH = 3
const DEBOUNCE_MS = 350

/**
 * A plain address input with Nominatim (OpenStreetMap) search-as-you-type suggestions, so typing
 * a real address doesn't require getting every line right by hand. Search runs through our own
 * backend (`/geocode/search`, called via whichever role's `proxy` the caller passes in), which
 * holds the required Nominatim User-Agent header and request throttling — this component never
 * calls Nominatim directly.
 */
export default function AddressAutocompleteInput({
  value,
  onChange,
  onSelectSuggestion,
  proxy,
  placeholder,
  multiline = false,
  rows = 2,
  className,
}) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [focused, setFocused] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const query = (value ?? '').trim()
    if (!focused || query.length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    const id = ++requestIdRef.current
    const timer = setTimeout(async () => {
      try {
        const results = await proxy(`/geocode/search?q=${encodeURIComponent(query)}`)
        if (requestIdRef.current === id) setSuggestions(results ?? [])
      } catch {
        if (requestIdRef.current === id) setSuggestions([])
      } finally {
        if (requestIdRef.current === id) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, focused])

  const handleSelect = (suggestion) => {
    requestIdRef.current += 1 // invalidate any in-flight search so its response can't reopen the list
    setSuggestions([])
    onChange(suggestion.label)
    onSelectSuggestion?.(suggestion)
  }

  const Field = multiline ? 'textarea' : 'input'

  return (
    <div className="relative">
      <Field
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        // A click on a suggestion fires after this blur — delay hiding the list long enough for
        // that click to land, or the list would vanish out from under the click first.
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        placeholder={placeholder}
        rows={multiline ? rows : undefined}
        className={cn(multiline ? fieldTextareaClassName : fieldInputClassName, className)}
      />

      {loading && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">…</span>
      )}

      {focused && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-[8px] border border-border/70 bg-background">
          {suggestions.map((s, i) => (
            <button
              key={`${s.lat},${s.lng}`}
              type="button"
              onClick={() => handleSelect(s)}
              className={cn(
                'flex w-full items-start gap-1.5 px-2.5 py-2 text-left text-[12.5px] leading-snug hover:bg-accent',
                i > 0 && 'border-t border-border/50',
              )}
            >
              <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
