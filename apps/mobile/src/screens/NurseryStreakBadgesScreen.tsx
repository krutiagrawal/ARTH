import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
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
      <StatusBar style="light" />
      <LinearGradient
        colors={[COLORS.nightForest, COLORS.forest, COLORS.forestDeep]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.dismissButton}>
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
            <GrowthLevelBadge level={growthLevel} />
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
          <TrustScoreGauge score={reputation?.trustScore ?? null} factors={reputation?.trustScoreFactors} />
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
            />
            <ContributionStreakCard
              icon="🌿"
              title="Inventory Freshness Streak"
              subtitle="Kept stock listings up to date"
              current={reputation.streaks.inventoryFreshness.current}
              longest={reputation.streaks.inventoryFreshness.longest}
              weeks={reputation.streaks.inventoryFreshness.weeks}
            />
            <ContributionStreakCard
              icon="🌍"
              title="ARTH Contribution Streak"
              subtitle="Any meaningful activity on ARTH"
              current={reputation.streaks.arthContribution.current}
              longest={reputation.streaks.arthContribution.longest}
              weeks={reputation.streaks.arthContribution.weeks}
            />
            <ContributionStreakCard
              icon="🤝"
              title="Fulfilment Streak"
              subtitle="Orders fulfilled with no cancellations"
              current={reputation.fulfilmentStreak.current}
              longest={reputation.fulfilmentStreak.max}
              unit="orders"
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
  dismissButton: { padding: 8, marginLeft: -8 },
  dismissText: { fontSize: 14, color: COLORS.white, fontWeight: '600' },
  mascotSection: { alignItems: 'center', marginTop: 4 },
  title: { fontSize: 26, fontWeight: '800', color: COLORS.white, textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20, marginTop: -6 },
  card: { gap: 8 },
  growthRow: { gap: 6 },
  growthProgressText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  streaksWrap: { gap: 12 },
  badgesWrap: { marginTop: 8, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.white, marginLeft: 4 },
});
