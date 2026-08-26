import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { COLORS } from '../constants/colors';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useOwnGroupChallenges } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';

const GOAL_TYPE_LABEL: Record<string, string> = {
  trees_planted_count: 'Trees planted',
  cities_count: 'Cities reached',
  streak_days: 'Streak days',
  rare_species_count: 'Rare species',
};

function FadeInRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export function GroupChallengesScreen({ navigation }: any) {
  const { data: challenges = [], isLoading } = useOwnGroupChallenges();

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
      {!isLoading && challenges.length === 0 && (
        <EmptyState icon="🏆" title="No challenges yet" body="Set a shared goal for your members to plant toward together." />
      )}
      {challenges.map((c, i) => {
        const pct = Math.min(100, Math.round((c.progress / c.goalTotal) * 100));
        return (
          <FadeInRow key={c.id} delay={i * 60}>
            <GlassCard variant="warm" style={styles.card}>
              <Text style={styles.cardTitle}>{c.title}</Text>
              <Text style={styles.cardMeta}>{GOAL_TYPE_LABEL[c.goalType]} · {c.participantCount} joined</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <View style={styles.progressRow}>
                <Text style={styles.progressText}>{c.progress} / {c.goalTotal}</Text>
                <Text style={styles.progressText}>Ends {new Date(c.endsAt).toLocaleDateString()}</Text>
              </View>
            </GlassCard>
          </FadeInRow>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingBottom: 32 },
  loader: { marginTop: 20 },
  card: { marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, marginBottom: 10 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.beige, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.forest, borderRadius: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressText: { fontSize: 11, color: COLORS.textMuted },
});
