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

export function ImpactStatsCard({
  co2,
  treesPlanted,
  daysActive,
}: {
  co2: number;
  treesPlanted: number;
  daysActive: number;
}) {
  const slideStyle = useSlideUp(150, 20);
  const flightsOffset = Math.max(0, co2 / AVG_FLIGHT_CO2_KG);
  const flightsLabel = flightsOffset >= 0.1 ? flightsOffset.toFixed(1) : '0';

  return (
    <Animated.View style={slideStyle}>
      <LinearGradient
        colors={[COLORS.nightForest, COLORS.forest]}
        style={styles.impactCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={styles.impactTitle}>🌍 Your Total Impact</Text>
        <View style={styles.impactRow}>
          <View style={styles.impactStat}>
            <Text style={styles.impactNum}>{co2.toFixed(1)}kg</Text>
            <Text style={styles.impactLabel}>CO₂ Absorbed</Text>
          </View>
          <View style={styles.impactStat}>
            <Text style={styles.impactNum}>{treesPlanted}</Text>
            <Text style={styles.impactLabel}>Trees Planted</Text>
          </View>
          <View style={styles.impactStat}>
            <Text style={styles.impactNum}>{daysActive}</Text>
            <Text style={styles.impactLabel}>Days Active</Text>
          </View>
        </View>
        <View style={styles.impactEquivalent}>
          <Text style={styles.impactEquivText}>
            ≈ Offsetting {flightsLabel} NY–LA flight{flightsOffset === 1 ? '' : 's'} ✈️
          </Text>
        </View>
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
