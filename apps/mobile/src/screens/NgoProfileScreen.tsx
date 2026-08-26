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
import { StatDisplay } from '../components/common/StatDisplay';
import { AchievementGrid, AchievementDetailModal } from '../components/common/AchievementGrid';
import { useFadeIn } from '../hooks/useAnimations';
import { useAuth } from '../context/AuthContext';
import { useNgoProfile, useNgoStats, useNgoStreakCalendar, useNgoAchievements, useNgoLeaderboard } from '../hooks/useApiQueries';
import { currentStreakFromWeeks } from '../utils/streak';
import type { ApiAchievement } from '../api/achievements';
import type { NgoStreakWeek } from '../api/ngoStreaks';

function formatJoinDate(createdAt?: string): string {
  if (!createdAt) return 'recently';
  return new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/** A weekly-cadence streak strip — one pill per week rather than the user app's 7-day-per-week
 * grid, since an NGO's streak counts consecutive WEEKS with an update posted, not days. Kept
 * local to this screen rather than force-fit into the shared `StreakCalendar` (day-grid) component,
 * whose 2D week-of-days shape doesn't match this 1D week-only data. */
function NgoStreakRow({ streakCurrent, weeks }: { streakCurrent: number; weeks: NgoStreakWeek[] }) {
  return (
    <GlassCard variant="dark" style={styles.streakCard}>
      <View style={styles.streakHeader}>
        <View>
          <Text style={styles.streakTitle}>Posting Streak</Text>
          <Text style={styles.streakSub}>Current: {streakCurrent} week{streakCurrent === 1 ? '' : 's'} 🔥</Text>
        </View>
        <View style={styles.streakBadge}>
          <Text style={styles.streakBadgeNum}>{streakCurrent}</Text>
          <Text style={styles.streakBadgeFire}>🔥</Text>
        </View>
      </View>
      <View style={styles.streakPills}>
        {weeks.map((w, i) => (
          <View key={i} style={styles.streakPillWrap}>
            <View style={[styles.streakPill, w.posted ? styles.streakPillFilled : styles.streakPillEmpty]}>
              {w.posted && <Text style={styles.streakPillCheck}>✓</Text>}
            </View>
            <Text style={styles.streakPillLabel} numberOfLines={1}>{w.weekLabel}</Text>
          </View>
        ))}
      </View>
    </GlassCard>
  );
}

export function NgoProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: profile } = useNgoProfile();
  const { data: stats } = useNgoStats();
  const { data: streakData } = useNgoStreakCalendar(8);
  const { data: achievements = [] } = useNgoAchievements();
  const { data: leaderboard } = useNgoLeaderboard();
  const [selectedAchievement, setSelectedAchievement] = useState<ApiAchievement | null>(null);
  const fadeStyle = useFadeIn(0);

  const weeks = streakData?.weeks ?? [];
  const streakCurrent = currentStreakFromWeeks(weeks);
  const badgesCount = achievements.filter((a) => a.unlocked).length;
  const myRank = leaderboard?.myRank ?? null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 }]} showsVerticalScrollIndicator={false}>
        <Animated.View style={fadeStyle}>
          <LinearGradient
            colors={[COLORS.forest, COLORS.sageDark, COLORS.sageLight]}
            style={[styles.header, { paddingTop: insets.top + 16 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('NgoSettings')}
              accessibilityRole="button"
              accessibilityLabel="Open NGO settings"
            >
              <BlurView intensity={25} tint="dark" style={styles.settingsBlur}>
                <Text style={styles.settingsIcon}>⚙️</Text>
              </BlurView>
            </TouchableOpacity>

            <View style={styles.avatarLarge}>
              <Text style={styles.avatarEmoji}>{user?.avatarEmoji ?? '🌱'}</Text>
            </View>

            <Text style={styles.orgName}>{profile?.orgName ?? user?.name ?? 'Your NGO'}</Text>
            <Text style={styles.orgJoined}>🤝 Partner since {formatJoinDate(profile?.createdAt)}</Text>

            <BlurView intensity={20} tint="light" style={styles.statsStrip}>
              {[
                { value: stats?.totalDrives ?? 0, label: 'Drives' },
                { value: streakCurrent, label: 'Streak' },
                { value: badgesCount, label: 'Badges' },
                { value: myRank ? `#${myRank}` : '—', label: 'Rank' },
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
          {weeks.length > 0 && <NgoStreakRow streakCurrent={streakCurrent} weeks={weeks} />}

          <AchievementGrid achievements={achievements} onSelect={setSelectedAchievement} />

          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoStaff')}>
            <GlassCard variant="warm" style={styles.linkCard}>
              <Text style={styles.linkEmoji}>🧑‍🤝‍🧑</Text>
              <View style={styles.linkTextWrap}>
                <Text style={styles.linkTitle}>Staff roster</Text>
                <Text style={styles.linkBody}>Manage your team's public listing.</Text>
              </View>
            </GlassCard>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('NgoSettings')}>
            <GlassCard variant="warm" style={styles.linkCard}>
              <Text style={styles.linkEmoji}>⚙️</Text>
              <View style={styles.linkTextWrap}>
                <Text style={styles.linkTitle}>NGO profile & settings</Text>
                <Text style={styles.linkBody}>Logo, description, city, awards, and more.</Text>
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
  settingsBlur: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  settingsIcon: { fontSize: 18 },
  avatarLarge: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)', marginBottom: 4 },
  avatarEmoji: { fontSize: 44 },
  orgName: { fontSize: 24, fontWeight: '800', color: COLORS.white, letterSpacing: -0.5, textAlign: 'center' },
  orgJoined: { fontSize: 12, color: COLORS.white, marginBottom: 8 },
  statsStrip: { flexDirection: 'row', borderRadius: RADIUS.xl, overflow: 'hidden', paddingVertical: 12, paddingHorizontal: 8, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  headerStat: { flex: 1, alignItems: 'center' },
  headerStatDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  streakCard: { gap: 12 },
  streakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  streakTitle: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  streakSub: { fontSize: 12, color: COLORS.white, marginTop: 2 },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  streakBadgeNum: { fontSize: 24, fontWeight: '800', color: COLORS.streakFire },
  streakBadgeFire: { fontSize: 20 },
  streakPills: { flexDirection: 'row', gap: 6 },
  streakPillWrap: { flex: 1, alignItems: 'center', gap: 4 },
  streakPill: { width: '100%', height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  streakPillFilled: { backgroundColor: COLORS.sage },
  streakPillEmpty: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  streakPillCheck: { fontSize: 12, color: COLORS.white, fontWeight: '700' },
  streakPillLabel: { fontSize: 8, color: COLORS.white, fontWeight: '600' },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  linkEmoji: { fontSize: 26 },
  linkTextWrap: { flex: 1 },
  linkTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  linkBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
