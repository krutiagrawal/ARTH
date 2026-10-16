'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import FieldLabel from '@/components/forms/FieldLabel'

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
      {label && <FieldLabel hint={hint}>{label}</FieldLabel>}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt, i) => {
          const selected = isSelected(opt.value)
          return (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.25 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              aria-pressed={selected}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors',
                selected
                  ? 'border-primary bg-primary/10 text-primary font-medium shadow-sm'
                  : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30',
              )}
            >
              {opt.icon ? <span>{opt.icon}</span> : null}
              {opt.label}
              <motion.span
                initial={false}
                animate={{ width: selected ? 14 : 0, opacity: selected ? 1 : 0, scale: selected ? 1 : 0.4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="inline-flex overflow-hidden"
              >
                <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
              </motion.span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
