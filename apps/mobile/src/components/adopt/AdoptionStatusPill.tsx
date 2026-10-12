import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { STATUS_META } from '../../constants/treeHealth';
import type { TreeHealthStatus } from '../../api/plantedTrees';

/** A tree with no check-in for this long is flagged as due. */
export const CHECK_DUE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS);
}

export function timeAgo(iso?: string | null): string {
  const days = daysSince(iso);
  if (days == null) return 'never checked';
  if (days <= 0) return 'checked today';
  if (days === 1) return 'checked yesterday';
  if (days < 30) return `checked ${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'checked 1 month ago' : `checked ${months} months ago`;
}

/**
 * Health + recency line for an adopted/adoptable tree: "🌱 Healthy · checked 3 days ago", with a
 * "due for a check" flag once it has gone CHECK_DUE_DAYS without one. Renders nothing when the
 * tree has no status (a listing that isn't linked to a real planted tree).
 */
export function AdoptionStatusPill({ status, lastCheckedAt }: { status?: TreeHealthStatus | string | null; lastCheckedAt?: string | null }) {
  if (!status) return null;
  const meta = STATUS_META[status as TreeHealthStatus] ?? STATUS_META.not_checked;
  const days = daysSince(lastCheckedAt);
  const due = days == null || days >= CHECK_DUE_DAYS;

  return (
    <View style={styles.row}>
      <View style={[styles.pill, { borderColor: meta.color }]}>
        <Text style={[styles.pillText, { color: meta.color }]}>{meta.emoji} {meta.label}</Text>
      </View>
      <Text style={styles.ago}>{timeAgo(lastCheckedAt)}</Text>
      {due && (
        <View style={[styles.pill, { borderColor: COLORS.amber }]}>
          <Text style={[styles.pillText, { color: COLORS.amber }]}>⏰ Due for a check</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 },
  pill: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  pillText: { fontSize: 12, fontWeight: '700' },
  ago: { fontSize: 12, color: COLORS.textSecondary },
});
