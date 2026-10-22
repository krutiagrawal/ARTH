import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { isBulkRequirementOverdue } from '../../utils/bulkRequirement';
import type { ApiNgoBulkRequirement } from '../../api/ngoBulkRequirements';

export const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: COLORS.golden },
  partially_fulfilled: { label: 'Partly filled', color: COLORS.earth },
  fulfilled: { label: 'Fulfilled', color: COLORS.forest },
  expired: { label: 'Expired', color: COLORS.coral },
  cancelled: { label: 'Cancelled', color: COLORS.textMuted },
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** "Due in 5 days" / "Overdue by 2 days" / "Due today" - plus whether it deserves the alert colour. */
export function deadlineInfo(req: Pick<ApiNgoBulkRequirement, 'neededByDate' | 'status'>): { text: string; urgent: boolean } | null {
  if (!req.neededByDate) return null;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const due = new Date(req.neededByDate);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - startOfToday.getTime()) / 86_400_000);
  if (isBulkRequirementOverdue(req)) return { text: `Overdue by ${Math.max(Math.abs(days), 1)} day${Math.abs(days) === 1 ? '' : 's'}`, urgent: true };
  if (['fulfilled', 'cancelled'].includes(req.status)) return { text: `Was due ${shortDate(req.neededByDate)}`, urgent: false };
  if (days === 0) return { text: 'Due today', urgent: true };
  return { text: `Due in ${days} day${days === 1 ? '' : 's'}`, urgent: days <= 3 };
}

export function requirementTitle(req: Pick<ApiNgoBulkRequirement, 'species' | 'speciesNote'>) {
  return req.species?.commonName ?? req.speciesNote ?? 'Any species';
}

/**
 * One requirement at a glance: what and how many, how far along, when it is due, and - the part an
 * organiser actually acts on - what is waiting for them (offers to answer, handoffs to confirm).
 */
export function BulkRequirementCard({ item, onPress }: { item: ApiNgoBulkRequirement; onPress: () => void }) {
  const status = STATUS_STYLE[item.status] ?? STATUS_STYLE.open;
  const percent = item.quantityNeeded > 0 ? Math.min(100, Math.round((item.quantityFulfilled / item.quantityNeeded) * 100)) : 0;
  const promised = item.acceptedQuantity ?? 0;
  const promisedPercent = item.quantityNeeded > 0 ? Math.min(100, Math.round((promised / item.quantityNeeded) * 100)) : 0;
  const deadline = deadlineInfo(item);
  const title = requirementTitle(item);
  // Only worth repeating the free-text note when it adds to a catalog species name.
  const subtitle = item.species && item.speciesNote ? item.speciesNote : null;

  const alert =
    (item.awaitingReceipt ?? 0) > 0
      ? { text: `${item.awaitingReceipt} handoff${item.awaitingReceipt === 1 ? '' : 's'} to confirm`, color: COLORS.forest }
      : (item.pendingOffers ?? 0) > 0
        ? { text: `${item.pendingOffers} offer${item.pendingOffers === 1 ? '' : 's'} awaiting your reply`, color: COLORS.earth }
        : item.status === 'expired'
          ? { text: 'Deadline passed — reschedule to reopen', color: COLORS.coral }
          : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${title}, ${status.label}`}>
      <View style={styles.top}>
        <View style={styles.emojiTile}>
          <Text style={styles.emoji}>{item.species?.emoji ?? '🌱'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle ? `${subtitle}  ·  ` : ''}
            {item.city ? `📍 ${item.city}  ·  ` : ''}Posted {shortDate(item.createdAt)}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: `${status.color}26` }]}>
          <Text style={[styles.pillText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      <View style={styles.progressHead}>
        <Text style={styles.qty}>
          <Text style={styles.qtyStrong}>{item.quantityFulfilled.toLocaleString('en-IN')}</Text> / {item.quantityNeeded.toLocaleString('en-IN')} saplings
        </Text>
        <Text style={styles.percent}>{percent}%</Text>
      </View>
      <View style={styles.track}>
        {/* Promised-but-not-yet-received sits behind the received bar, so both stories read at once. */}
        {promisedPercent > percent && <View style={[styles.promised, { width: `${promisedPercent}%` }]} />}
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>
      {promised > item.quantityFulfilled && (
        <Text style={styles.promisedNote}>{promised.toLocaleString('en-IN')} promised by accepted offers</Text>
      )}

      <View style={styles.chips}>
        {deadline && (
          <View style={[styles.chip, deadline.urgent && styles.chipUrgent]}>
            <Text style={[styles.chipText, deadline.urgent && styles.chipTextUrgent]}>🗓 {deadline.text}</Text>
          </View>
        )}
        <View style={styles.chip}>
          <Text style={styles.chipText}>🤝 {item.offerCount ?? 0} offer{(item.offerCount ?? 0) === 1 ? '' : 's'}</Text>
        </View>
        {item.nativePreferred && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>🌿 Native</Text>
          </View>
        )}
        {item.driveId && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>🌳 For a drive</Text>
          </View>
        )}
      </View>

      {alert && (
        <View style={[styles.alert, { backgroundColor: `${alert.color}1F` }]}>
          <Text style={[styles.alertText, { color: alert.color }]}>{alert.text}</Text>
          <Text style={[styles.alertText, { color: alert.color }]}>›</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const border = 'rgba(139, 107, 71, 0.30)';

const styles = StyleSheet.create({
  card: { backgroundColor: 'transparent', borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: border, padding: 12, marginBottom: 12, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emojiTile: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 22 },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  qty: { fontSize: 12, color: COLORS.textSecondary },
  qtyStrong: { fontSize: 15, fontWeight: '800', color: COLORS.forest },
  percent: { fontSize: 12, fontWeight: '800', color: COLORS.forest },
  track: { height: 7, borderRadius: 4, backgroundColor: 'rgba(94,133,80,0.15)', overflow: 'hidden', marginTop: -4 },
  promised: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(212,168,83,0.45)' },
  fill: { height: '100%', backgroundColor: COLORS.sage, borderRadius: 4 },
  promisedNote: { fontSize: 11, color: COLORS.earth, marginTop: -4 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(139,107,71,0.25)', paddingHorizontal: 9, paddingVertical: 3 },
  chipUrgent: { borderColor: 'transparent', backgroundColor: 'rgba(232,137,106,0.18)' },
  chipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  chipTextUrgent: { color: COLORS.coral, fontWeight: '800' },

  alert: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 9 },
  alertText: { fontSize: 12, fontWeight: '800' },
});
