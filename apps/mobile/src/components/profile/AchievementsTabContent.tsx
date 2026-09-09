import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../common/AppText';
import { BorderCard } from '../common/BorderCard';
import { ProgressRing } from '../common/ProgressRing';
import { AchievementGrid, AchievementDetailModal } from '../common/AchievementGrid';
import { StreakCalendar } from '../common/StreakCalendar';
import { ForestGallery } from '../stories/ForestGallery';
import { COLORS } from '../../constants/colors';
import { getForestLevelLabel, getXpProgress } from '../../constants/forestLevels';
import type { ApiAchievement } from '../../api/achievements';
import type { StreakWeek } from '../../api/streaks';

/**
 * Everything that used to live directly on the profile dashboard — level/XP, streak, badges,
 * and the permanent story archive — now grouped into one tab instead of a long scroll.
 */
export function AchievementsTabContent({
  achievements,
  xp,
  streak,
  /** Renders instead of the day-grid StreakCalendar — for NGO's weekly-cadence NgoStreakRow,
   * whose 1D week shape doesn't fit StreakCalendar's 2D week-of-days grid. */
  customStreak,
  /** ForestGallery only supports "my own" stories today — omit when viewing someone else. */
  showForestGallery = false,
}: {
  achievements: ApiAchievement[];
  /** User-role only — NGO/Nursery/Group have no XP/level concept. */
  xp?: { xp: number; level: number } | null;
  streak?: { streakCurrent: number; weeks: StreakWeek[] } | null;
  customStreak?: React.ReactNode;
  showForestGallery?: boolean;
}) {
  const [selected, setSelected] = useState<ApiAchievement | null>(null);
  const xpProgress = xp ? getXpProgress(xp.xp, xp.level) : null;

  return (
    <View style={styles.wrap}>
      {xpProgress && xp ? (
        <BorderCard style={styles.xpCard}>
          <View style={styles.xpRow}>
            <View>
              <Text style={styles.xpLevelLabel}>{getForestLevelLabel(xp.level)}</Text>
              <Text style={styles.xpSubLabel}>
                Level {xp.level} · {xpProgress.current}/{xpProgress.needed} XP
              </Text>
            </View>
            <ProgressRing
              size={56}
              strokeWidth={6}
              progress={xpProgress.progress}
              color={COLORS.golden}
              trackColor="rgba(0,0,0,0.08)"
              label={`${Math.round(xpProgress.progress * 100)}%`}
            />
          </View>
        </BorderCard>
      ) : null}

      {customStreak}
      {!customStreak && streak ? <StreakCalendar streakCurrent={streak.streakCurrent} weeks={streak.weeks} /> : null}

      <AchievementGrid achievements={achievements} onSelect={setSelected} />

      {showForestGallery ? <ForestGallery /> : null}

      <AchievementDetailModal achievement={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  xpCard: { gap: 8 },
  xpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  xpLevelLabel: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  xpSubLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
