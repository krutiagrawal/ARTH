'use client'

import { cn } from '@/lib/utils'

/**
 * Tappable chip grid for single- or multi-select choices, mirroring
 * apps/mobile/src/components/common/SelectField.tsx so the NGO wizard behaves the same on both
 * platforms. `multi` switches between a single string value and a string[] value.
 */
export default function ChipSelect({ label, hint, options, value, onChange, multi = false }) {
  const isSelected = (v) => (multi ? value.includes(v) : value === v)

  const toggle = (v) => {
    if (multi) {
      const set = new Set(value)
      if (set.has(v)) set.delete(v)
      else set.add(v)
      onChange(Array.from(set))
    } else {
      onChange(v)
    }
  }

  return (
    <div>
      {label && <span className="eyebrow">{label}</span>}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = isSelected(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition',
                selected
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30',
              )}
            >
              {opt.icon ? <span>{opt.icon}</span> : null}
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
