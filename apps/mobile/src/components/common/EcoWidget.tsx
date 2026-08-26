import React from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Text } from './AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { GlassCard } from './GlassCard';
import { useSlideUp, useBreathing } from '../../hooks/useAnimations';
import { hexToRgba } from '../../utils/color';

interface EcoWidgetProps {
  icon: string;
  value: string | number;
  label: string;
  sublabel?: string;
  color?: string;
  gradientColors?: [string, string];
  delay?: number;
  onPress?: () => void;
  variant?: 'card' | 'glass' | 'minimal';
  /** Renders on a dark/frosted-glass basis (dark background, light text) instead of the default
   * light styling — for use over dark or variable-brightness backdrops (e.g. Home's time-of-day sky). */
  dark?: boolean;
  /** Time-of-day theme overrides for the 'glass' variant — when provided, these win over the
   * `dark` boolean's static look so the widget can be retinted per time-of-day period. Passing
   * `cardBackground` switches the card to a real BlurView + gradient wash (matching `ThemedCard`)
   * instead of the flat, non-blurred `GlassCard` fill. */
  cardBackground?: string;
  /** Second gradient stop for the wash — same idea as `theme.cardBackgroundAlt`. Falls back to
   * `cardBackground` (a flat wash) when omitted. */
  cardBackgroundAlt?: string;
  /** Alpha the wash colors are composited at over the blur — same idea as `theme.cardOverlayAlpha`. */
  cardOverlayAlpha?: number;
  textColor?: string;
  subTextColor?: string;
  borderColor?: string;
  /** Applied to the widget's outermost wrapper — how a caller gives it a width in a grid. */
  style?: StyleProp<ViewStyle>;
  /** Stretch to fill the wrapper. Needed for equal-size grid tiles: the flex has to reach the
   * card itself, or the row's `alignItems: 'stretch'` has nothing to equalise and the tiles come
   * out content-sized at different heights. */
  fill?: boolean;
}

export function EcoWidget({
  icon,
  value,
  label,
  sublabel,
  color = COLORS.sage,
  gradientColors,
  delay = 0,
  onPress,
  variant = 'card',
  dark = false,
  cardBackground,
  cardBackgroundAlt,
  cardOverlayAlpha = 1,
  textColor,
  subTextColor,
  borderColor,
  style,
  fill = false,
}: EcoWidgetProps) {
  const slideStyle = useSlideUp(delay, 20);
  const breathStyle = useBreathing(0.96, 1.04, 3500);
  const fillStyle = fill ? styles.fill : null;
  // The card itself needs more than `flex: 1`: `minWidth: 0` releases the 90px floor that would
  // otherwise overflow a three-across grid on a narrow phone, and the tighter horizontal padding
  // keeps two-word labels ("Upcoming drives") on two lines instead of three.
  const fillCardStyle = fill ? styles.fillCard : null;

  if (variant === 'glass') {
    const glassContent = (
      <>
        <Animated.Text style={[styles.glassIcon, breathStyle]}>{icon}</Animated.Text>
        <Text style={[styles.glassValue, { color }]}>{value}</Text>
        <Text style={[styles.glassLabel, dark && styles.glassLabelDark, textColor && { color: textColor }]}>{label}</Text>
        {sublabel && (
          <Text style={[styles.glassSublabel, dark && styles.glassSublabelDark, subTextColor && { color: subTextColor }]}>
            {sublabel}
          </Text>
        )}
      </>
    );

    // Time-themed usage (cardBackground given): a real BlurView + gradient wash, same recipe as
    // `ThemedCard` — GlassCard's flat rgba fill gets fully overwritten by an opaque theme color
    // otherwise, which is why these tiles used to look like plain cards instead of glass.
    if (cardBackground) {
      return (
        <Animated.View style={[slideStyle, style]}>
          <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress} style={fillStyle}>
            <BlurView
              intensity={35}
              tint={dark ? 'dark' : 'light'}
              experimentalBlurMethod="dimezisBlurView"
              style={[styles.glassWidgetThemed, { borderColor: borderColor ?? cardBackground }, fillCardStyle]}
            >
              <LinearGradient
                colors={[
                  hexToRgba(cardBackground, cardOverlayAlpha),
                  hexToRgba(cardBackgroundAlt ?? cardBackground, cardOverlayAlpha),
                ]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.glassWidgetContent}>{glassContent}</View>
            </BlurView>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={[slideStyle, style]}>
        <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress} style={fillStyle}>
          <GlassCard variant={dark ? 'dark' : 'light'} style={[styles.glassWidget, fillCardStyle]}>
            {glassContent}
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'minimal') {
    return (
      <Animated.View style={[styles.minimalWidget, slideStyle, style]}>
        <Text style={styles.minimalIcon}>{icon}</Text>
        <View>
          <Text style={[styles.minimalValue, { color }]}>{value}</Text>
          <Text style={styles.minimalLabel}>{label}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[slideStyle, style]}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress} style={fillStyle}>
        {gradientColors ? (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientWidget, fillCardStyle]}
          >
            <Animated.Text style={[styles.icon, breathStyle]}>{icon}</Animated.Text>
            <Text style={styles.valueWhite}>{value}</Text>
            <Text style={styles.labelWhite}>{label}</Text>
            {sublabel && <Text style={styles.sublabelWhite}>{sublabel}</Text>}
          </LinearGradient>
        ) : (
          <View style={[styles.widget, SHADOWS.md, fillCardStyle]}>
            <Text style={styles.icon}>{icon}</Text>
            <Text style={[styles.value, { color }]}>{value}</Text>
            <Text style={styles.label}>{label}</Text>
            {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function StreakWidget({ streak, isActive }: { streak: number; isActive: boolean }) {
  const breathStyle = useBreathing(0.95, 1.05, 1800);

  return (
    <View style={streakStyles.container}>
      <LinearGradient
        colors={isActive ? ['#FF6B35', '#FFD700'] : ['#C4B49A', '#9E8E78']}
        style={streakStyles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.Text style={[streakStyles.fire, breathStyle]}>
          {isActive ? '🔥' : '💤'}
        </Animated.Text>
        <Text style={streakStyles.count}>{streak}</Text>
        <Text style={streakStyles.label}>day{streak !== 1 ? 's' : ''}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  fillCard: { flex: 1, minWidth: 0, paddingHorizontal: 8, justifyContent: 'center' },
  widget: {
    backgroundColor: COLORS.beigeLight,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    // A uniform border, not `borderLeftWidth` — a left-only border against this
    // radius renders as a crescent hugging the corner rather than an accent bar.
    borderWidth: 1,
    borderColor: COLORS.sand,
    minWidth: 90,
  },
  gradientWidget: {
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    minWidth: 90,
    ...SHADOWS.sage,
  },
  glassWidget: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  glassWidgetThemed: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 90,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  // The gradient wash is an absolute fill, so content needs its own stacking context above it.
  glassWidgetContent: { alignItems: 'center', position: 'relative' },
  minimalWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
  },
  icon: {
    fontSize: 24,
    marginBottom: 6,
  },
  glassIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  minimalIcon: {
    fontSize: 28,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  valueWhite: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  glassValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  minimalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelWhite: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  glassLabel: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  glassLabelDark: {
    color: COLORS.white,
  },
  minimalLabel: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  sublabel: {
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  sublabelWhite: {
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.white,
    marginTop: 2,
  },
  glassSublabel: {
    textAlign: 'center',
    fontSize: 10,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  glassSublabelDark: {
    color: COLORS.white,
  },
});

const streakStyles = StyleSheet.create({
  container: {
    ...SHADOWS.golden,
  },
  gradient: {
    borderRadius: RADIUS.xl,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  fire: {
    fontSize: 28,
    marginBottom: 2,
  },
  count: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    lineHeight: 30,
  },
  label: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
