import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { COLORS, ON_DARK_SURFACE, ON_LIGHT_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import type { WeeklyStreakWeek } from '../../api/nurseryReputation';

interface ContributionStreakCardProps {
  icon: string;
  title: string;
  subtitle: string;
  current: number;
  longest: number;
  unit?: string;
  weeks?: WeeklyStreakWeek[];
  variant?: 'dark' | 'light';
}

/** One weekly contribution streak (Supply / Inventory Freshness / ARTH Contribution) or the
 * event-driven Fulfilment Streak (pass weeks=undefined to hide the dot row for that one). */
export function ContributionStreakCard({
  icon,
  title,
  subtitle,
  current,
  longest,
  unit = 'weeks',
  weeks,
  variant = 'dark',
}: ContributionStreakCardProps) {
  const onSurface = variant === 'dark' ? ON_DARK_SURFACE : ON_LIGHT_SURFACE;
  const surfaceBg = variant === 'dark' ? 'rgba(255,255,255,0.08)' : COLORS.beigeLight;

  return (
    <View style={[styles.card, { backgroundColor: surfaceBg }]}>
      <View style={styles.headerRow}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: onSurface.primary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: onSurface.muted }]}>{subtitle}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View>
          <Text style={[styles.statValue, { color: COLORS.streakFire }]}>{current}</Text>
          <Text style={[styles.statLabel, { color: onSurface.muted }]}>Current {unit}</Text>
        </View>
        <View>
          <Text style={[styles.statValue, { color: onSurface.primary }]}>{longest}</Text>
          <Text style={[styles.statLabel, { color: onSurface.muted }]}>Best {unit}</Text>
        </View>
      </View>

      {weeks && weeks.length > 0 && (
        <View style={styles.dotsRow}>
          {weeks.map((w, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: w.met ? COLORS.sage : 'rgba(255,255,255,0.15)' }]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 26 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 28 },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 11, marginTop: 2 },
  dotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
