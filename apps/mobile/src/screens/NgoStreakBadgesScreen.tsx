import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ON_LIGHT_SURFACE } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { Mascot } from '../components/common/Mascot';
import { ContributionStreakCard } from '../components/common/ContributionStreakCard';
import { AchievementGrid, AchievementDetailModal } from '../components/common/AchievementGrid';
import { useNgoAchievements, useNgoReputation, useNgoLeaderboard } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { ApiAchievement } from '../api/achievements';
import type { NgoGrowthLevel, NgoTrustScoreFactors } from '../api/ngoReputation';

// Tenure + lifetime-impact tiers — independent of ARTH Trust Score. Same tier set as nursery's
// GROWTH_LEVEL_META, kept as its own local copy since it's typed against NgoGrowthLevel and this
// screen is the only NGO consumer (not worth a shared cross-role component for one usage each).
const NGO_GROWTH_LEVEL_META: Record<NgoGrowthLevel, { emoji: string; label: string; color: string }> = {
  seedling: { emoji: '🌱', label: 'Seedling', color: COLORS.sageLight },
  growing: { emoji: '🪴', label: 'Growing', color: COLORS.sage },
  established: { emoji: '🌳', label: 'Established', color: COLORS.sageDark },
  evergreen: { emoji: '🌲', label: 'Evergreen', color: COLORS.forest },
};

const TRUST_FACTOR_LABELS: Record<keyof NgoTrustScoreFactors, string> = {
  driveCompletion: 'Drive completion',
  updateFreshness: 'Update freshness',
  complianceCompleteness: 'Compliance completeness',
};

function trustBandColor(score: number): string {
  if (score >= 85) return COLORS.sage;
  if (score >= 65) return COLORS.golden;
  if (score >= 40) return COLORS.sunrise;
  return COLORS.coral;
}

function GrowthLevelBadge({ level }: { level: NgoGrowthLevel }) {
  const meta = NGO_GROWTH_LEVEL_META[level];
  return (
    <View style={[styles.growthBadge, { backgroundColor: `${meta.color}33`, borderColor: meta.color }]}>
      <Text style={styles.growthEmoji}>{meta.emoji}</Text>
      <Text style={styles.growthLabel}>{meta.label}</Text>
    </View>
  );
}

function TrustScoreGauge({ score, factors }: { score: number | null; factors?: NgoTrustScoreFactors | null }) {
  if (score == null) {
    return (
      <View style={styles.trustGauge}>
        <Text style={styles.trustPendingLabel}>ARTH Trust Score</Text>
        <Text style={styles.trustPendingValue}>Not yet verified</Text>
      </View>
    );
  }

  const color = trustBandColor(score);
  return (
    <View style={styles.trustGauge}>
      <View style={styles.trustHeaderRow}>
        <Text style={styles.trustLabel}>ARTH Trust Score</Text>
        <Text style={[styles.trustScore, { color }]}>{score}</Text>
      </View>
      <View style={styles.trustTrack}>
        <View style={[styles.trustFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      {factors && (
        <View style={styles.trustFactors}>
          {(Object.keys(factors) as (keyof NgoTrustScoreFactors)[]).map((key) => (
            <View key={key} style={styles.trustFactorRow}>
              <Text style={styles.trustFactorLabel}>{TRUST_FACTOR_LABELS[key]}</Text>
              <Text style={styles.trustFactorValue}>{factors[key]}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export function NgoStreakBadgesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: reputation, refetch: refetchReputation } = useNgoReputation(12);
  const { data: achievements = [], refetch: refetchAchievements } = useNgoAchievements();
  const { data: leaderboard, refetch: refetchLeaderboard } = useNgoLeaderboard(5);
  const [selected, setSelected] = useState<ApiAchievement | null>(null);
  const { refreshing, onRefresh } = usePullToRefresh([refetchReputation, refetchAchievements, refetchLeaderboard]);

  const growthLevel = reputation?.growthLevel ?? 'seedling';
  const nextMeta = reputation?.growthProgress.nextLevel ? NGO_GROWTH_LEVEL_META[reputation.growthProgress.nextLevel] : null;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

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
          <Mascot size={90} mood="encouraging" animate />
        </View>

        <Text style={styles.title}>Growth & Trust</Text>
        <Text style={styles.subtitle}>
          Built from real ARTH activity — drives run, updates posted, and impact logged.
        </Text>

        <BorderCard style={styles.card}>
          <View style={styles.growthRow}>
            <GrowthLevelBadge level={growthLevel} />
            {nextMeta && reputation && (
              <Text style={styles.growthProgressText}>
                {(reputation.growthProgress.treesToNext ?? 0) > 0
                  ? `${reputation.growthProgress.treesToNext} more trees planted`
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
              icon="📝"
              title="Update Streak"
              subtitle="Posted an update this week"
              current={reputation.streaks.updates.current}
              longest={reputation.streaks.updates.longest}
              weeks={reputation.streaks.updates.weeks}
              variant="light"
            />
            <ContributionStreakCard
              icon="🤝"
              title="Drive Activity Streak"
              subtitle="Created or completed a drive this week"
              current={reputation.streaks.driveActivity.current}
              longest={reputation.streaks.driveActivity.longest}
              weeks={reputation.streaks.driveActivity.weeks}
              variant="light"
            />
            <ContributionStreakCard
              icon="🌳"
              title="Impact Verification Streak"
              subtitle="Logged planted trees or drive attendance"
              current={reputation.streaks.impactVerification.current}
              longest={reputation.streaks.impactVerification.longest}
              weeks={reputation.streaks.impactVerification.weeks}
              variant="light"
            />
          </View>
        )}

        {leaderboard && (
          <BorderCard style={styles.card}>
            <Text style={styles.leaderboardTitle}>Leaderboard</Text>
            <Text style={styles.leaderboardRank}>
              {leaderboard.myRank ? `#${leaderboard.myRank}` : 'Unranked'}
              <Text style={styles.leaderboardTotal}> of {leaderboard.totalNgos} NGOs</Text>
            </Text>
            {leaderboard.entries.slice(0, 5).map((entry) => (
              <View key={entry.id} style={styles.leaderboardRow}>
                <Text style={styles.leaderboardEntryRank}>#{entry.rank}</Text>
                <Text style={styles.leaderboardEntryName} numberOfLines={1}>{entry.orgName}</Text>
                <Text style={styles.leaderboardEntryTrees}>{entry.treesPlanted} 🌳</Text>
              </View>
            ))}
          </BorderCard>
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

  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
  },
  growthEmoji: { fontSize: 16 },
  growthLabel: { fontSize: 13, fontWeight: '700', color: ON_LIGHT_SURFACE.primary },

  trustGauge: { gap: 8 },
  trustHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  trustLabel: { fontSize: 13, fontWeight: '600', color: ON_LIGHT_SURFACE.secondary },
  trustScore: { fontSize: 28, fontWeight: '900' },
  trustPendingLabel: { fontSize: 13, fontWeight: '600', color: ON_LIGHT_SURFACE.secondary },
  trustPendingValue: { fontSize: 15, fontWeight: '700', marginTop: 2, color: ON_LIGHT_SURFACE.muted },
  trustTrack: { height: 8, borderRadius: RADIUS.full, backgroundColor: COLORS.beige, overflow: 'hidden' },
  trustFill: { height: '100%', borderRadius: RADIUS.full },
  trustFactors: { marginTop: SPACING.xs, gap: 4 },
  trustFactorRow: { flexDirection: 'row', justifyContent: 'space-between' },
  trustFactorLabel: { fontSize: 12, color: ON_LIGHT_SURFACE.muted },
  trustFactorValue: { fontSize: 12, fontWeight: '700', color: ON_LIGHT_SURFACE.secondary },

  streaksWrap: { gap: 12 },
  leaderboardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  leaderboardRank: { fontSize: 22, fontWeight: '900', color: COLORS.forest, marginTop: 2 },
  leaderboardTotal: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  leaderboardEntryRank: { width: 30, fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  leaderboardEntryName: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  leaderboardEntryTrees: { fontSize: 12, color: COLORS.textSecondary },
  badgesWrap: { marginTop: 8, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary, marginLeft: 4 },
});
