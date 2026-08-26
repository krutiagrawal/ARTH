import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';
import { IconBadge } from './IconBadge';

interface SectionHeaderProps {
  title: string;
  icon?: string;
  color?: string;
}

export function SectionHeader({ title, icon, color = COLORS.sage }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      {icon ? <IconBadge icon={icon} color={color} size={28} /> : null}
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
