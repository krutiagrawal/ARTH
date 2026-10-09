import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, GRADIENTS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { TEXT } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { GlassCard } from '../components/common/GlassCard';
import { IconBadge } from '../components/common/IconBadge';
import { useSlideUp } from '../hooks/useAnimations';
import { useHaptics } from '../hooks/useHaptics';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useGamesStatus } from '../hooks/useApiQueries';
import type { ApiGameSummary, GameCategory, GameKey, GameStatus } from '../api/games';

/** Where each game opens. The "one option per round" games share a single screen. */
export function routeForGame(key: GameKey): { name: string; params?: object } {
  switch (key) {
    case 'guess_tree': return { name: 'GuessTree' };
    case 'grove_word': return { name: 'GroveWord' };
    case 'grow_order': return { name: 'GrowOrder' };
    case 'species_scramble': return { name: 'SpeciesScramble' };
    case 'eco_connections': return { name: 'EcoConnections' };
    case 'seed_memory': return { name: 'SeedMemory' };
    case 'spot_difference': return { name: 'SpotDifference' };
    case 'plant_grid': return { name: 'PlantGrid' };
    case 'daily_lesson': return { name: 'DailyLesson' };
    default: return { name: 'RoundsGame', params: { gameKey: key } };
  }
}

const SECTIONS: { category: GameCategory; title: string }[] = [
  { category: 'learn', title: 'LEARN' },
  { category: 'word', title: 'WORD GAMES' },
  { category: 'quick', title: 'QUICK BRAIN' },
  { category: 'puzzle', title: 'PUZZLES' },
];

export function isGameDone(status: GameStatus) {
  return status === 'won' || status === 'lost' || status === 'completed';
}

function statusLabel(game: ApiGameSummary): { text: string; done: boolean } {
  if (isGameDone(game.status)) return { text: `Done · +${game.xpAwarded} XP`, done: true };
  if (game.status === 'in_progress') return { text: 'In progress', done: false };
  return { text: `Up to +${game.maxXp} XP`, done: false };
}

function GameCard({ game, onPress }: { game: ApiGameSummary; onPress: () => void }) {
  const { text, done } = statusLabel(game);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} accessibilityRole="button" accessibilityLabel={game.title}>
      <GlassCard variant={done ? 'sage' : 'light'} style={styles.gameCard}>
        <View style={styles.gameRow}>
          <IconBadge icon={game.icon} color={COLORS.forest} size={48} />
          <View style={styles.gameText}>
            <Text style={styles.gameTitle}>{game.title}</Text>
            <Text style={styles.gameDesc}>{game.description}</Text>
          </View>
          <View style={[styles.pill, done && styles.pillDone]}>
            <Text style={[styles.pillText, done && styles.pillTextDone]}>{text}</Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
}

export function GamesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { light } = useHaptics();
  const { data, refetch } = useGamesStatus();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const bannerStyle = useSlideUp(60, 20);
  const listStyle = useSlideUp(140, 20);

  const streakActive = data?.streakActiveToday ?? false;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={GRADIENTS.mintFresh as any} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Daily Games" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <Animated.View style={bannerStyle}>
          <LinearGradient
            colors={(streakActive ? GRADIENTS.deepForest : GRADIENTS.goldenHour) as any}
            style={styles.banner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.bannerEmoji}>{streakActive ? '🔥' : '🎯'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>
                {streakActive ? 'Streak safe for today' : 'Play any game to keep your streak'}
              </Text>
              <Text style={styles.bannerBody}>
                {streakActive
                  ? `${data?.streakCurrent ?? 0}-day streak. Each game still earns its own XP.`
                  : 'One game a day is enough. Pick whichever you like.'}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={listStyle}>
          <Text style={styles.sectionLabel}>
            TODAY · {data?.completedCount ?? 0}/{data?.games.length ?? 15} PLAYED
          </Text>
          {SECTIONS.map((section) => {
            const games = (data?.games ?? []).filter((game) => game.category === section.category);
            if (games.length === 0) return null;
            return (
              <View key={section.category} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {games.map((game) => (
                  <GameCard
                    key={game.key}
                    game={game}
                    onPress={() => {
                      light();
                      const { name, params } = routeForGame(game.key);
                      navigation.navigate(name, params);
                    }}
                  />
                ))}
              </View>
            );
          })}
          <Text style={styles.footnote}>New puzzles every day at midnight UTC.</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  banner: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg, gap: SPACING.md },
  bannerEmoji: { fontSize: 34 },
  bannerTitle: { ...TEXT.subheading, color: COLORS.white },
  bannerBody: { ...TEXT.bodySmall, color: 'rgba(255,255,255,0.88)', marginTop: 2 },
  sectionLabel: { ...TEXT.label, color: COLORS.sageDark, marginBottom: SPACING.sm },
  section: { marginTop: SPACING.sm },
  sectionTitle: { ...TEXT.label, color: COLORS.textSecondary, marginBottom: SPACING.sm, marginTop: SPACING.xs },
  gameCard: { marginBottom: SPACING.sm },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  gameText: { flex: 1 },
  gameTitle: { ...TEXT.subheading, color: COLORS.textPrimary },
  gameDesc: { ...TEXT.bodySmall, color: COLORS.textSecondary, marginTop: 2 },
  pill: { backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  pillDone: { backgroundColor: COLORS.sageDark },
  pillText: { ...TEXT.caption, color: COLORS.textSecondary },
  pillTextDone: { color: COLORS.white },
  footnote: { ...TEXT.caption, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.md },
});
