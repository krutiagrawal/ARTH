import React, { type RefObject } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { hexToRgba } from '../../utils/color';
import type { TimeTheme } from '../../hooks/useTimeTheme';

/**
 * A card that retints with the time-of-day scenery, the way Home's mission/quest cards do.
 *
 * Use this instead of `GlassCard variant="warm"` on any surface that sits on a page whose
 * background follows `getHeroSeamColor` — a fixed cream card looks fine at Morning and wrong at
 * Night, and the dark text on it disappears entirely once the page goes indigo.
 *
 * `theme.cardOverlayAlpha` (not a fixed alpha) drives the wash: the tint is composited over
 * whatever is behind it, so periods with a dark backdrop need a stronger wash for the card to
 * still read as its own colour rather than blending into the page.
 */
export function ThemedCard({
  theme,
  children,
  style,
  borderRadius = RADIUS.lg,
  noPadding = false,
  blurTarget,
}: {
  theme: TimeTheme;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  noPadding?: boolean;
  /** Ref to the screen's `BlurTargetView` — required on Android for this to actually blur. */
  blurTarget?: RefObject<View | null>;
}) {
  return (
    <BlurView
      intensity={35}
      tint={theme.cardTint === 'dark' ? 'dark' : 'light'}
      blurTarget={blurTarget}
      style={[
        styles.card,
        { borderRadius, borderColor: theme.cardBorder, borderTopColor: 'rgba(255,255,255,0.4)' },
        !noPadding && styles.padding,
        style,
      ]}
    >
      <LinearGradient
        colors={[
          hexToRgba(theme.cardBackground, theme.cardOverlayAlpha),
          hexToRgba(theme.cardBackgroundAlt, theme.cardOverlayAlpha),
        ]}
        style={StyleSheet.absoluteFill}
      />
      {/* Fake glass sheen — Android has no real live blur here, see HomeScreen.tsx. */}
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 0.8 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.content}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    ...SHADOWS.md,
  },
  padding: { padding: 16 },
  // The gradient is an absolute fill, so content needs its own stacking context to sit above it.
  content: { position: 'relative' },
});
