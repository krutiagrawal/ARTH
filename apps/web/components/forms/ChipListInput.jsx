'use client'

import { useState } from 'react'
import { X, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Type-a-value-hit-Add chip list editor, mirroring
 * apps/mobile/src/components/common/ChipListField.tsx. One component covers every "add several
 * of these" field in the NGO wizard — operating cities/states, social links, and every link array
 * in the proof-of-work section.
 */
export default function ChipListInput({ label, hint, placeholder, values, onChange, max = 20, validate, validationHint, type = 'text' }) {
  const [draft, setDraft] = useState('')
  const isFull = values.length >= max
  const draftInvalid = Boolean(draft.trim()) && Boolean(validate) && !validate(draft.trim())

  const add = () => {
    const value = draft.trim()
    if (!value || isFull) return
    onChange([...values, value])
    setDraft('')
  }

  const removeAt = (index) => onChange(values.filter((_, i) => i !== index))

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  return (
    <div>
      {label && <span className="eyebrow">{label}</span>}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}

      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {values.map((value, index) => (
            <span key={`${value}-${index}`} className="inline-flex max-w-xs items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm">
              <span className="truncate">{value}</span>
              <button type="button" onClick={() => removeAt(index)} className="text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {!isFull && (
        <div className="mt-2 flex gap-2">
          <input
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder ?? 'Add and press Enter'}
            className={cn('h-11 flex-1 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40')}
          />
          <button
            type="button"
            onClick={add}
            disabled={!draft.trim()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-foreground text-background disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      {draftInvalid && validationHint && <p className="mt-1 text-xs text-destructive">{validationHint}</p>}
    </div>
  )
}
