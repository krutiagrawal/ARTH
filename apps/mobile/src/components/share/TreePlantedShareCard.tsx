import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from '../common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { SPACING } from '../../constants/theme';
import { TYPOGRAPHY } from '../../constants/typography';
import type { ApiTree } from '../../api/trees';

export function TreePlantedShareCard({ tree, imageUri }: { tree: ApiTree | null; imageUri?: string | null }) {
  if (!tree) return null;
  const photo = imageUri ?? tree.photoUri;

  return (
    <View style={styles.fill}>
      {photo ? (
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient colors={GRADIENTS.deepForest as any} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(13,35,24,0.55)', 'rgba(13,35,24,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Text style={styles.speciesEmoji}>{tree.speciesEmoji}</Text>
        <Text style={styles.kicker}>JUST PLANTED</Text>
        <Text style={styles.name} numberOfLines={2}>{tree.nickname || tree.species}</Text>
        {tree.location ? <Text style={styles.location}>📍 {tree.location}</Text> : null}

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{tree.co2Absorbed.toFixed(1)}kg</Text>
            <Text style={styles.statLabel}>CO₂/yr</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>+{tree.xpEarned}</Text>
            <Text style={styles.statLabel}>XP earned</Text>
          </View>
        </View>

        <Text style={styles.watermark}>🌱 Planted with ARTH</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: SPACING.lg,
  },
  speciesEmoji: {
    fontSize: 40,
  },
  kicker: {
    ...TYPOGRAPHY.kicker,
    color: COLORS.mintLight,
    marginTop: SPACING.sm,
  },
  name: {
    ...TYPOGRAPHY.display2,
    color: COLORS.white,
    marginTop: 4,
  },
  location: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    marginTop: SPACING.lg,
  },
  stat: {},
  statValue: {
    ...TYPOGRAPHY.numberSmall,
    color: COLORS.white,
  },
  statLabel: {
    ...TYPOGRAPHY.label,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  watermark: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.xl,
  },
});
