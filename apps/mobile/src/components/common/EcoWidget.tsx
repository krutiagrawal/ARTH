import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { GlassCard } from './GlassCard';
import { useSlideUp, useBreathing } from '../../hooks/useAnimations';

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
   * `dark` boolean's static look so the widget can be retinted per time-of-day period. */
  cardBackground?: string;
  textColor?: string;
  subTextColor?: string;
  borderColor?: string;
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
  textColor,
  subTextColor,
  borderColor,
}: EcoWidgetProps) {
  const slideStyle = useSlideUp(delay, 20);
  const breathStyle = useBreathing(0.96, 1.04, 3500);

  if (variant === 'glass') {
    const themedCardStyle = cardBackground
      ? { backgroundColor: cardBackground, borderColor: borderColor ?? cardBackground }
      : null;

    return (
      <Animated.View style={slideStyle}>
        <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress}>
          <GlassCard variant={dark ? 'dark' : 'light'} style={[styles.glassWidget, themedCardStyle]}>
            <Animated.Text style={[styles.glassIcon, breathStyle]}>{icon}</Animated.Text>
            <Text style={[styles.glassValue, { color }]}>{value}</Text>
            <Text style={[styles.glassLabel, dark && styles.glassLabelDark, textColor && { color: textColor }]}>{label}</Text>
            {sublabel && (
              <Text style={[styles.glassSublabel, dark && styles.glassSublabelDark, subTextColor && { color: subTextColor }]}>
                {sublabel}
              </Text>
            )}
          </GlassCard>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'minimal') {
    return (
      <Animated.View style={[styles.minimalWidget, slideStyle]}>
        <Text style={styles.minimalIcon}>{icon}</Text>
        <View>
          <Text style={[styles.minimalValue, { color }]}>{value}</Text>
          <Text style={styles.minimalLabel}>{label}</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={slideStyle}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={!onPress}>
        {gradientColors ? (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientWidget}
          >
            <Animated.Text style={[styles.icon, breathStyle]}>{icon}</Animated.Text>
            <Text style={styles.valueWhite}>{value}</Text>
            <Text style={styles.labelWhite}>{label}</Text>
            {sublabel && <Text style={styles.sublabelWhite}>{sublabel}</Text>}
          </LinearGradient>
        ) : (
          <View style={[styles.widget, SHADOWS.md, { borderLeftColor: color }]}>
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
  widget: {
    backgroundColor: COLORS.beigeLight,
    borderRadius: RADIUS.lg,
    padding: 16,
    alignItems: 'center',
    borderLeftWidth: 3,
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
    minWidth: 90,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
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
    fontSize: 11,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelWhite: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  glassLabel: {
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
    fontSize: 10,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  sublabelWhite: {
    fontSize: 10,
    color: COLORS.white,
    marginTop: 2,
  },
  glassSublabel: {
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
