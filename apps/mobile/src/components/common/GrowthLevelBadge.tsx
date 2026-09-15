import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { COLORS, ON_DARK_SURFACE, ON_LIGHT_SURFACE } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import type { NurseryGrowthLevel } from '../../api/nursery';

// Tenure + lifetime-volume tiers — independent of ARTH Trust Score (see TrustScoreGauge). A
// highly reliable but new/low-volume nursery can be "Growing" even with a high trust score.
export const GROWTH_LEVEL_META: Record<NurseryGrowthLevel, { emoji: string; label: string; color: string }> = {
  seedling: { emoji: '🌱', label: 'Seedling', color: COLORS.sageLight },
  growing: { emoji: '🪴', label: 'Growing', color: COLORS.sage },
  established: { emoji: '🌳', label: 'Established', color: COLORS.sageDark },
  evergreen: { emoji: '🌲', label: 'Evergreen', color: COLORS.forest },
};

interface GrowthLevelBadgeProps {
  level: NurseryGrowthLevel;
  size?: 'sm' | 'md';
  variant?: 'dark' | 'light';
}

export function GrowthLevelBadge({ level, size = 'md', variant = 'dark' }: GrowthLevelBadgeProps) {
  const meta = GROWTH_LEVEL_META[level];
  const onSurface = variant === 'dark' ? ON_DARK_SURFACE : ON_LIGHT_SURFACE;
  const small = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: `${meta.color}33`, borderColor: meta.color },
        small && styles.badgeSmall,
      ]}
    >
      <Text style={[styles.emoji, small && styles.emojiSmall]}>{meta.emoji}</Text>
      <Text style={[styles.label, { color: onSurface.primary }, small && styles.labelSmall]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  badgeSmall: { paddingVertical: 4, paddingHorizontal: 8, gap: 4 },
  emoji: { fontSize: 16 },
  emojiSmall: { fontSize: 13 },
  label: { fontSize: 13, fontWeight: '700' },
  labelSmall: { fontSize: 11 },
});
