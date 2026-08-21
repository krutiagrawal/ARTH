import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { TYPOGRAPHY } from '../../constants/typography';
import { hexToRgba } from '../../utils/color';
import type { ApiTree } from '../../api/trees';
import type { TimeTheme } from '../../hooks/useTimeTheme';

const GROWTH_STAGE_EMOJI = ['🌱', '🌿', '🌳', '🌲', '🎋'];
const GROWTH_STAGE_LABEL = ['Seedling', 'Sprouting', 'Growing', 'Maturing', 'Flourishing'];

/**
 * Shared tree-summary card — same TREE NAME → species → status/health → location hierarchy
 * everywhere a tree gets shown (Home's recent trees, Map's selected-tree card). `size="chip"` is
 * a compact horizontal-scroll card; `size="card"` is a larger standalone card (e.g. a map bottom
 * sheet). Accepts an optional time-of-day `theme` so it can retint on Home; falls back to a
 * fixed dark-glass look elsewhere.
 */

interface TreeCardProps {
  tree: ApiTree;
  size?: 'chip' | 'card';
  onPress?: () => void;
  theme?: TimeTheme | null;
  style?: StyleProp<ViewStyle>;
}

export function TreeCard({ tree, size = 'chip', onPress, theme, style }: TreeCardProps) {
  const isCard = size === 'card';
  const nameColor = theme?.textPrimaryOnCard ?? COLORS.textWhite;
  const secondaryColor = theme?.textSecondaryOnCard ?? COLORS.textWhite;
  const accentColor = theme?.accentColor ?? COLORS.sageLight;
  const accentSoft = theme?.accentColorSoft ?? 'rgba(255,255,255,0.15)';
  const borderColor = theme?.cardBorder ?? 'rgba(255,255,255,0.18)';
  const bgTint = theme?.cardBackground
    ? hexToRgba(theme.cardBackground, theme.cardOverlayAlpha ?? 0.4)
    : 'rgba(13,35,24,0.4)';
  const stageIndex = tree.growthStage - 1;

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper activeOpacity={onPress ? 0.85 : undefined} onPress={onPress}>
      <BlurView
        intensity={35}
        tint={theme?.cardTint === 'dark' || !theme ? 'dark' : 'light'}
        experimentalBlurMethod="dimezisBlurView"
        style={[
          isCard ? styles.card : styles.chip,
          { borderColor, borderWidth: 1 },
          style,
        ]}
      >
        <View style={[StyleSheet.absoluteFill, { backgroundColor: bgTint }]} />
        <Text style={isCard ? styles.cardEmoji : styles.chipEmoji}>{GROWTH_STAGE_EMOJI[stageIndex]}</Text>
        <Text
          style={[isCard ? styles.cardName : styles.chipName, { color: nameColor }]}
          numberOfLines={1}
        >
          {tree.nickname}
        </Text>
        <Text style={[isCard ? styles.cardSpecies : styles.chipSpecies, { color: secondaryColor }]} numberOfLines={1}>
          {tree.species}
        </Text>
        <View style={[styles.growthBar, { backgroundColor: accentSoft }]}>
          <View
            style={[styles.growthFill, { width: `${(tree.growthStage / 5) * 100}%`, backgroundColor: accentColor }]}
          />
        </View>
        <Text style={[styles.statusLine, { color: secondaryColor }]} numberOfLines={1}>
          {GROWTH_STAGE_LABEL[stageIndex]}
          {isCard ? ` · Planted ${new Date(tree.plantedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
        </Text>
        {tree.location ? (
          <Text style={[styles.locationLine, { color: secondaryColor }]} numberOfLines={1}>
            📍 {tree.location.split(',')[0]}
          </Text>
        ) : null}
      </BlurView>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  chip: {
    width: 130,
    alignItems: 'center',
    padding: 14,
    gap: 4,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  card: {
    width: '100%',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: 6,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  chipEmoji: {
    fontSize: 36,
    marginBottom: 4,
  },
  cardEmoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  chipName: {
    ...TYPOGRAPHY.h4,
  },
  cardName: {
    ...TYPOGRAPHY.h2,
  },
  chipSpecies: {
    ...TYPOGRAPHY.caption,
  },
  cardSpecies: {
    ...TYPOGRAPHY.body,
  },
  growthBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 4,
  },
  growthFill: {
    height: '100%',
    borderRadius: 2,
  },
  statusLine: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },
  locationLine: {
    ...TYPOGRAPHY.caption,
    textAlign: 'center',
  },
});
