import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { BorderCard } from '../common/BorderCard';
import { COLORS } from '../../constants/colors';
import type { ApiForestTheme } from '../../api/themes';

import { TEXT } from '../../constants/typography';
/** Shared by User and Group profiles — the only two roles with a forest-theme customization.
 * Three themes per row; each card states plainly whether it is locked or unlocked. */
export function ForestThemesPicker({
  themes,
  selectedThemeId,
  onSelectUnlocked,
  onSelectLocked,
}: {
  themes: ApiForestTheme[];
  /** Highlights the theme currently applied to the forest. */
  selectedThemeId?: string | null;
  onSelectUnlocked: (theme: ApiForestTheme) => void;
  onSelectLocked: (theme: ApiForestTheme) => void;
}) {
  if (themes.length === 0) return null;

  const unlockedCount = themes.filter((t) => t.unlocked).length;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Forest Themes</Text>
        <Text style={styles.count}>{unlockedCount} of {themes.length} unlocked</Text>
      </View>
      <View style={styles.grid}>
        {themes.map((theme) => {
          const selected = theme.unlocked && theme.id === selectedThemeId;
          return (
            <TouchableOpacity
              key={theme.id}
              style={styles.cell}
              activeOpacity={0.8}
              onPress={() => (theme.unlocked ? onSelectUnlocked(theme) : onSelectLocked(theme))}
              accessibilityLabel={`${theme.name}, ${theme.unlocked ? (selected ? 'selected' : 'unlocked') : 'locked'}`}
            >
              <BorderCard style={[styles.card, selected && styles.cardSelected]}>
                <Text style={[styles.emoji, !theme.unlocked && styles.emojiLocked]}>{theme.preview}</Text>
                <Text style={[styles.name, !theme.unlocked && styles.nameLocked]} numberOfLines={1}>{theme.name}</Text>
                <View style={[styles.status, theme.unlocked ? styles.statusUnlocked : styles.statusLocked]}>
                  <Text style={[styles.statusText, theme.unlocked ? styles.statusTextUnlocked : styles.statusTextLocked]}>
                    {selected ? '✓ In use' : theme.unlocked ? 'Unlocked' : '🔒 Locked'}
                  </Text>
                </View>
              </BorderCard>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  title: { ...TEXT.subheading, color: COLORS.textPrimary },
  count: { fontSize: 12, color: COLORS.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  cell: { width: '33.333%', padding: 3 },
  card: { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, gap: 3 },
  cardSelected: { borderColor: COLORS.forest, borderWidth: 2 },
  emoji: { fontSize: 22 },
  emojiLocked: { opacity: 0.35 },
  name: { fontSize: 10, fontWeight: '600', color: COLORS.forest, textAlign: 'center' },
  nameLocked: { color: COLORS.textMuted },
  status: { borderRadius: 999, paddingVertical: 2, paddingHorizontal: 6 },
  statusUnlocked: { backgroundColor: 'rgba(94,133,80,0.15)' },
  statusLocked: { backgroundColor: 'rgba(139,107,71,0.15)' },
  statusText: { fontSize: 9, fontWeight: '700' },
  statusTextUnlocked: { color: COLORS.sageDark },
  statusTextLocked: { color: COLORS.textMuted },
});
