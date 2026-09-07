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
import { StreakCalendar } from '../components/common/StreakCalendar';
import { AchievementGrid, AchievementDetailModal } from '../components/common/AchievementGrid';
import { ImpactStatsCard } from '../components/common/ImpactStatsCard';
import { ForestGallery } from '../components/stories/ForestGallery';
import { useFadeIn } from '../hooks/useAnimations';
import { useAuth } from '../context/AuthContext';
import {
  useGroupProfile,
  useGroupStats,
  useGroupStreakCalendar,
  useGroupAchievements,
  useGroupLeaderboard,
  useGroupThemes,
  useSelectGroupTheme,
} from '../hooks/useApiQueries';
import type { ApiAchievement } from '../api/achievements';
import type { ApiForestTheme } from '../api/themes';
import { getXpProgress } from '../constants/forestLevels';
import { getForestThemePalette } from '../constants/forestThemePalettes';
import { formatJoinDate, daysSince } from '../utils/profileDates';
import { useConfirm } from '../context/ConfirmDialogContext';

export function GroupProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: profile } = useGroupProfile();
  const { data: stats } = useGroupStats();
  const { data: weeks = [] } = useGroupStreakCalendar(4);
  const { data: achievements = [] } = useGroupAchievements();
  const { data: leaderboard } = useGroupLeaderboard();
  const { data: themes = [] } = useGroupThemes();
  const selectThemeMutation = useSelectGroupTheme();
  const confirm = useConfirm();
  const [selectedAchievement, setSelectedAchievement] = useState<ApiAchievement | null>(null);
  const fadeStyle = useFadeIn(0);

  const streakCurrent = profile?.streakCurrent ?? 0;
  const badgesCount = achievements.filter((a) => a.unlocked).length;
  const myRank = leaderboard?.myRank ?? null;
  const xpProgress = getXpProgress(stats?.xpTotal ?? 0, stats?.level ?? 1);

  const selectedThemeKey = themes.find((t) => t.id === profile?.selectedForestThemeId)?.key;
  const accentColor = getForestThemePalette(selectedThemeKey).accentColor;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={fadeStyle}>
          <LinearGradient
            colors={[COLORS.forest, COLORS.sageDark, accentColor]}
            style={[styles.header, { paddingTop: insets.top + 16 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Members button */}
            <TouchableOpacity
              style={styles.membersButton}
              onPress={() => navigation.navigate('GroupMembers')}
              accessibilityRole="button"
              accessibilityLabel="Group members"
            >
              <BlurView intensity={25} tint="dark" style={styles.settingsBlur}>
                <Text style={styles.settingsIcon}>👥</Text>
              </BlurView>
            </TouchableOpacity>

            {/* Settings button */}
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('GroupSettings')}
              accessibilityRole="button"
              accessibilityLabel="Open group settings"
            >
              <BlurView intensity={25} tint="dark" style={styles.settingsBlur}>
                <Text style={styles.settingsIcon}>⚙️</Text>
              </BlurView>
            </TouchableOpacity>

            {/* Avatar */}
            <TouchableOpacity
              style={styles.avatarArea}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('EditGroupProfile')}
            >
              <View style={styles.avatarLarge}>
                <Text style={styles.avatarEmoji}>{profile?.avatarEmoji ?? '🌳'}</Text>
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
                <Text style={styles.levelLabelText}>Lv.{stats?.level ?? 1}</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.groupName}>{profile?.groupName ?? user?.name ?? 'Your group'}</Text>
            {!!profile?.handle && <Text style={styles.groupHandle}>@{profile.handle}</Text>}
            <Text style={styles.groupJoined}>👥 Formed {formatJoinDate(profile?.createdAt)}</Text>

            <BlurView intensity={20} tint="light" style={styles.statsStrip}>
              {[
                { value: myRank ? `#${myRank}` : '—', label: 'Rank' },
                { value: stats?.memberCount ?? 0, label: 'Members' },
                { value: streakCurrent, label: 'Streak' },
                { value: badgesCount, label: 'Badges' },
              ].map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 && <View style={styles.headerStatDivider} />}
                  <StatDisplay value={s.value} label={s.label} size="sm" align="center" color={COLORS.white} labelColor={COLORS.white} style={styles.headerStat} />
                </React.Fragment>
              ))}
            </BlurView>
          </LinearGradient>
        </Animated.View>

        <View style={styles.body}>
          <ImpactStatsCard
            co2={stats?.co2AbsorbedTotal ?? 0}
            treesPlanted={stats?.treesPlantedTotal ?? 0}
            daysActive={daysSince(profile?.createdAt)}
          />

          {weeks.length > 0 && <StreakCalendar streakCurrent={streakCurrent} weeks={weeks} />}

          <AchievementGrid achievements={achievements} onSelect={setSelectedAchievement} />

          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('GroupPostUpdate')}>
            <GlassCard variant="warm" style={styles.linkCard}>
              <Text style={styles.linkEmoji}>📸</Text>
              <View style={styles.linkTextWrap}>
                <Text style={styles.linkTitle}>Post a forest update</Text>
                <Text style={styles.linkBody}>Share a snapshot to your group's gallery.</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>

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

          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('GroupSettings')}>
            <GlassCard variant="warm" style={styles.linkCard}>
              <Text style={styles.linkEmoji}>⚙️</Text>
              <View style={styles.linkTextWrap}>
                <Text style={styles.linkTitle}>Group profile & settings</Text>
                <Text style={styles.linkBody}>Logo, description, city, and invite code.</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AchievementDetailModal achievement={selectedAchievement} onClose={() => setSelectedAchievement(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {},
  header: { alignItems: 'center', paddingBottom: 24, paddingHorizontal: 24, gap: 8 },
  settingsButton: { position: 'absolute', top: 60, right: 20, zIndex: 10 },
  membersButton: { position: 'absolute', top: 60, right: 66, zIndex: 10 },
  settingsBlur: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  settingsIcon: { fontSize: 18 },
  avatarArea: { position: 'relative', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarLarge: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarEmoji: { fontSize: 44 },
  levelRing: { position: 'absolute', top: -8, left: -8 },
  levelLabel: { position: 'absolute', bottom: -6, right: -4, backgroundColor: COLORS.golden, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' },
  levelLabelText: { fontSize: 10, fontWeight: '800', color: COLORS.white },
  groupName: { fontSize: 24, fontWeight: '800', color: COLORS.white, letterSpacing: -0.5, textAlign: 'center' },
  groupHandle: { fontSize: 14, color: COLORS.white, fontWeight: '500' },
  groupJoined: { fontSize: 12, color: COLORS.white, marginBottom: 8 },
  statsStrip: { flexDirection: 'row', borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 12, paddingHorizontal: 8, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  headerStat: { flex: 1, alignItems: 'center' },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  linkEmoji: { fontSize: 26 },
  linkTextWrap: { flex: 1 },
  linkTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  linkBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleDark: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  themeCard: { width: 110, marginRight: 8, alignItems: 'center', padding: 14, gap: 6 },
  themeCardLocked: { opacity: 0.6 },
  themeEmoji: { fontSize: 32 },
  themeNameDark: { fontSize: 11, fontWeight: '600', color: COLORS.white, textAlign: 'center' },
  themeNameUnlocked: { color: COLORS.forest },
  themeLockedDark: { fontSize: 10, color: COLORS.white },
});
