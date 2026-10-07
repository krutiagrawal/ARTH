// Formats estimated kg figures without implying precision: tiny values read "<0.1".
export function formatKg(kg) {
  const n = Number(kg ?? 0)
  if (n > 0 && n < 0.1) return '<0.1'
  if (n < 10) return n.toFixed(1)
  return Math.round(n).toLocaleString('en-IN')
}

export function formatTreeAge(ageDays) {
  if (ageDays == null) return null
  if (ageDays < 14) return `${Math.max(ageDays, 0)} day${ageDays === 1 ? '' : 's'}`
  if (ageDays < 60) return `${Math.round(ageDays / 7)} weeks`
  if (ageDays < 730) return `${Math.round(ageDays / 30.4)} months`
  return `${(ageDays / 365.25).toFixed(1)} years`
}
