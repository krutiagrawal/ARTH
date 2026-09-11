import React, { type RefObject } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { RADIUS, SPACING } from '../../constants/theme';
import { hexToRgba } from '../../utils/color';
import type { TimeTheme } from '../../hooks/useTimeTheme';

/**
 * Time-themed glass card used on the Corporate/Group/NGO/Nursery dashboards' non-hero sections —
 * a real BlurView + gradient wash tinted from the current time-of-day theme, same recipe as
 * `EcoWidget`'s `cardBackground` branch and Home's `EcoFactCard`. Falls back to a flat card if
 * `theme` isn't passed (shouldn't happen at any current call site, but keeps this from crashing).
 */
export function ThemedCard({
  children,
  style,
  theme,
  borderRadius = RADIUS.lg,
  noPadding = false,
  blurTarget,
}: {
  theme?: TimeTheme;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  noPadding?: boolean;
  blurTarget?: RefObject<View | null>;
}) {
  if (!theme) {
    return (
      <View style={[styles.plainFallback, { borderRadius }, !noPadding && styles.padding, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={35}
      tint={theme.cardTint === 'dark' ? 'dark' : 'light'}
      blurTarget={blurTarget}
      style={[
        styles.card,
        { borderRadius, borderColor: theme.cardBorder, borderTopColor: 'rgba(255,255,255,0.4)' },
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
      <View style={!noPadding && styles.padding}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  padding: {
    padding: SPACING.md,
  },
  plainFallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
});
