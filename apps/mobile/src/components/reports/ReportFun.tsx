import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { num } from './ReportKit';

/** Counts up from 0 to `target` so a freshly loaded number feels like it is arriving, not just appearing. */
export function useAnimatedNumber(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const from = 0;
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (target - from) * eased);
      if (t >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return value;
}

// ------------------------------------------------------------------ hero

/**
 * The big headline card at the top of a report: one number that counts up, a sentence about it, and
 * how it moved against the previous period.
 */
export function HeroCard({
  emoji,
  eyebrow,
  value,
  format,
  caption,
  change,
  invert,
}: {
  emoji: string;
  eyebrow: string;
  value: number;
  format: (n: number) => string;
  caption: string;
  /** Percent change vs the previous period, or 'new'. */
  change?: number | 'new' | null;
  invert?: boolean;
}) {
  const shown = useAnimatedNumber(value);
  let badge: string | null = null;
  let good = true;
  if (change === 'new') badge = '✨ New this period';
  else if (typeof change === 'number' && change !== 0) {
    good = invert ? change < 0 : change > 0;
    badge = `${change > 0 ? '▲' : '▼'} ${Math.abs(change)}% vs previous period`;
  }
  return (
    <LinearGradient colors={[COLORS.forest, COLORS.sage]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View style={styles.heroBubbleA} />
      <View style={styles.heroBubbleB} />
      <Text style={styles.heroEmoji}>{emoji}</Text>
      <Text style={styles.heroEyebrow}>{eyebrow}</Text>
      <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
        {format(Math.round(shown))}
      </Text>
      <Text style={styles.heroCaption}>{caption}</Text>
      {badge && (
        <View style={[styles.heroBadge, { backgroundColor: good ? 'rgba(255,255,255,0.22)' : 'rgba(194, 74, 59, 0.55)' }]}>
          <Text style={styles.heroBadgeText}>{badge}</Text>
        </View>
      )}
    </LinearGradient>
  );
}

// ------------------------------------------------------------------ highlights

export interface Highlight {
  emoji: string;
  title: string;
  text: string;
}

/** Short, human "did you know" cards computed from the numbers – the fun part of the report. */
export function Highlights({ items }: { items: Highlight[] }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.highlights}>
      {items.map((h) => (
        <View key={h.title} style={styles.highlight}>
          <Text style={styles.highlightEmoji}>{h.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.highlightTitle}>{h.title}</Text>
            <Text style={styles.highlightText}>{h.text}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** The highest point of a series, for "best day/week/month" highlights. */
export function peakOf(points: { start: string; value: number; count: number }[], useCount?: boolean) {
  let best: { start: string; amount: number } | null = null;
  for (const p of points) {
    const amount = useCount ? p.count : p.value;
    if (amount > 0 && (!best || amount > best.amount)) best = { start: p.start, amount };
  }
  return best;
}

// ------------------------------------------------------------------ donut

/** A ring chart with the total in the middle and a legend underneath. */
export function Donut({
  segments,
  centerLabel,
  size = 150,
}: {
  segments: { label: string; value: number; color: string }[];
  centerLabel?: string;
  size?: number;
}) {
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((n, s) => n + s.value, 0);
  if (total === 0) return <Text style={styles.empty}>Nothing in this period.</Text>;

  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={styles.donutWrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(139, 107, 71, 0.10)" strokeWidth={stroke} fill="none" />
          {visible.map((s) => {
            const len = (s.value / total) * c;
            const el = (
              <Circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${Math.max(0, len - 2)} ${c - Math.max(0, len - 2)}`}
                strokeDashoffset={-offset}
                rotation={-90}
                origin={`${size / 2}, ${size / 2}`}
              />
            );
            offset += len;
            return el;
          })}
        </Svg>
        <View style={styles.donutCenter} pointerEvents="none">
          <Text style={styles.donutTotal}>{num(total)}</Text>
          {centerLabel ? <Text style={styles.donutLabel}>{centerLabel}</Text> : null}
        </View>
      </View>
      <View style={styles.donutLegend}>
        {visible.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {s.label}
            </Text>
            <Text style={styles.legendValue}>
              {s.value} · {Math.round((s.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ------------------------------------------------------------------ tappable, animated bars

function GrowBar({ ratio, color, index, selected, onPress }: { ratio: number; color: string; index: number; selected: boolean; onPress: () => void }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(Math.min(index * 18, 500), withTiming(ratio, { duration: 550, easing: Easing.out(Easing.cubic) }));
  }, [ratio]);
  const style = useAnimatedStyle(() => ({ height: `${h.value * 100}%` as any }));
  return (
    <TouchableOpacity style={styles.barTap} activeOpacity={0.7} onPress={onPress}>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.bar, { backgroundColor: color, opacity: selected ? 1 : 0.8 }, selected && styles.barSelected, style]} />
      </View>
    </TouchableOpacity>
  );
}

const shortDate = (iso: string, g: 'day' | 'week' | 'month') =>
  new Date(iso).toLocaleDateString(undefined, g === 'month' ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' });

/** Bars that grow in, with a tap-to-inspect readout above the chart (defaults to the peak bar). */
export function InteractiveBars({
  points,
  granularity,
  color = COLORS.sage,
  format = num,
  useCount,
}: {
  points: { start: string; value: number; count: number }[];
  granularity: 'day' | 'week' | 'month';
  color?: string;
  format?: (n: number) => string;
  useCount?: boolean;
}) {
  const values = points.map((p) => (useCount ? p.count : p.value));
  const max = Math.max(...values, 0);
  const total = values.reduce((a, b) => a + b, 0);
  const peakIndex = values.indexOf(max);
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [points]);
  if (points.length === 0 || max === 0) return <Text style={styles.empty}>Nothing in this period.</Text>;

  const idx = picked ?? peakIndex;
  const step = Math.max(1, Math.ceil(points.length / 5));
  return (
    <View>
      <View style={styles.readout}>
        <Text style={styles.readoutValue}>{format(values[idx])}</Text>
        <Text style={styles.readoutDate}>
          {picked == null ? 'peak · ' : ''}
          {shortDate(points[idx].start, granularity)}
        </Text>
        <Text style={styles.readoutTotal}>{format(total)} total</Text>
      </View>
      <View style={styles.bars}>
        {points.map((p, i) => (
          <GrowBar key={p.start} index={i} ratio={values[i] > 0 ? Math.max(0.04, values[i] / max) : 0} color={color} selected={i === idx} onPress={() => setPicked(i)} />
        ))}
      </View>
      <View style={styles.axis}>
        {points.map((p, i) => (
          <View key={p.start} style={styles.barTap}>
            {i % step === 0 ? (
              <Text style={styles.axisLabel} numberOfLines={1}>
                {shortDate(p.start, granularity)}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: RADIUS.lg, padding: 20, marginTop: 14, overflow: 'hidden' },
  heroBubbleA: { position: 'absolute', right: -30, top: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.10)' },
  heroBubbleB: { position: 'absolute', right: 40, bottom: -40, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)' },
  heroEmoji: { fontSize: 34 },
  heroEyebrow: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 6 },
  heroValue: { fontSize: 44, fontWeight: '900', color: '#fff', marginTop: 2 },
  heroCaption: { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  heroBadge: { alignSelf: 'flex-start', borderRadius: 100, paddingVertical: 5, paddingHorizontal: 12, marginTop: 12 },
  heroBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },

  highlights: { gap: 10, marginTop: 14 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: RADIUS.md, padding: 14, backgroundColor: 'rgba(212, 160, 23, 0.12)' },
  highlightEmoji: { fontSize: 26 },
  highlightTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  highlightText: { fontSize: 12, lineHeight: 17, color: COLORS.textSecondary, marginTop: 2 },

  empty: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 14 },

  donutWrap: { alignItems: 'center', gap: 16 },
  donutCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  donutTotal: { fontSize: 26, fontWeight: '900', color: COLORS.forest },
  donutLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  donutLegend: { alignSelf: 'stretch', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { flex: 1, fontSize: 13, color: COLORS.textPrimary, fontWeight: '600' },
  legendValue: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '700' },

  readout: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  readoutValue: { fontSize: 20, fontWeight: '900', color: COLORS.forest },
  readoutDate: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  readoutTotal: { marginLeft: 'auto', fontSize: 12, color: COLORS.textMuted, fontWeight: '700' },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 2 },
  barTap: { flex: 1, height: '100%', alignItems: 'center' },
  barTrack: { width: '100%', height: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barSelected: { borderWidth: 1.5, borderColor: COLORS.forestDeep },
  axis: { flexDirection: 'row', gap: 2, marginTop: 6, height: 14 },
  axisLabel: { fontSize: 9, color: COLORS.textMuted, width: 44, textAlign: 'center' },
});
