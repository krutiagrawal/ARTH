import React, { type RefObject } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '../common/AppText';
import { ProgressRing } from '../common/ProgressRing';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SHADOWS } from '../../constants/theme';
import { TEXT } from '../../constants/typography';
import { useSlideUp } from '../../hooks/useAnimations';
import { isNightlikePeriod, type TimeTheme } from '../../hooks/useTimeTheme';
import { hexToRgba } from '../../utils/color';
import type { ApiGameSummary } from '../../api/games';

function homeTextColor(theme: TimeTheme, base: string, opts?: { secondary?: boolean }): string {
  if (!isNightlikePeriod(theme.period)) return base;
  return opts?.secondary ? ON_DARK_SURFACE.secondary : ON_DARK_SURFACE.primary;
}

/** Entry point to the daily games. Any one finished game keeps the streak alive, so the copy
 * leads with that; the four chips show which of today's games are already done. */
export function DailyGamesCard({ games, navigation, blurTarget, theme }: { games: ApiGameSummary[]; navigation: any; blurTarget: RefObject<View | null>; theme: TimeTheme }) {
  const slideStyle = useSlideUp(150, 24);
  const doneCount = games.filter((g) => g.status === 'won' || g.status === 'lost' || g.status === 'completed').length;
  const total = games.length || 15;
  const rowBg = theme.cardTint === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)';

  return (
    <Animated.View style={slideStyle}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Games')} accessibilityRole="button" accessibilityLabel="Open daily games">
        <BlurView
          intensity={35}
          tint={theme.cardTint === 'dark' ? 'dark' : 'light'}
          blurTarget={blurTarget}
          style={[styles.card, { borderColor: theme.cardBorder, borderWidth: 1, borderTopColor: 'rgba(255,255,255,0.4)' }]}
        >
          <LinearGradient
            colors={[hexToRgba(theme.cardBackground, theme.cardOverlayAlpha), hexToRgba(theme.cardBackgroundAlt, theme.cardOverlayAlpha)]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 0.8 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.tag, { color: homeTextColor(theme, theme.accentColor) }]}>DAILY GAMES</Text>
              <Text style={[styles.title, { color: homeTextColor(theme, theme.textPrimaryOnCard) }]}>Play to keep your streak</Text>
              <Text style={[styles.desc, { color: homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true }), marginTop: 2 }]}>
                One game a day is enough. Each earns its own XP.
              </Text>
            </View>
            <ProgressRing
              size={52}
              strokeWidth={5}
              progress={doneCount / total}
              color={theme.accentColor}
              trackColor={theme.accentColorSoft}
              label={`${doneCount}/${total}`}
              delay={450}
            />
          </View>
          <View style={styles.gamesChipRow}>
            {games.slice(0, 4).map((game) => {
              const done = game.status === 'won' || game.status === 'lost' || game.status === 'completed';
              return (
                <View key={game.key} style={[styles.gamesChip, { backgroundColor: rowBg }, done && { backgroundColor: theme.accentColor }]}>
                  <Text style={styles.gamesChipIcon}>{done ? '✓' : game.icon}</Text>
                </View>
              );
            })}
            {games.length > 4 ? (
              <Text style={[styles.desc, { color: homeTextColor(theme, theme.textSecondaryOnCard, { secondary: true }) }]}>+{games.length - 4} more</Text>
            ) : null}
            <Text style={[styles.play, { color: homeTextColor(theme, theme.accentColor), marginLeft: 'auto' }]}>Play →</Text>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS.xl, padding: 20, overflow: 'hidden', ...SHADOWS.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  tag: { fontSize: 11, fontWeight: '700', color: COLORS.sageLight, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 },
  title: { ...TEXT.heading, color: COLORS.white },
  desc: { fontSize: 11, fontWeight: '500', color: COLORS.white, marginTop: 1 },
  play: { fontSize: 13, color: COLORS.sageLight, fontWeight: '600' },
  gamesChipRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gamesChip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  gamesChipIcon: { fontSize: 18 },
});
