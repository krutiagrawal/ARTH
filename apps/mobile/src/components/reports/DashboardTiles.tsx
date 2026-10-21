import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../common/AppText';
import { Mascot } from '../common/Mascot';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { useAnimatedNumber } from './ReportFun';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ------------------------------------------------------------------ sparkline

/** A tiny filled line chart drawn inside a tile – the shape of the period at a glance. */
export function Sparkline({ values, color = 'rgba(255,255,255,0.95)', width = 120, height = 34 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const max = Math.max(...values, 0);
  if (values.length < 2 || max === 0) return <View style={{ height }} />;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => ({ x: i * step, y: height - 3 - (v / max) * (height - 8) }));
  // Smooth the line with quadratic midpoints.
  let line = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    const my = (pts[i - 1].y + pts[i].y) / 2;
    line += ` Q ${pts[i - 1].x} ${pts[i - 1].y} ${mx} ${my}`;
  }
  line += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <SvgGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </SvgGradient>
      </Defs>
      <Path d={area} fill="url(#spark)" />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// ------------------------------------------------------------------ metric tile

export interface MetricTileSpec {
  id: string;
  emoji: string;
  label: string;
  value: number;
  format: (n: number) => string;
  /** % change vs the previous period, or 'new'. */
  change?: number | 'new' | null;
  /** Lower is better. */
  invert?: boolean;
  /** Series for the sparkline. */
  spark?: number[];
  /** Gradient colours; `dark` text is used on light gradients. */
  colors: [string, string];
  dark?: boolean;
  /** Content revealed under the tile's row when it is tapped. */
  panel: React.ReactNode;
}

function MetricTile({ spec, selected, onPress }: { spec: MetricTileSpec; selected: boolean; onPress: () => void }) {
  const shown = useAnimatedNumber(spec.value);
  const ink = spec.dark ? COLORS.forestDeep : '#fff';
  const soft = spec.dark ? 'rgba(26,58,22,0.7)' : 'rgba(255,255,255,0.85)';
  let delta: string | null = null;
  let up = true;
  if (spec.change === 'new') delta = 'New';
  else if (typeof spec.change === 'number' && spec.change !== 0) {
    up = spec.invert ? spec.change < 0 : spec.change > 0;
    delta = `${spec.change > 0 ? '▲' : '▼'} ${Math.abs(spec.change)}%`;
  }
  return (
    <TouchableOpacity style={styles.tileWrap} activeOpacity={0.88} onPress={onPress} accessibilityRole="button" accessibilityLabel={spec.label}>
      <LinearGradient colors={spec.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tile, selected && styles.tileSelected]}>
        <View style={styles.tileTop}>
          <Text style={styles.tileEmoji}>{spec.emoji}</Text>
          {delta && (
            <View style={[styles.deltaPill, { backgroundColor: up ? 'rgba(255,255,255,0.28)' : 'rgba(194, 74, 59, 0.85)' }]}>
              <Text style={[styles.deltaText, { color: up ? ink : '#fff' }]}>{delta}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tileValue, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit>
          {spec.format(Math.round(shown))}
        </Text>
        <Text style={[styles.tileLabel, { color: soft }]} numberOfLines={1}>
          {spec.label}
        </Text>
        <View style={styles.sparkWrap}>
          <Sparkline values={spec.spark ?? []} color={spec.dark ? COLORS.forestDeep : '#fff'} />
        </View>
        <Text style={[styles.caret, { color: soft }]}>{selected ? '▴' : '▾'}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

/**
 * Two-column grid of colourful metric tiles. Tapping a tile opens its detail panel in place, right
 * under that tile's row, and closes any other – so the page stays short until you ask for more.
 */
export function TileGrid({ tiles }: { tiles: MetricTileSpec[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenId((cur) => (cur === id ? null : id));
  };

  const rows: MetricTileSpec[][] = [];
  for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));

  return (
    <View style={styles.grid}>
      {rows.map((row) => {
        const open = row.find((t) => t.id === openId);
        return (
          <View key={row.map((t) => t.id).join('-')}>
            <View style={styles.row}>
              {row.map((t) => (
                <MetricTile key={t.id} spec={t} selected={t.id === openId} onPress={() => toggle(t.id)} />
              ))}
              {row.length === 1 && <View style={styles.tileWrap} />}
            </View>
            {open && (
              <View style={[styles.panel, { borderTopColor: open.colors[0] }]}>
                <Text style={styles.panelTitle}>
                  {open.emoji} {open.label}
                </Text>
                {open.panel}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** A titled block inside an expanded tile panel (lighter than a full ReportSection card). */
export function PanelBlock({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.blockTitle}>{title}</Text>
      {subtitle ? <Text style={styles.blockSub}>{subtitle}</Text> : null}
      <View style={{ marginTop: 10 }}>{children}</View>
    </View>
  );
}

// ------------------------------------------------------------------ greeting

/** Mascot + a one-line verdict on the period, so the page opens with a mood, not a table. */
export function ReportGreeting({ title, verdict, detail }: { title: string; verdict: string; detail?: string }) {
  return (
    <LinearGradient colors={[COLORS.mint, COLORS.cream]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.greeting}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greetTitle}>{title}</Text>
        <Text style={styles.greetVerdict}>{verdict}</Text>
        {detail ? <Text style={styles.greetDetail}>{detail}</Text> : null}
      </View>
      <Mascot size={84} mood="proud" animate />
    </LinearGradient>
  );
}

/** How many of the headline numbers moved the right way, as a friendly sentence. */
export function verdictFor(changes: (number | 'new' | null | undefined)[], invert: boolean[] = []): { verdict: string; up: number; total: number } {
  let up = 0;
  let total = 0;
  changes.forEach((c, i) => {
    if (c == null) return;
    total += 1;
    if (c === 'new' || (typeof c === 'number' && (invert[i] ? c <= 0 : c >= 0) && c !== 0)) up += 1;
  });
  if (total === 0) return { verdict: 'Pick a recent period to see how you are trending.', up, total };
  const ratio = up / total;
  const verdict =
    ratio >= 0.75 ? `Fantastic – ${up} of ${total} numbers are up! 🎉` : ratio >= 0.5 ? `Going well – ${up} of ${total} numbers are up 🌱` : ratio > 0 ? `A mixed period – ${up} of ${total} numbers are up` : 'A quieter period than the last one – time to plant new ideas 💡';
  return { verdict, up, total };
}

const styles = StyleSheet.create({
  grid: { gap: 12, marginTop: 14 },
  row: { flexDirection: 'row', gap: 12 },
  tileWrap: { flex: 1 },
  tile: { borderRadius: 20, padding: 14, minHeight: 156, overflow: 'hidden' },
  tileSelected: { borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.9)' },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileEmoji: { fontSize: 26 },
  deltaPill: { borderRadius: 100, paddingVertical: 3, paddingHorizontal: 8 },
  deltaText: { fontSize: 11, fontWeight: '900' },
  tileValue: { fontSize: 30, fontWeight: '900', marginTop: 8 },
  tileLabel: { fontSize: 12, fontWeight: '700', marginTop: 1 },
  sparkWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, opacity: 0.9 },
  caret: { position: 'absolute', right: 12, bottom: 8, fontSize: 12, fontWeight: '900' },
  panel: {
    marginTop: 12,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderTopWidth: 5,
    padding: 16,
    gap: 16,
  },
  panelTitle: { fontSize: 17, fontWeight: '900', color: COLORS.textPrimary },
  blockTitle: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  blockSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: RADIUS.lg, padding: 18, marginTop: 14 },
  greetTitle: { fontSize: 12, fontWeight: '800', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  greetVerdict: { fontSize: 18, lineHeight: 24, fontWeight: '900', color: COLORS.forest, marginTop: 4 },
  greetDetail: { fontSize: 12, lineHeight: 17, color: COLORS.textSecondary, marginTop: 6 },
});
