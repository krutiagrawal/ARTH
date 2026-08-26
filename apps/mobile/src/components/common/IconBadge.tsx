import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';

interface IconBadgeProps {
  icon: string;
  color?: string;
  size?: number;
  /** Circular well instead of a rounded square — the reference's menu/list-row treatment. */
  round?: boolean;
}

export function IconBadge({ icon, color = COLORS.sage, size = 40, round = false }: IconBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: round ? size / 2 : RADIUS.md,
          backgroundColor: `${color}22`,
        },
      ]}
    >
      <Text style={{ fontSize: size * 0.5 }}>{icon}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
