import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { SPACING, RADIUS } from '../../constants/theme';
import { TYPOGRAPHY } from '../../constants/typography';
import { RARITY_COLORS } from '../common/AchievementGrid';
import type { ApiAchievement } from '../../api/achievements';

export function AchievementShareCard({ achievement }: { achievement: ApiAchievement | null }) {
  if (!achievement) return null;
  const rarityColors = RARITY_COLORS[achievement.rarity];

  return (
    <View style={styles.fill}>
      <LinearGradient colors={GRADIENTS.deepForest as any} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <LinearGradient colors={rarityColors} style={styles.iconBg}>
          <Text style={styles.icon}>{achievement.icon}</Text>
        </LinearGradient>

        <Text style={styles.rarity}>{achievement.rarity.toUpperCase()}</Text>
        <Text style={styles.title} numberOfLines={2}>{achievement.title}</Text>
        <Text style={styles.description} numberOfLines={3}>{achievement.description}</Text>
        <Text style={styles.unlocked}>✓ Unlocked</Text>

        <Text style={styles.watermark}>🌱 Earned on ARTH</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  iconBg: {
    width: 120,
    height: 120,
    borderRadius: RADIUS.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 64,
  },
  rarity: {
    ...TYPOGRAPHY.kicker,
    color: COLORS.mintLight,
    marginTop: SPACING.lg,
  },
  title: {
    ...TYPOGRAPHY.display2,
    color: COLORS.white,
    marginTop: 8,
    textAlign: 'center',
  },
  description: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  unlocked: {
    ...TYPOGRAPHY.label,
    color: COLORS.mintLight,
    marginTop: SPACING.md,
  },
  watermark: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.7)',
    position: 'absolute',
    bottom: SPACING.lg,
  },
});
