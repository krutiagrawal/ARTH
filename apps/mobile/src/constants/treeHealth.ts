import { COLORS } from './colors';
import type { TreeHealthStatus } from '../api/plantedTrees';

export const STATUS_META: Record<TreeHealthStatus, { emoji: string; color: string; label: string }> = {
  not_checked: { emoji: '⚪', color: COLORS.textMuted, label: 'Not Checked' },
  healthy: { emoji: '🌱', color: COLORS.sage, label: 'Healthy' },
  struggling: { emoji: '🥀', color: COLORS.amber, label: 'Struggling' },
  dead: { emoji: '💀', color: COLORS.danger, label: 'Dead' },
  removed: { emoji: '🚫', color: COLORS.textMuted, label: 'Removed' },
};

/**
 * Text colour for a label drawn on a solid fill of the status colour. The sage and amber fills are
 * light, so white text on them was nearly unreadable – those get dark text; the darker fills keep white.
 */
export const STATUS_TEXT_ON_FILL: Record<TreeHealthStatus, string> = {
  not_checked: COLORS.white,
  healthy: COLORS.forestDeep,
  struggling: COLORS.textPrimary,
  dead: COLORS.white,
  removed: COLORS.white,
};

/** Status text on a light or tinted background: deeper shades of the sage/amber so the label stays readable. */
export const STATUS_TEXT_ON_LIGHT: Record<TreeHealthStatus, string> = {
  not_checked: COLORS.textMuted,
  healthy: '#4A7240',
  struggling: '#946400',
  dead: COLORS.danger,
  removed: COLORS.textMuted,
};

export const ACTIONABLE_STATUSES: Exclude<TreeHealthStatus, 'not_checked'>[] = ['healthy', 'struggling', 'dead', 'removed'];

export function formatDueDate(iso: string | null): string {
  if (!iso) return '–';
  const due = new Date(iso);
  const label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return due.getTime() < Date.now() ? `${label} (overdue)` : label;
}
