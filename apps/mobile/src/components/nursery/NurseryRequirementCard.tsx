import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { resolveMediaUrl } from '../../api/client';
import { deadlineInfo, STATUS_STYLE } from '../ngo/BulkRequirementCard';
import type { ApiBulkRequirement, BulkResponseStatus } from '../../api/nursery';

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

const OFFER_STATE: Record<BulkResponseStatus, { label: string; color: string }> = {
  proposed: { label: 'Awaiting NGO reply', color: COLORS.earth },
  accepted: { label: 'Accepted — prepare the handoff', color: COLORS.forest },
  handed_off: { label: 'Handed off — NGO to confirm', color: COLORS.forest },
  fulfilled: { label: 'Fulfilled', color: COLORS.forest },
  declined: { label: 'Declined', color: COLORS.coral },
  withdrawn: { label: 'Withdrawn', color: COLORS.textMuted },
};

/**
 * A request from an NGO, as the nursery weighs it: who is asking, what and how many, how soon and
 * how far, whether the nursery can even fill it from stock - and where its own offer stands.
 */
export function NurseryRequirementCard({ item, onPress }: { item: ApiBulkRequirement; onPress: () => void }) {
  const logo = resolveMediaUrl(item.ngo.logoUrl);
  const species = item.species?.commonName ?? item.speciesNote ?? 'Any species';
  const remaining = Math.max(item.quantityNeeded - item.quantityFulfilled, 0);
  const percent = item.quantityNeeded > 0 ? Math.min(100, Math.round((item.quantityFulfilled / item.quantityNeeded) * 100)) : 0;
  const deadline = deadlineInfo(item);
  const status = STATUS_STYLE[item.status] ?? STATUS_STYLE.open;
  const mine = item.myResponse;
  const mineActive = mine && !['withdrawn', 'declined'].includes(mine.status);
  const open = ['open', 'partially_fulfilled'].includes(item.status);

  // Stock fit: only meaningful when the request names a catalog species.
  const stock = item.myStockQuantity;
  const stockChip =
    stock == null
      ? null
      : stock >= remaining
        ? { text: `📦 You have ${stock.toLocaleString('en-IN')} — enough`, tone: 'good' as const }
        : stock > 0
          ? { text: `📦 You have ${stock.toLocaleString('en-IN')} of ${remaining.toLocaleString('en-IN')}`, tone: 'warn' as const }
          : { text: '📦 Not in your stock', tone: 'bad' as const };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={`${item.ngo.orgName}, ${species}`}>
      <View style={styles.top}>
        <View style={styles.logo}>
          {logo ? <Image source={{ uri: logo }} style={styles.logoImg} /> : <Text style={{ fontSize: 20 }}>🌿</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ngo} numberOfLines={1}>{item.ngo.orgName}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {item.city ?? item.ngo.city ? `📍 ${item.city ?? item.ngo.city}  ·  ` : ''}Posted {shortDate(item.createdAt)}
          </Text>
        </View>
        {!open || !mineActive ? (
          <View style={[styles.pill, { backgroundColor: `${status.color}26` }]}>
            <Text style={[styles.pillText, { color: status.color }]}>{status.label}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.speciesRow}>
        <Text style={styles.emoji}>{item.species?.emoji ?? '🌱'}</Text>
        <Text style={styles.species} numberOfLines={2}>{species}</Text>
        {item.nativePreferred && (
          <View style={styles.native}>
            <Text style={styles.nativeText}>🌿 Native</Text>
          </View>
        )}
      </View>
      {item.species && item.speciesNote ? <Text style={styles.note} numberOfLines={1}>{item.speciesNote}</Text> : null}

      {item.notes ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteLabel}>📝 Note from the NGO</Text>
          <Text style={styles.noteText} numberOfLines={2}>{item.notes}</Text>
        </View>
      ) : null}

      <View>
        <View style={styles.qtyRow}>
          <Text style={styles.qty}>
            <Text style={styles.qtyStrong}>{remaining.toLocaleString('en-IN')}</Text> still needed
          </Text>
          <Text style={styles.qtyOf}>{item.quantityFulfilled.toLocaleString('en-IN')} / {item.quantityNeeded.toLocaleString('en-IN')} · {percent}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${percent}%` }]} />
        </View>
      </View>

      <View style={styles.chips}>
        {deadline && (
          <View style={[styles.chip, deadline.urgent && styles.chipUrgent]}>
            <Text style={[styles.chipText, deadline.urgent && styles.chipTextUrgent]}>🗓 {deadline.text}</Text>
          </View>
        )}
        {item.distanceKm != null && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>🧭 {item.distanceKm < 10 ? item.distanceKm.toFixed(1) : Math.round(item.distanceKm)} km away</Text>
          </View>
        )}
        {(item.offerCount ?? 0) > 0 && (
          <View style={styles.chip}>
            <Text style={styles.chipText}>🤝 {item.offerCount} offer{item.offerCount === 1 ? '' : 's'} so far</Text>
          </View>
        )}
        {stockChip && open && !mineActive && (
          <View style={[styles.chip, stockChip.tone === 'good' && styles.chipGood, stockChip.tone === 'bad' && styles.chipUrgent]}>
            <Text style={[styles.chipText, stockChip.tone === 'good' && styles.chipTextGood, stockChip.tone === 'bad' && styles.chipTextUrgent]}>{stockChip.text}</Text>
          </View>
        )}
      </View>

      {mineActive ? (
        <View style={[styles.strip, { backgroundColor: `${OFFER_STATE[mine!.status].color}1F` }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stripTitle, { color: OFFER_STATE[mine!.status].color }]}>{OFFER_STATE[mine!.status].label}</Text>
            <Text style={styles.stripSub}>
              Your offer: {mine!.quantityOffered.toLocaleString('en-IN')} saplings
              {mine!.priceCents != null ? ` at ₹${(mine!.priceCents / 100).toLocaleString('en-IN')} each` : ' · free'}
            </Text>
          </View>
          <Text style={[styles.stripTitle, { color: OFFER_STATE[mine!.status].color }]}>›</Text>
        </View>
      ) : open && stockChip?.tone === 'good' ? (
        <View style={[styles.strip, { backgroundColor: 'rgba(94,133,80,0.12)' }]}>
          <Text style={[styles.stripTitle, { color: COLORS.forest, flex: 1 }]}>You can fill this from your stock</Text>
          <Text style={[styles.stripTitle, { color: COLORS.forest }]}>Make an offer ›</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const border = 'rgba(139, 107, 71, 0.30)';

const styles = StyleSheet.create({
  card: { backgroundColor: 'transparent', borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: border, padding: 12, marginBottom: 12, gap: 10 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  logoImg: { width: '100%', height: '100%' },
  ngo: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  sub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  pillText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },

  speciesRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emoji: { fontSize: 22 },
  species: { flex: 1, fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  native: { borderRadius: 999, backgroundColor: 'rgba(94,133,80,0.14)', paddingHorizontal: 9, paddingVertical: 3 },
  nativeText: { fontSize: 11, fontWeight: '800', color: COLORS.forest },
  note: { fontSize: 12, color: COLORS.textSecondary, marginTop: -6 },

  noteBox: { backgroundColor: 'rgba(212,168,83,0.18)', borderLeftWidth: 4, borderLeftColor: COLORS.golden, borderRadius: RADIUS.md, paddingHorizontal: 11, paddingVertical: 8, gap: 2 },
  noteLabel: { fontSize: 10, fontWeight: '900', color: COLORS.earth, textTransform: 'uppercase', letterSpacing: 0.6 },
  noteText: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: COLORS.textPrimary },

  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  qty: { fontSize: 12, color: COLORS.textSecondary },
  qtyStrong: { fontSize: 16, fontWeight: '800', color: COLORS.forest },
  qtyOf: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(94,133,80,0.15)', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: COLORS.sage, borderRadius: 3 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: 'rgba(139,107,71,0.25)', paddingHorizontal: 9, paddingVertical: 3 },
  chipUrgent: { borderColor: 'transparent', backgroundColor: 'rgba(232,137,106,0.18)' },
  chipGood: { borderColor: 'transparent', backgroundColor: 'rgba(94,133,80,0.14)' },
  chipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  chipTextUrgent: { color: COLORS.coral, fontWeight: '800' },
  chipTextGood: { color: COLORS.forest, fontWeight: '800' },

  strip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: RADIUS.md, paddingHorizontal: 12, paddingVertical: 9 },
  stripTitle: { fontSize: 12, fontWeight: '800' },
  stripSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
