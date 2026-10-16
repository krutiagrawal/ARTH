import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/theme';
import { TYPOGRAPHY } from '../../constants/typography';

// Same frame of reference as ImpactStatsCard's footer.
const AVG_FLIGHT_CO2_KG = 180;

interface Props {
  name?: string | null;
  co2: number;
  treesPlanted: number;
  streak: number;
}

/**
 * Stories-sized (9:16) "my impact" poster: one hero number (CO₂), two supporting figures, and a
 * quiet footer. Deliberately sparse – it's captured as an image, so it has to read at a glance.
 */
export function ImpactShareCard({ name, co2, treesPlanted, streak }: Props) {
  const flights = Math.max(0, co2 / AVG_FLIGHT_CO2_KG);
  const flightsLabel = flights >= 0.1 ? flights.toFixed(1) : '0';

  return (
    <LinearGradient colors={['#0D2318', '#173D1C', '#2D5A27']} style={styles.fill} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }}>
      {/* Tree silhouette behind the hero number */}
      <View style={styles.treeWrap} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox="0 0 200 240" preserveAspectRatio="xMidYMid meet">
          {/* Ground shadow */}
          <Ellipse cx="100" cy="236" rx="52" ry="4" fill="#87A878" opacity={0.12} />
          {/* One continuous outline: scalloped oak crown flowing into a flared trunk */}
          <Path
            d="M100 12 C119 5 142 14 147 31 C166 29 184 45 180 65 C196 76 197 100 183 112
               C192 130 177 150 156 151 C148 161 133 164 119 158 L111 160
               C110 190 108 214 118 234 C108 232 92 232 82 234 C92 214 90 190 89 160 L81 158
               C66 165 49 161 43 150 C23 150 11 132 19 114 C5 102 8 78 24 68
               C20 48 38 31 56 34 C62 16 85 7 100 12 Z"
            fill="#87A878"
            opacity={0.2}
          />
        </Svg>
      </View>

      <View style={styles.top}>
        <Text style={styles.kicker}>MY ARTH IMPACT</Text>
        <Text style={styles.name} numberOfLines={2} adjustsFontSizeToFit>
          {name ? `${name}'s forest` : 'My forest'}
        </Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroNumber} numberOfLines={1} adjustsFontSizeToFit>
          {co2.toFixed(1)}
        </Text>
        <Text style={styles.heroUnit}>kg of CO₂ absorbed</Text>
        <View style={styles.flightsPill}>
          <Text style={styles.flightsText}>≈ {flightsLabel} NY–LA flight{flights === 1 ? '' : 's'} offset</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>{treesPlanted}</Text>
            <Text style={styles.statLabel}>{treesPlanted === 1 ? 'Tree planted' : 'Trees planted'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>{streak}</Text>
            <Text style={styles.statLabel}>{'Day streak'}</Text>
          </View>
        </View>
        <Text style={styles.watermark}>🌱 Growing my impact with ARTH</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  treeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '12%',
    height: '62%',
  },
  top: {
    alignItems: 'center',
  },
  kicker: {
    ...TYPOGRAPHY.kicker,
    color: COLORS.sageLight,
    letterSpacing: 2.4,
  },
  name: {
    ...TYPOGRAPHY.display2,
    color: COLORS.cream,
    marginTop: 6,
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
  },
  heroNumber: {
    fontSize: 76,
    lineHeight: 84,
    fontWeight: '800',
    letterSpacing: -2,
    color: COLORS.golden,
    maxWidth: '100%',
  },
  heroUnit: {
    ...TYPOGRAPHY.label,
    color: COLORS.mintLight,
    marginTop: 2,
  },
  flightsPill: {
    marginTop: SPACING.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(212,168,83,0.5)',
  },
  flightsText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.cream,
    fontWeight: '600',
  },
  bottom: {
    gap: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(232,245,225,0.18)',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(232,245,225,0.18)',
  },
  statNumber: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    color: COLORS.cream,
    maxWidth: '90%',
  },
  statLabel: {
    ...TYPOGRAPHY.label,
    color: COLORS.sageLight,
    marginTop: 2,
  },
  watermark: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
});
