import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, ON_DARK_SURFACE, ON_LIGHT_SURFACE } from '../../constants/colors';
import { RADIUS, SHADOWS, SPACING } from '../../constants/theme';

export type GlassCardVariant = 'light' | 'dark' | 'sage' | 'golden' | 'warm';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassCardVariant;
  intensity?: number;
  borderRadius?: number;
  noPadding?: boolean;
  animated?: boolean;
}

/**
 * Which text tokens (primary/secondary/muted) read legibly on a given `GlassCard` variant.
 * `dark` is the only variant dark enough to need light text — the rest (`light`/`sage`/
 * `golden`/`warm`) are all pale/cream-ish washes that need the app's normal dark text. Screens
 * should pull text color from this instead of independently guessing `COLORS.white` vs.
 * `textPrimary` next to a `variant=` prop, which is how several headers ended up white-on-cream.
 */
export function getTextColorForVariant(variant: GlassCardVariant) {
  return variant === 'dark' ? ON_DARK_SURFACE : ON_LIGHT_SURFACE;
}

export function GlassCard({
  children,
  style,
  variant = 'light',
  intensity = 20,
  borderRadius = RADIUS.lg,
  noPadding = false,
  animated = false,
}: GlassCardProps) {
  const variantStyles = {
    light: {
      backgroundColor: 'rgba(255, 255, 255, 0.18)',
      borderColor: 'rgba(255, 255, 255, 0.35)',
    },
    dark: {
      backgroundColor: 'rgba(13, 35, 24, 0.55)',
      borderColor: 'rgba(135, 168, 120, 0.2)',
    },
    sage: {
      backgroundColor: COLORS.glassSage,
      borderColor: 'rgba(135, 168, 120, 0.35)',
    },
    golden: {
      backgroundColor: 'rgba(212, 168, 83, 0.15)',
      borderColor: 'rgba(212, 168, 83, 0.3)',
    },
    warm: {
      backgroundColor: 'rgba(245, 237, 214, 0.6)',
      borderColor: 'rgba(168, 128, 90, 0.2)',
    },
  };

  const cardStyle = [
    styles.card,
    variantStyles[variant],
    { borderRadius },
    !noPadding && styles.padding,
    variant === 'light' ? SHADOWS.md : variant === 'dark' ? {} : SHADOWS.sm,
    style,
  ];

  return (
    <View style={cardStyle}>
      {children}
    </View>
  );
}

export function BlurCard({
  children,
  style,
  intensity = 25,
  borderRadius = RADIUS.lg,
  noPadding = false,
  tint = 'light',
}: Omit<GlassCardProps, 'variant' | 'style'> & { style?: StyleProp<ViewStyle>; tint?: 'light' | 'dark' }) {
  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[
        styles.blurCard,
        tint === 'dark' && styles.blurCardDark,
        { borderRadius, overflow: 'hidden' },
        !noPadding && styles.padding,
        style,
      ]}
    >
      <View style={[styles.blurOverlay, tint === 'dark' && styles.blurOverlayDark, { borderRadius }]} />
      {children}
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
  blurCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  blurCardDark: {
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  blurOverlayDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
});
