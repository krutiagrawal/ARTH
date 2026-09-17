import React, { type RefObject } from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Text } from './AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { GlassCard } from './GlassCard';
import { BorderCard } from './BorderCard';
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
  variant?: 'card' | 'glass' | 'outline' | 'minimal';
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
  /** Ref to the screen's `BlurTargetView` — required on Android for the 'glass' + `cardBackground`
   * variant's `BlurView` to actually blur (otherwise it silently falls back to a flat tint there). */
  blurTarget?: RefObject<View | null>;
  /** Applied to the widget's outermost wrapper — how a caller gives it a width in a grid. */
  style?: StyleProp<ViewStyle>;
  /** Stretch to fill the wrapper. Needed for equal-size grid tiles: the flex has to reach the
   * card itself, or the row's `alignItems: 'stretch'` has nothing to equalise and the tiles come
   * out content-sized at different heights. */
  fill?: boolean;
  /** Only applies with `fill`. `fill`'s width always comes from `flex: 1` (an equal share of the
   * row), never from padding — so a `fill` tile's height, which IS content/padding-driven, ends
   * up shorter than that flex-assigned width on typical phone screens, reading as a wide
   * horizontal capsule instead of a tile. Pass an explicit floor here to force the card taller
   * than it is wide regardless of how much icon/value/label content it holds. */
  fillMinHeight?: number;
  /** Shrinks the icon/value/label text a step down from the default 'glass' sizing — for small
   * tiles (e.g. a short `fillMinHeight`) where the default sizing reads as oversized/cramped. */
  compact?: boolean;
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
  blurTarget,
  style,
  fill = false,
  fillMinHeight,
  compact = false,
}: EcoWidgetProps) {
  const slideStyle = useSlideUp(delay, 20);
  const breathStyle = useBreathing(0.96, 1.04, 3500);
  const fillStyle = fill ? styles.fill : null;
  // The card itself needs more than `flex: 1`: `minWidth: 0` releases the 90px floor that would
  // otherwise overflow a three-across grid on a narrow phone, and the tighter horizontal padding
  // keeps two-word labels ("Upcoming drives") on two lines instead of three.
  const fillCardStyle = fill ? [styles.fillCard, fillMinHeight != null && { minHeight: fillMinHeight }] : null;

  if (variant === 'glass') {
    const glassContent = (
      <>
        <Animated.Text style={[styles.glassIcon, compact && styles.glassIconCompact, breathStyle]}>{icon}</Animated.Text>
        <Text
          style={[styles.glassValue, compact && styles.glassValueCompact, { color }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {value}
        </Text>
        <Text
          style={[styles.glassLabel, compact && styles.glassLabelCompact, dark && styles.glassLabelDark, textColor && { color: textColor }]}
          numberOfLines={compact ? 1 : undefined}
          adjustsFontSizeToFit={compact}
          minimumFontScale={0.7}
        >
          {label}
        </Text>
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
              blurTarget={blurTarget}
              style={[
                styles.glassWidgetThemed,
                { borderColor: borderColor ?? cardBackground, borderTopColor: 'rgba(255,255,255,0.4)' },
                fillCardStyle,
              ]}
            >
              <LinearGradient
                colors={[
                  hexToRgba(cardBackground, cardOverlayAlpha),
                  hexToRgba(cardBackgroundAlt ?? cardBackground, cardOverlayAlpha),
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

  // Brown-border, no-fill replacement for `variant="glass"` used everywhere except Home (which
  // keeps the real glass-over-illustrated-sky look). Ignores the theme-tinted glass props
  // (`cardBackground`/`dark`/etc.) entirely — those existed to keep text legible against a live
  // sky illustration, which no longer applies once the fill is gone.
  if (variant === 'outline') {
    return (
      <Animated.View style={[slideStyle, style]}>
        <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress} style={fillStyle}>
          <BorderCard noPadding style={[styles.glassWidget, fillCardStyle]}>
            <Animated.Text style={[styles.glassIcon, breathStyle]}>{icon}</Animated.Text>
            <Text style={[styles.glassValue, { color }]}>{value}</Text>
            <Text style={[styles.glassLabel, textColor && { color: textColor }]}>{label}</Text>
            {sublabel && (
              <Text style={[styles.glassSublabel, subTextColor && { color: subTextColor }]}>{sublabel}</Text>
            )}
          </BorderCard>
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
  glassIconCompact: {
    fontSize: 18,
    marginBottom: 2,
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
  glassValueCompact: {
    fontSize: 14,
    marginBottom: 0,
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
  glassLabelCompact: {
    fontSize: 9,
    letterSpacing: 0.3,
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
