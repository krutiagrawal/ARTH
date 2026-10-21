import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { BorderCard } from '../common/BorderCard';

// ---------------------------------------------------------------- formatting

export const rupees = (cents: number) => `₹${Math.round(cents / 100).toLocaleString('en-IN')}`;
export const compactRupees = (cents: number) => {
  const r = cents / 100;
  if (r >= 10_000_000) return `₹${(r / 10_000_000).toFixed(1)}Cr`;
  if (r >= 100_000) return `₹${(r / 100_000).toFixed(1)}L`;
  if (r >= 10_000) return `₹${(r / 1000).toFixed(1)}k`;
  return `₹${Math.round(r).toLocaleString('en-IN')}`;
};
export const num = (n: number) => n.toLocaleString('en-IN');
export const percent = (n: number | null) => (n == null ? '–' : `${n}%`);

/** % change from `prev` to `cur`; null when there is nothing to compare with (or both are zero). */
export function changePct(cur: number | null, prev: number | null | undefined): number | 'new' | null {
  if (cur == null || prev == null) return null;
  if (prev === 0) return cur > 0 ? 'new' : null;
  return Math.round(((cur - prev) / prev) * 100);
}

// ---------------------------------------------------------------- layout

export function ReportSection({
  title,
  subtitle,
  children,
  empty,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Shown instead of children when there is nothing in the selected range. */
  empty?: string | null;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      <BorderCard style={styles.sectionCard}>{empty ? <Text style={styles.empty}>{empty}</Text> : children}</BorderCard>
    </View>
  );
}

// ---------------------------------------------------------------- KPI tiles

export function KpiTile({
  label,
  value,
  sub,
  change,
  invert,
}: {
  label: string;
  value: string;
  sub?: string;
  /** From `changePct`. */
  change?: number | 'new' | null;
  /** Lower is better (e.g. cancellation rate): flips the arrow colours. */
  invert?: boolean;
}) {
  let badge: React.ReactNode = null;
  if (change === 'new') {
    badge = <Text style={[styles.delta, { color: COLORS.forest }]}>New</Text>;
  } else if (typeof change === 'number' && change !== 0) {
    const good = invert ? change < 0 : change > 0;
    badge = (
      <Text style={[styles.delta, { color: good ? COLORS.forest : COLORS.dangerDark }]}>
        {change > 0 ? '▲' : '▼'} {Math.abs(change)}%
      </Text>
    );
  }
  return (
    <View style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={styles.tileFoot}>
        {badge}
        {sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

// ---------------------------------------------------------------- charts

interface Point {
  start: string;
  value: number;
  count: number;
}

function shortDate(iso: string, granularity: 'day' | 'week' | 'month') {
  const d = new Date(iso);
  return granularity === 'month'
    ? d.toLocaleDateString(undefined, { month: 'short' })
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Vertical bars across the window; labels thin out so they never overlap. */
export function BarSeries({
  points,
  granularity,
  color = COLORS.sage,
  format = num,
  useCount,
}: {
  points: Point[];
  granularity: 'day' | 'week' | 'month';
  color?: string;
  format?: (n: number) => string;
  /** Plot `count` instead of `value` (for series without a monetary weight). */
  useCount?: boolean;
}) {
  const values = points.map((p) => (useCount ? p.count : p.value));
  const max = Math.max(...values, 0);
  const total = values.reduce((a, b) => a + b, 0);
  if (points.length === 0 || max === 0) return <Text style={styles.empty}>Nothing in this period.</Text>;
  const step = Math.max(1, Math.ceil(points.length / 5));
  return (
    <View>
      <Text style={styles.chartTotal}>{format(total)} total</Text>
      <View style={styles.bars}>
        {points.map((p, i) => (
          <View key={p.start} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: `${Math.max(values[i] > 0 ? 4 : 0, (values[i] / max) * 100)}%`, backgroundColor: color }]} />
            </View>
          </View>
        ))}
      </View>
      <View style={styles.barLabels}>
        {points.map((p, i) => (
          <View key={p.start} style={styles.barCol}>
            {i % step === 0 ? (
              <Text style={styles.barLabel} numberOfLines={1}>
                {shortDate(p.start, granularity)}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/** Horizontal ranked bars: label on the left, value on the right, bar underneath. */
export function RankedBars({
  rows,
  color = COLORS.sage,
}: {
  rows: { label: string; value: number; display: string; sub?: string }[];
  color?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (rows.length === 0 || max === 0) return <Text style={styles.empty}>Nothing in this period.</Text>;
  return (
    <View style={{ gap: 12 }}>
      {rows.map((r) => (
        <View key={r.label}>
          <View style={styles.rankTop}>
            <Text style={styles.rankLabel} numberOfLines={1}>
              {r.label}
            </Text>
            <Text style={styles.rankValue}>{r.display}</Text>
          </View>
          <View style={styles.rankTrack}>
            <View style={[styles.rankFill, { width: `${Math.max(3, (r.value / max) * 100)}%`, backgroundColor: color }]} />
          </View>
          {r.sub ? <Text style={styles.rankSub}>{r.sub}</Text> : null}
        </View>
      ))}
    </View>
  );
}

/** A single stacked bar with a legend, for part-of-whole splits (survival, order status…). */
export function SplitBar({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  if (total === 0) return <Text style={styles.empty}>Nothing in this period.</Text>;
  return (
    <View>
      <View style={styles.splitBar}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <View key={s.label} style={{ flex: s.value, backgroundColor: s.color }} />
          ))}
      </View>
      <View style={styles.legend}>
        {segments
          .filter((s) => s.value > 0)
          .map((s) => (
            <View key={s.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text style={styles.legendText}>
                {s.label} {s.value} ({Math.round((s.value / total) * 100)}%)
              </Text>
            </View>
          ))}
      </View>
    </View>
  );
}

/** Plain label/value rows for compact tables (drives, partners…). */
export function StatRow({ left, sub, right }: { left: string; sub?: string; right: string }) {
  return (
    <View style={styles.statRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.statRowLeft} numberOfLines={1}>
          {left}
        </Text>
        {sub ? <Text style={styles.statRowSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.statRowRight}>{right}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  sectionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sectionCard: { marginTop: 10 },
  empty: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 14 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, borderRadius: RADIUS.md, padding: 14, backgroundColor: 'rgba(139, 107, 71, 0.07)' },
  tileLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
  tileValue: { fontSize: 22, fontWeight: '800', color: COLORS.forest, marginTop: 6 },
  tileFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  tileSub: { fontSize: 11, color: COLORS.textSecondary },
  delta: { fontSize: 11, fontWeight: '800' },

  chartTotal: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  barLabels: { flexDirection: 'row', gap: 2, marginTop: 6 },
  barLabel: { fontSize: 9, color: COLORS.textMuted, width: 44, textAlign: 'center' },

  rankTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rankLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  rankValue: { fontSize: 13, fontWeight: '800', color: COLORS.forest },
  rankTrack: { height: 7, borderRadius: 4, backgroundColor: 'rgba(139, 107, 71, 0.12)', marginTop: 5, overflow: 'hidden' },
  rankFill: { height: '100%', borderRadius: 4 },
  rankSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 3 },

  splitBar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },
  legendText: { fontSize: 12, color: COLORS.textSecondary },

  statRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 107, 71, 0.12)' },
  statRowLeft: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  statRowSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  statRowRight: { fontSize: 13, fontWeight: '800', color: COLORS.forest },
});
