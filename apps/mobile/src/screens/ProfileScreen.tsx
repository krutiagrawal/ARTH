import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { ProgressRing } from '../components/common/ProgressRing';
import { StatDisplay } from '../components/common/StatDisplay';
import { Mascot } from '../components/common/Mascot';
import { StreakCalendar } from '../components/common/StreakCalendar';
import { AchievementGrid, AchievementDetailModal } from '../components/common/AchievementGrid';
import { useFadeIn } from '../hooks/useAnimations';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmDialogContext';
import {
  useAchievements,
  useStreakCalendar,
  useThemes,
  useSelectTheme,
  useLeaderboard,
} from '../hooks/useApiQueries';
import type { ApiAchievement } from '../api/achievements';
import type { ApiForestTheme } from '../api/themes';
import type { ApiUser } from '../api/auth';
import { getForestLevelLabel, getXpProgress } from '../constants/forestLevels';
import { ForestGallery } from '../components/stories/ForestGallery';
import { ImpactStatsCard } from '../components/common/ImpactStatsCard';
import { formatJoinDate, daysSince } from '../utils/profileDates';

function ProfileHeader({
  navigation,
  user,
  rank,
}: {
  navigation: any;
  user: ApiUser | null;
  rank: number | null;
}) {
  const fadeStyle = useFadeIn(0);
  const insets = useSafeAreaInsets();
  const xpProgress = getXpProgress(user?.xp ?? 0, user?.level ?? 1);

  return (
    <Animated.View style={fadeStyle}>
      <LinearGradient
        colors={[COLORS.forest, COLORS.sageDark, COLORS.sageLight]}
        style={[styles.profileHeader, { paddingTop: insets.top + 16 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Groups button */}
        <TouchableOpacity
          style={styles.groupsButton}
          onPress={() => navigation?.navigate('Groups')}
          accessibilityRole="button"
          accessibilityLabel="My groups"
        >
          <BlurView intensity={25} tint="dark" style={styles.settingsBlur}>
            <Text style={styles.settingsIcon}>👥</Text>
          </BlurView>
        </TouchableOpacity>

        {/* Settings button */}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation?.navigate('Settings')}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
        >
          <BlurView intensity={25} tint="dark" style={styles.settingsBlur}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </BlurView>
        </TouchableOpacity>

        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatarArea}
          activeOpacity={0.85}
          onPress={() => navigation?.navigate('EditProfile')}
        >
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarEmoji}>{user?.avatarEmoji ?? '🧑‍🌾'}</Text>
          </View>
          <View style={styles.levelRing}>
            <ProgressRing
              size={96}
              strokeWidth={4}
              progress={xpProgress.progress}
              color={COLORS.golden}
              trackColor="rgba(255,255,255,0.15)"
              delay={300}
            />
          </View>
          <View style={styles.levelLabel}>
            <Text style={styles.levelLabelText}>Lv.{user?.level ?? 1}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.profileName}>{user?.name ?? 'Planter'}</Text>
        <Text style={styles.profileHandle}>@{user?.handle ?? ''}</Text>
        <Text style={styles.profileJoined}>🌱 Planting since {formatJoinDate(user?.createdAt)}</Text>

        {/* Stats strip */}
        <BlurView intensity={20} tint="light" style={styles.statsStrip}>
          {[
            { value: user?.treesPlantedCount ?? 0, label: 'Trees' },
            { value: user?.streakCurrent ?? 0, label: 'Streak' },
            { value: user?.badgesCount ?? 0, label: 'Badges' },
            { value: rank ? `#${rank}` : '—', label: 'Rank' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View style={styles.headerStatDivider} />}
              <StatDisplay
                value={s.value}
                label={s.label}
                size="sm"
                align="center"
                color={COLORS.white}
                labelColor={COLORS.white}
                style={styles.headerStat}
              />
            </React.Fragment>
          ))}
        </BlurView>
      </LinearGradient>
    </Animated.View>
  );
}

export function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: achievements = [] } = useAchievements();
  const { data: streakWeeks = [] } = useStreakCalendar(4);
  const { data: themes = [] } = useThemes();
  const { data: leaderboard } = useLeaderboard('global');
  const selectThemeMutation = useSelectTheme();
  const [selectedAchievement, setSelectedAchievement] = useState<ApiAchievement | null>(null);
  const confirm = useConfirm();

  const myRank = leaderboard?.myRank ?? null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHeader navigation={navigation} user={user} rank={myRank} />

        <View style={styles.body}>
          <ImpactStatsCard
            co2={Number(user?.totalCo2Absorbed ?? 0)}
            treesPlanted={user?.treesPlantedCount ?? 0}
            daysActive={daysSince(user?.createdAt)}
          />
          <StreakCalendar streakCurrent={user?.streakCurrent ?? 0} weeks={streakWeeks} />
          <AchievementGrid achievements={achievements} onSelect={setSelectedAchievement} />

          {/* Forest snapshots gallery */}
          <ForestGallery />

          {/* Forest themes */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitleDark}>Forest Themes</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {themes.map((forestTheme: ApiForestTheme) => (
              <TouchableOpacity
                key={forestTheme.id}
                activeOpacity={0.8}
                onPress={() =>
                  forestTheme.unlocked
                    ? selectThemeMutation.mutate(forestTheme.id)
                    : confirm('Locked', 'Keep planting trees to unlock this forest theme!')
                }
              >
                <GlassCard
                  variant={forestTheme.unlocked ? 'sage' : 'dark'}
                  style={[styles.themeCard, !forestTheme.unlocked && styles.themeCardLocked]}
                >
                  <Text style={styles.themeEmoji}>{forestTheme.preview}</Text>
                  <Text style={[styles.themeNameDark, forestTheme.unlocked && styles.themeNameUnlocked]}>
                    {forestTheme.name}
                  </Text>
                  {!forestTheme.unlocked && <Text style={styles.themeLockedDark}>🔒 Unlock</Text>}
                </GlassCard>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <AchievementDetailModal achievement={selectedAchievement} onClose={() => setSelectedAchievement(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {},
  profileHeader: {
    alignItems: 'center',
    paddingBottom: 24,
    paddingHorizontal: 24,
    gap: 8,
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  groupsButton: {
    position: 'absolute',
    top: 60,
    right: 66,
    zIndex: 10,
  },
  settingsBlur: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  settingsIcon: {
    fontSize: 18,
  },
  avatarArea: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarEmoji: {
    fontSize: 44,
  },
  levelRing: {
    position: 'absolute',
    top: -8,
    left: -8,
  },
  levelLabel: {
    position: 'absolute',
    bottom: -6,
    right: -4,
    backgroundColor: COLORS.golden,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  levelLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.white,
  },
  profileName: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  profileHandle: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  profileJoined: {
    fontSize: 12,
    color: COLORS.white,
    marginBottom: 8,
  },
  statsStrip: {
    flexDirection: 'row',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    paddingVertical: 12,
    paddingHorizontal: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  headerStat: {
    flex: 1,
    alignItems: 'center',
  },
  headerStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 4,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleDark: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  themeCard: {
    width: 110,
    marginRight: 8,
    alignItems: 'center',
    padding: 14,
    gap: 6,
  },
  themeCardLocked: {
    opacity: 0.6,
  },
  themeEmoji: {
    fontSize: 32,
  },
  themeNameDark: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  /** The 'sage' GlassCard variant is a light translucent tint — on the light beige page
   * background that composites light too, so unlocked (sage-card) theme names need dark text
   * instead of the white used for locked (dark-card) themes. */
  themeNameUnlocked: {
    color: COLORS.forest,
  },
  themeLockedDark: {
    fontSize: 10,
    color: COLORS.white,
  },
});
