import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { BorderCard } from '../common/BorderCard';
import { COLORS } from '../../constants/colors';
import type { ApiForestTheme } from '../../api/themes';

/** Shared by User and Group profiles — the only two roles with a forest-theme customization. */
export function ForestThemesPicker({
  themes,
  onSelectUnlocked,
  onSelectLocked,
}: {
  themes: ApiForestTheme[];
  onSelectUnlocked: (theme: ApiForestTheme) => void;
  onSelectLocked: () => void;
}) {
  if (themes.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Forest Themes</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {themes.map((theme) => (
          <TouchableOpacity
            key={theme.id}
            activeOpacity={0.8}
            onPress={() => (theme.unlocked ? onSelectUnlocked(theme) : onSelectLocked())}
          >
            <BorderCard style={[styles.card, !theme.unlocked && styles.cardLocked]}>
              <Text style={styles.emoji}>{theme.preview}</Text>
              <Text style={[styles.name, theme.unlocked && styles.nameUnlocked]}>{theme.name}</Text>
              {!theme.unlocked && <Text style={styles.locked}>🔒 Unlock</Text>}
            </BorderCard>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  card: { width: 110, marginRight: 8, alignItems: 'center', padding: 14, gap: 6 },
  cardLocked: { opacity: 0.6 },
  emoji: { fontSize: 32 },
  name: { fontSize: 11, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'center' },
  nameUnlocked: { color: COLORS.forest },
  locked: { fontSize: 10, color: COLORS.textMuted },
});
