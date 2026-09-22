export const STATUS_LABELS = {
  not_checked: 'Not checked',
  healthy: 'Healthy',
  struggling: 'Struggling',
  dead: 'Dead',
  removed: 'Removed',
}

export const STATUS_VARIANT = {
  not_checked: 'outline',
  healthy: 'default',
  struggling: 'secondary',
  dead: 'destructive',
  removed: 'outline',
}

export function formatDueDate(iso) {
  if (!iso) return '–'
  const due = new Date(iso)
  const isOverdue = due.getTime() < Date.now()
  const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  return isOverdue ? `${label} (overdue)` : label
}
