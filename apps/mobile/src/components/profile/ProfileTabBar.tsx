import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';

export type ProfileTabKey = 'posts' | 'contributions' | 'achievements' | 'drives';

const TABS: { key: ProfileTabKey; icon: string; label: string }[] = [
  { key: 'posts', icon: '▦', label: 'Posts' },
  { key: 'contributions', icon: '🌍', label: 'Contributions' },
  { key: 'achievements', icon: '🏅', label: 'Achievements' },
  { key: 'drives', icon: '🤝', label: 'Drives' },
];

export function ProfileTabBar({
  activeTab,
  onChange,
  role,
}: {
  activeTab: ProfileTabKey;
  onChange: (tab: ProfileTabKey) => void;
  /** Nurseries don't run drives — that last tab becomes "Saplings" for them instead. */
  role?: 'user' | 'ngo' | 'nursery' | 'group';
}) {
  const tabs = role === 'nursery' ? TABS.map((t) => (t.key === 'drives' ? { ...t, icon: '🌱', label: 'Saplings' } : t)) : TABS;
  return (
    <View style={styles.row}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, active && styles.iconActive]}>{tab.icon}</Text>
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {tab.label}
            </Text>
            <View style={[styles.underline, active && styles.underlineActive]} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 8,
    gap: 2,
  },
  icon: { fontSize: 16, color: COLORS.textMuted },
  iconActive: { color: COLORS.forest },
  label: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted },
  labelActive: { color: COLORS.forest },
  underline: {
    marginTop: 6,
    height: 2,
    width: '70%',
    borderRadius: 1,
    backgroundColor: 'transparent',
  },
  underlineActive: { backgroundColor: COLORS.forest },
});
