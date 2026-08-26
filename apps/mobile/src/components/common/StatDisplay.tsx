import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { SPACING } from '../../constants/theme';

/**
 * Big-number / small-label stat pattern (a strong number, a smaller caption, and an optional
 * clarifying line for estimates) — replaces the repeated ad hoc stat-pair markup scattered
 * across Profile/Map/Community/Home/EcoWidget.
 */

interface StatDisplayProps {
  value: string | number;
  label: string;
  /** Use for estimated/derived metrics, e.g. "Estimated CO2 impact" — signals it's not exact. */
  sublabel?: string;
  color?: string;
  labelColor?: string;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'center';
  style?: ViewStyle;
}

export function StatDisplay({
  value,
  label,
  sublabel,
  color = COLORS.textPrimary,
  labelColor = COLORS.textPrimary,
  size = 'md',
  align = 'left',
  style,
}: StatDisplayProps) {
  const valueStyle = size === 'lg' ? TYPOGRAPHY.number : size === 'md' ? TYPOGRAPHY.numberSmall : TYPOGRAPHY.numberTiny;

  return (
    <View style={[align === 'center' && styles.center, style]}>
      <Text style={[valueStyle, { color }, align === 'center' && styles.textCenter]} numberOfLines={1}>
        {value}
      </Text>
      <Text
        style={[TYPOGRAPHY.label, styles.label, { color: labelColor }, align === 'center' && styles.textCenter]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {sublabel ? (
        <Text
          style={[TYPOGRAPHY.caption, styles.sublabel, align === 'center' && styles.textCenter]}
          numberOfLines={1}
        >
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
  },
  textCenter: {
    textAlign: 'center',
  },
  label: {
    marginTop: SPACING.xs / 2,
  },
  sublabel: {
    marginTop: SPACING.xs / 2,
    color: COLORS.textPrimary,
  },
});
