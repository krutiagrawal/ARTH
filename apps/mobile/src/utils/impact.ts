/** Formats an estimated kg figure without implying precision it doesn't have: tiny values read "<0.1". */
export function formatKg(kg: number | null | undefined): string {
  const n = Number(kg ?? 0);
  if (n > 0 && n < 0.1) return '<0.1';
  if (n < 10) return n.toFixed(1);
  return Math.round(n).toLocaleString('en-IN');
}

/** "3 days", "5 months", "2.5 years" - how long a tree has been growing. */
export function formatTreeAge(ageDays: number): string {
  if (ageDays < 14) return `${Math.max(ageDays, 0)} day${ageDays === 1 ? '' : 's'}`;
  if (ageDays < 60) return `${Math.round(ageDays / 7)} weeks`;
  if (ageDays < 730) return `${Math.round(ageDays / 30.4)} months`;
  return `${(ageDays / 365.25).toFixed(1)} years`;
}
