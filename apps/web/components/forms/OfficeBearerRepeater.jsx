'use client'

import PhoneInput from '@/components/dashboard/PhoneInput'

const EMPTY_BEARER = { name: '', designation: '', phone: '', email: '' }

/**
 * 0-N repeatable office-bearer cards, capped at `max` (3, per NGO Darpan's own convention of
 * capturing multiple key functionaries). Entirely optional. Mirrors
 * apps/mobile/src/components/common/OfficeBearerListField.tsx.
 */
export default function OfficeBearerRepeater({ bearers, onChange, max = 3 }) {
  const update = (index, patch) => onChange(bearers.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  const remove = (index) => onChange(bearers.filter((_, i) => i !== index))
  const add = () => onChange([...bearers, { ...EMPTY_BEARER }])

  return (
    <div>
      <span className="eyebrow">Office bearers</span>
      <p className="mt-1 text-xs text-muted-foreground">Optional — 2-3 key trustees/board members strengthens your application.</p>

      <div className="mt-3 space-y-3">
        {bearers.map((bearer, index) => (
          <div key={index} className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Office bearer {index + 1}</p>
              <button type="button" onClick={() => remove(index)} className="text-xs font-medium text-destructive">
                Remove
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                value={bearer.name}
                onChange={(e) => update(index, { name: e.target.value })}
                placeholder="Full name"
                className="h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                value={bearer.designation}
                onChange={(e) => update(index, { designation: e.target.value })}
                placeholder="Designation (e.g. Trustee)"
                className="h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40"
              />
              <PhoneInput value={bearer.phone} onChange={(digits) => update(index, { phone: digits })} className="mt-0" />
              <input
                type="email"
                value={bearer.email}
                onChange={(e) => update(index, { email: e.target.value })}
                placeholder="Email (optional)"
                className="h-11 rounded-full border border-border bg-background px-4 outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>
        ))}
      </div>

      {bearers.length < max && (
        <button
          type="button"
          onClick={add}
          className="mt-3 w-full rounded-2xl border-2 border-dashed border-border py-3 text-sm font-medium text-primary hover:border-primary/40"
        >
          + Add office bearer
        </button>
      )}
    </div>
  )
}
