'use client'

import { sanitizePhoneDigits } from '@/lib/validation'
import { cn } from '@/lib/utils'

/**
 * A `+91`-prefixed, digits-only phone input capped at 10 characters — the country code is a fixed
 * visual prefix, never part of the stored value, so every phone field in the app produces the
 * same bare-10-digit shape regardless of what the user types. Mirrors
 * apps/mobile/src/components/common/PhoneField.tsx. `value`/`onChange` carry just the digits.
 */
export default function PhoneInput({ value, onChange, onBlur, placeholder = '98765 43210', className, id }) {
  return (
    <div className={cn('mt-2 flex h-11 items-center rounded-full border border-border bg-background px-4', className)}>
      <span className="text-sm font-semibold text-foreground shrink-0">+91</span>
      <span className="mx-2.5 h-4 w-px shrink-0 bg-border" />
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(sanitizePhoneDigits(e.target.value))}
        onBlur={onBlur}
        placeholder={placeholder}
        inputMode="numeric"
        maxLength={10}
        className="w-full min-w-0 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  )
}
