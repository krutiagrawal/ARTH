import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
import { Text } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { DateRangeBar, type DateRangeValue } from './DateRangeBar';
import type { MetricTileSpec } from './DashboardTiles';

function SlidersIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Line x1="3" y1="6" x2="21" y2="6" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1="3" y1="18" x2="21" y2="18" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Circle cx="9" cy="6" r="2.6" fill={color} />
      <Circle cx="16" cy="12" r="2.6" fill={color} />
      <Circle cx="8" cy="18" r="2.6" fill={color} />
    </Svg>
  );
}

/** The period box plus a filters button (opens a sheet with `filters`), shown above the story slides. */
export function ReportTopBar({
  range,
  onRange,
  filters,
  activeFilters,
}: {
  range: DateRangeValue;
  onRange: (v: DateRangeValue) => void;
  filters: React.ReactNode;
  activeFilters: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <View style={styles.bar}>
        <View style={{ flex: 1 }}>
          <DateRangeBar value={range} onChange={onRange} />
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, activeFilters > 0 && styles.filterBtnActive]}
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Filters"
        >
          <SlidersIcon color={activeFilters > 0 ? COLORS.white : COLORS.textSecondary} />
          {activeFilters > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilters}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      <Sheet visible={open} onClose={() => setOpen(false)} title="Filters">
        <View style={{ gap: 10 }}>{filters}</View>
        <TouchableOpacity style={styles.done} onPress={() => setOpen(false)}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </Sheet>
    </>
  );
}

/** "All the numbers": each metric as a calm row that expands to its charts and breakdowns. */
export function DetailList({ items }: { items: MetricTileSpec[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <View style={styles.list}>
      {items.map((t) => {
        const open = openId === t.id;
        return (
          <View key={t.id} style={styles.item}>
            <TouchableOpacity style={styles.itemHead} onPress={() => setOpenId(open ? null : t.id)} activeOpacity={0.7}>
              <Text style={styles.itemEmoji}>{t.emoji}</Text>
              <Text style={styles.itemLabel}>{t.label}</Text>
              <Text style={styles.itemValue}>{t.format(Math.round(t.value))}</Text>
              <Text style={styles.itemCaret}>{open ? '▴' : '▾'}</Text>
            </TouchableOpacity>
            {open && <View style={styles.itemBody}>{t.panel}</View>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'stretch', gap: 8, paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10 },
  filterBtn: { width: 52, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.md, borderWidth: 1.5, borderColor: 'rgba(139, 107, 71, 0.30)' },
  filterBtnActive: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  badge: { position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: COLORS.forest, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: '800' },
  done: { marginTop: 16, backgroundColor: COLORS.forest, borderRadius: RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  doneText: { fontSize: 15, fontWeight: '800', color: COLORS.white },

  list: { gap: 10 },
  item: { borderRadius: RADIUS.md, backgroundColor: 'rgba(255,255,255,0.75)', overflow: 'hidden' },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  itemEmoji: { fontSize: 22 },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  itemValue: { fontSize: 15, fontWeight: '900', color: COLORS.forest },
  itemCaret: { fontSize: 12, color: COLORS.textMuted },
  itemBody: { paddingHorizontal: 14, paddingBottom: 16, gap: 16 },
});
