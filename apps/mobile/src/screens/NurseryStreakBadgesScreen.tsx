import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { Mascot } from '../components/common/Mascot';
import { TrustScoreGauge } from '../components/common/TrustScoreGauge';
import { GrowthLevelBadge, GROWTH_LEVEL_META } from '../components/common/GrowthLevelBadge';
import { ContributionStreakCard } from '../components/common/ContributionStreakCard';
import { AchievementGrid, AchievementDetailModal } from '../components/common/AchievementGrid';
import { useNurseryReputation, useNurseryBadges } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { ApiAchievement } from '../api/achievements';

export function NurseryStreakBadgesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: reputation, refetch: refetchReputation } = useNurseryReputation(12);
  const { data: badges = [], refetch: refetchBadges } = useNurseryBadges();
  const [selected, setSelected] = useState<ApiAchievement | null>(null);
  const { refreshing, onRefresh } = usePullToRefresh([refetchReputation, refetchBadges]);

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

  const growthLevel = reputation?.growthLevel ?? 'seedling';
  const nextMeta = reputation?.growthProgress.nextLevel ? GROWTH_LEVEL_META[reputation.growthProgress.nextLevel] : null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[COLORS.cream, COLORS.beigeLight]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.dismissButton} activeOpacity={0.85}>
            <Text style={styles.dismissText}>← Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mascotSection}>
          <Mascot size={90} mood={growthLevel === 'seedling' ? 'calm' : 'encouraging'} animate />
        </View>

        <Text style={styles.title}>Growth & Trust</Text>
        <Text style={styles.subtitle}>
          Built from real ARTH activity — orders fulfilled, inventory kept fresh, and NGO partnerships — not a daily check-in.
        </Text>

        <BorderCard style={styles.card}>
          <View style={styles.growthRow}>
            <GrowthLevelBadge level={growthLevel} variant="light" />
            {nextMeta && reputation && (
              <Text style={styles.growthProgressText}>
                {(reputation.growthProgress.suppliedToNext ?? 0) > 0
                  ? `${reputation.growthProgress.suppliedToNext} more saplings supplied`
                  : ''}
                {reputation.growthProgress.monthsToNext ? ` · ${reputation.growthProgress.monthsToNext} mo` : ''} to {nextMeta.label}
              </Text>
            )}
          </View>
        </BorderCard>

        <BorderCard style={styles.card}>
          <TrustScoreGauge score={reputation?.trustScore ?? null} factors={reputation?.trustScoreFactors} variant="light" />
        </BorderCard>

        {reputation && (
          <View style={styles.streaksWrap}>
            <ContributionStreakCard
              icon="📦"
              title="Supply Streak"
              subtitle="Fulfilled an ARTH order this week"
              current={reputation.streaks.supply.current}
              longest={reputation.streaks.supply.longest}
              weeks={reputation.streaks.supply.weeks}
              variant="light"
            />
            <ContributionStreakCard
              icon="🌿"
              title="Inventory Freshness Streak"
              subtitle="Kept stock listings up to date"
              current={reputation.streaks.inventoryFreshness.current}
              longest={reputation.streaks.inventoryFreshness.longest}
              weeks={reputation.streaks.inventoryFreshness.weeks}
              variant="light"
            />
            <ContributionStreakCard
              icon="🌍"
              title="ARTH Contribution Streak"
              subtitle="Any meaningful activity on ARTH"
              current={reputation.streaks.arthContribution.current}
              longest={reputation.streaks.arthContribution.longest}
              weeks={reputation.streaks.arthContribution.weeks}
              variant="light"
            />
            <ContributionStreakCard
              icon="🤝"
              title="Fulfilment Streak"
              subtitle="Orders fulfilled with no cancellations"
              current={reputation.fulfilmentStreak.current}
              longest={reputation.fulfilmentStreak.max}
              unit="orders"
              variant="light"
            />
          </View>
        )}

        {achievements.length > 0 && (
          <View style={styles.badgesWrap}>
            <Text style={styles.sectionTitle}>Badges</Text>
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
  // The one real "button" on this page — sage green fill, matching the requested palette
  // (beige page, sage buttons, brown used sparingly for card borders/accents).
  dismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.sage,
    marginLeft: -4,
  },
  dismissText: { fontSize: 13, color: COLORS.white, fontWeight: '700' },
  mascotSection: { alignItems: 'center', marginTop: 4 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginTop: -6 },
  card: { gap: 8 },
  growthRow: { gap: 6 },
  growthProgressText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  streaksWrap: { gap: 12 },
  badgesWrap: { marginTop: 8, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginLeft: 4 },
});
