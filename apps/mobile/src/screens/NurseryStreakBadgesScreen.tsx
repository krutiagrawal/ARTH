import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { Mascot } from '../components/common/Mascot';
import { StreakCalendar } from '../components/common/StreakCalendar';
import { AchievementGrid, AchievementDetailModal } from '../components/common/AchievementGrid';
import { useNurseryProfile, useNurseryStreakCalendar, useNurseryBadges } from '../hooks/useApiQueries';
import type { ApiAchievement } from '../api/achievements';

export function NurseryStreakBadgesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: profile } = useNurseryProfile();
  const { data: weeks = [] } = useNurseryStreakCalendar(6);
  const { data: badges = [] } = useNurseryBadges();
  const [selected, setSelected] = useState<ApiAchievement | null>(null);

  const streakCurrent = profile?.streakCurrent ?? 0;
  const streakMax = profile?.streakMax ?? 0;
  const achievements: ApiAchievement[] = badges.map((b) => ({
    id: b.id,
    title: b.title,
    description: b.description,
    icon: b.icon,
    rarity: b.rarity,
    unlocked: b.unlocked,
    progress: b.progress,
    total: b.criteriaTarget ?? undefined,
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.nightForest, COLORS.forest, COLORS.forestDeep]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.dismissButton}>
            <Text style={styles.dismissText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mascotSection}>
          <Mascot size={90} mood={streakCurrent > 0 ? 'encouraging' : 'calm'} animate />
        </View>

        <Text style={styles.title}>Streak & Badges</Text>
        <Text style={styles.subtitle}>
          Stays alive as long as you add or give out stock each day.
        </Text>

        <View style={styles.streakCountContainer}>
          <LinearGradient
            colors={['#FF6B35', '#FFD700', '#FF9500']}
            style={styles.streakCountGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.heartEmoji}>🔥</Text>
            <View style={styles.streakCountContent}>
              <Text style={styles.streakCountNum}>{streakCurrent}</Text>
              <Text style={styles.streakCountLabel}>Day Streak</Text>
            </View>
          </LinearGradient>
        </View>

        <BorderCard style={styles.recordCard}>
          <Text style={styles.recordIcon}>🏆</Text>
          <View>
            <Text style={styles.recordTitle}>Nursery's Best Streak</Text>
            <Text style={styles.recordValue}>{streakMax} days</Text>
          </View>
        </BorderCard>

        {weeks.length > 0 && (
          <View style={styles.calendarWrap}>
            <StreakCalendar streakCurrent={streakCurrent} weeks={weeks} />
          </View>
        )}

        {achievements.length > 0 && (
          <View style={styles.badgesWrap}>
            <AchievementGrid achievements={achievements} onSelect={setSelected} />
          </View>
        )}
      </ScrollView>

      <AchievementDetailModal achievement={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: 'row' },
  dismissButton: { padding: 8, marginLeft: -8 },
  dismissText: { fontSize: 14, color: COLORS.white, fontWeight: '600' },
  mascotSection: { alignItems: 'center', marginTop: 4 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.white, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20, marginTop: -6 },
  streakCountContainer: { ...SHADOWS.golden },
  streakCountGradient: { borderRadius: RADIUS.xxl, padding: 24, flexDirection: 'row', alignItems: 'center', gap: 16 },
  heartEmoji: { fontSize: 48 },
  streakCountContent: { flex: 1 },
  streakCountNum: { fontSize: 52, fontWeight: '900', color: COLORS.white, lineHeight: 58, letterSpacing: -2 },
  streakCountLabel: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  recordCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  recordIcon: { fontSize: 28 },
  recordTitle: { fontSize: 13, color: COLORS.white, fontWeight: '500' },
  recordValue: { fontSize: 15, color: COLORS.white, fontWeight: '700', marginTop: 2 },
  calendarWrap: { marginTop: 4 },
  badgesWrap: { marginTop: 8 },
});
