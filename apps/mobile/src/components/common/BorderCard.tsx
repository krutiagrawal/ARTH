import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { COLORS } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';

interface BorderCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  noPadding?: boolean;
}

/**
 * Flat, non-glass card used everywhere except Home/Forest/Map (which keep the illustrated-scenery
 * glass look). No fill — just a brown outline over whatever the page's own background is.
 */
export function BorderCard({ children, style, borderRadius = RADIUS.lg, noPadding = false }: BorderCardProps) {
  return (
    <View style={[styles.card, { borderRadius }, !noPadding && styles.padding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
  },
  padding: {
    padding: SPACING.md,
  },
});
