import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useGroupChallenges, useJoinGroupChallenge } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';
import { ApiError } from '../api/client';
import { useConfirm } from '../context/ConfirmDialogContext';

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

export function GroupDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const groupId: string | undefined = route?.params?.groupId;
  const { data: challenges = [], isLoading } = useGroupChallenges(groupId);
  const joinMutation = useJoinGroupChallenge();
  const confirm = useConfirm();

  const handleJoin = async (challengeId: string) => {
    try {
      await joinMutation.mutateAsync(challengeId);
      confirm("You're in!", 'Good luck reaching the goal together.');
    } catch (e) {
      confirm('Could not join', e instanceof ApiError ? e.message : 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Group" subtitle="Challenges and activity" onBack={() => navigation?.goBack?.()} align="left" />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.linkRow}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('GroupActivity', { groupId })}
          >
            <Text style={styles.linkButtonText}>📣 Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('GroupPostUpdate', { groupId })}
          >
            <Text style={styles.linkButtonText}>📸 Post update</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>Challenges</Text>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && challenges.length === 0 && (
          <EmptyState icon="🏆" title="No challenges yet" body="Check back soon — the group owner can start one from their dashboard." />
        )}
        {challenges.map((c, i) => {
          const pct = Math.min(100, Math.round((c.progress / c.goalTotal) * 100));
          return (
            <FadeInRow key={c.id} delay={i * 60}>
              <BorderCard style={styles.card}>
                <Text style={styles.cardTitle}>{c.title}</Text>
                <Text style={styles.cardMeta}>{c.description}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressText}>{GOAL_TYPE_LABEL[c.goalType]}: {c.progress} / {c.goalTotal}</Text>
                  <Text style={styles.progressText}>Ends {new Date(c.endsAt).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity style={styles.joinButton} onPress={() => handleJoin(c.id)} disabled={joinMutation.isPending}>
                  <Text style={styles.joinButtonText}>{joinMutation.isPending ? 'Joining…' : 'Join challenge'}</Text>
                </TouchableOpacity>
              </BorderCard>
            </FadeInRow>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  linkRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  linkButton: { flex: 1, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.warmBrown, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  linkButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase' },
  loader: { marginTop: 20 },
  card: { marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, marginBottom: 10 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.beige, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.forest, borderRadius: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressText: { fontSize: 11, color: COLORS.textMuted },
  joinButton: { alignSelf: 'flex-start', marginTop: 12 },
  joinButtonText: { fontSize: 13, color: COLORS.sage, fontWeight: '700' },
});
