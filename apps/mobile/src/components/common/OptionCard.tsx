import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';

import { TEXT } from '../../constants/typography';
interface OptionCardProps {
  icon?: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}

/**
 * A big, full-width tappable answer card for quiz-style one-question-per-screen flows — the
 * translucent-card look of AccountTypeScreen's AccountTypeCard, plus a selected state (mint
 * border/fill + checkmark), so it reads as an answerable question option rather than a nav link.
 */
export function OptionCard({ icon, label, selected, onPress }: OptionCardProps) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[styles.card, selected && styles.cardSelected]}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
      <View style={[styles.indicator, selected && styles.indicatorSelected]}>
        {selected && <Text style={styles.check}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm + 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: SPACING.sm,
  },
  cardSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: COLORS.mint,
  },
  icon: { fontSize: 24 },
  label: { flex: 1,...TEXT.subheading, color: COLORS.white },
  labelSelected: { color: COLORS.white },
  indicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorSelected: {
    backgroundColor: COLORS.mint,
    borderColor: COLORS.mint,
  },
  check: { fontSize: 13, fontWeight: '900', color: COLORS.forestDeep },
});
