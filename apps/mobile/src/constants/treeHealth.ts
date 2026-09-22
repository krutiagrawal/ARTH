import { COLORS } from './colors';
import type { TreeHealthStatus } from '../api/plantedTrees';

export const STATUS_META: Record<TreeHealthStatus, { emoji: string; color: string; label: string }> = {
  not_checked: { emoji: '⚪', color: COLORS.textMuted, label: 'Not Checked' },
  healthy: { emoji: '🌱', color: COLORS.sage, label: 'Healthy' },
  struggling: { emoji: '🥀', color: COLORS.amber, label: 'Struggling' },
  dead: { emoji: '💀', color: COLORS.danger, label: 'Dead' },
  removed: { emoji: '🚫', color: COLORS.textMuted, label: 'Removed' },
};

export const ACTIONABLE_STATUSES: Exclude<TreeHealthStatus, 'not_checked'>[] = ['healthy', 'struggling', 'dead', 'removed'];

export function formatDueDate(iso: string | null): string {
  if (!iso) return '–';
  const due = new Date(iso);
  const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return due.getTime() < Date.now() ? `${label} (overdue)` : label;
}
