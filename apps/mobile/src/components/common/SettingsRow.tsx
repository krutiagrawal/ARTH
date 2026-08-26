import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';

interface SettingsRowProps {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  accent?: string;
  dangerous?: boolean;
  /** Text color pairing for the card this row sits in: 'dark' (default, unchanged) is white text
   * for a dark glass card; 'light' is dark text for a light/frosted card. */
  variant?: 'dark' | 'light';
}

export function SettingsRow({ icon, label, sublabel, onPress, rightElement, accent = COLORS.sage, dangerous = false, variant = 'dark' }: SettingsRowProps) {
  const isLight = variant === 'light';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={styles.settingsRow}>
        <View style={[styles.settingsRowIcon, { backgroundColor: `${accent}20` }]}>
          <Text style={styles.settingsRowIconText}>{icon}</Text>
        </View>
        <View style={styles.settingsRowContent}>
          <Text style={[isLight ? styles.settingsRowLabelLight : styles.settingsRowLabelDark, dangerous && styles.dangerLabel]}>{label}</Text>
          {sublabel && <Text style={isLight ? styles.settingsRowSublabelLight : styles.settingsRowSublabelDark}>{sublabel}</Text>}
        </View>
        {rightElement ?? (onPress && <Text style={isLight ? styles.settingsRowArrowLight : styles.settingsRowArrowDark}>›</Text>)}
      </View>
    </TouchableOpacity>
  );
}

export function SettingsSectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeaderDark}>{title}</Text>;
}

export function SettingsDivider({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  return <View style={[styles.divider, variant === 'light' && styles.dividerLight]} />;
}

const styles = StyleSheet.create({
  sectionHeaderDark: {
    fontSize: 13,
    fontWeight: '700',
    // Sits directly on the page's cream gradient background, NOT inside a GlassCard — must use
    // dark text (was COLORS.white, invisible on cream).
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: -4,
    paddingHorizontal: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  settingsRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowIconText: {
    fontSize: 20,
  },
  settingsRowContent: {
    flex: 1,
  },
  settingsRowLabelDark: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  settingsRowLabelLight: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dangerLabel: {
    color: COLORS.coral,
  },
  settingsRowSublabelDark: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 1,
  },
  settingsRowSublabelLight: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  settingsRowArrowDark: {
    fontSize: 20,
    color: COLORS.white,
    fontWeight: '300',
  },
  settingsRowArrowLight: {
    fontSize: 20,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginLeft: 66,
  },
  dividerLight: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
});
