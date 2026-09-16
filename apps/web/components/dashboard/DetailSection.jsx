'use client'

/**
 * Shared building blocks for admin approval-detail sheets (nursery/NGO/corporate) — a labelled
 * group of fields, and a single label/value row that renders nothing when the value is empty.
 * Extracted out of AdminNurseriesClient.jsx once a second consumer (AdminNgosClient.jsx) needed
 * the identical pattern.
 */
export function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <p className="eyebrow text-muted-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

export function Field({ label, value }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  )
}
