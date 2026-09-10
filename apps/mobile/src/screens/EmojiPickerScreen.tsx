import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { AVATAR_EMOJI_CATEGORIES } from '../constants/avatarEmojis';

const { width: SW } = Dimensions.get('window');
const COLUMNS = 6;
const TILE = (SW - SPACING.md * 2 - (COLUMNS - 1) * 8) / COLUMNS;

/**
 * A curated grid of the app's own emoji, in place of the OS/library emoji keyboard — tapping a
 * tile reports the choice back to whichever screen navigated here (via `route.params.onSelect`)
 * and pops back immediately, no separate confirm step.
 */
export function EmojiPickerScreen({ navigation, route }: any) {
  const selected: string | undefined = route?.params?.selected;
  const onSelect: ((emoji: string) => void) | undefined = route?.params?.onSelect;

  const pick = (emoji: string) => {
    onSelect?.(emoji);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Choose an Emoji" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {AVATAR_EMOJI_CATEGORIES.map((category) => (
          <View key={category.label} style={styles.section}>
            <Text style={styles.sectionTitle}>{category.label}</Text>
            <View style={styles.grid}>
              {category.emojis.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[styles.tile, emoji === selected && styles.tileSelected]}
                  onPress={() => pick(emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={`Choose ${emoji}`}
                >
                  <Text style={styles.tileEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingBottom: 40, gap: 20 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: {
    borderColor: COLORS.warmBrown,
    backgroundColor: 'rgba(160,114,74,0.12)',
  },
  tileEmoji: { fontSize: 28 },
});
