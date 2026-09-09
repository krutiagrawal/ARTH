import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/colors';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { useSlideUp } from '../../hooks/useAnimations';

// Approximate one-way NY↔LA flight emissions per passenger, used only to give the CO₂ number a
// relatable frame of reference — not a precise figure.
const AVG_FLIGHT_CO2_KG = 180;

export interface ImpactStat {
  value: string | number;
  label: string;
}

export function ImpactStatsCard({
  co2,
  treesPlanted,
  daysActive,
  title,
  stats,
}: {
  co2: number;
  treesPlanted: number;
  daysActive: number;
  /** Overrides the default "🌍 Your Total Impact" heading. */
  title?: string;
  /** Overrides the fixed CO₂/trees/days row — for roles (NGO, Nursery, Group) with different
   * stat sets. The flights-equivalent footer only makes sense for the default CO₂ row, so it's
   * skipped whenever this is set. */
  stats?: ImpactStat[];
}) {
  const slideStyle = useSlideUp(150, 20);
  const flightsOffset = Math.max(0, co2 / AVG_FLIGHT_CO2_KG);
  const flightsLabel = flightsOffset >= 0.1 ? flightsOffset.toFixed(1) : '0';

  const rows: ImpactStat[] = stats ?? [
    { value: `${co2.toFixed(1)}kg`, label: 'CO₂ Absorbed' },
    { value: treesPlanted, label: 'Trees Planted' },
    { value: daysActive, label: 'Days Active' },
  ];

  return (
    <Animated.View style={slideStyle}>
      <LinearGradient
        colors={[COLORS.nightForest, COLORS.forest]}
        style={styles.impactCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.impactTitle}>{title ?? '🌍 Your Total Impact'}</Text>
        <View style={styles.impactRow}>
          {rows.map((s) => (
            <View key={s.label} style={styles.impactStat}>
              <Text style={styles.impactNum}>{s.value}</Text>
              <Text style={styles.impactLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
        {!stats && (
          <View style={styles.impactEquivalent}>
            <Text style={styles.impactEquivText}>
              ≈ Offsetting {flightsLabel} NY–LA flight{flightsOffset === 1 ? '' : 's'} ✈️
            </Text>
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  impactCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    gap: 12,
    ...SHADOWS.md,
  },
  impactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactStat: {
    alignItems: 'center',
  },
  impactNum: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  impactLabel: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  impactEquivalent: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.md,
    padding: 10,
  },
  impactEquivText: {
    fontSize: 12,
    color: COLORS.white,
    textAlign: 'center',
    fontWeight: '500',
  },
});
