import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/colors';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { IconBadge } from '../components/common/IconBadge';
import { useMyCampaigns, useCloseCampaign, useReopenCampaign } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';

function FadeInRow({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

const CAMPAIGN_STATUS_COLORS: Record<'active' | 'closed', string> = {
  active: COLORS.sage,
  closed: COLORS.textMuted,
};

function StatusPill({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.statusPillText, { color }]}>{label}</Text>
    </View>
  );
}

export function NgoCampaignsScreen({ navigation }: any) {
  const bottomClearance = useBottomNavClearance();
  const { data: campaigns = [], isLoading } = useMyCampaigns();
  const closeMutation = useCloseCampaign();
  const reopenMutation = useReopenCampaign();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && campaigns.length === 0 && (
          <EmptyState icon="💚" title="No campaigns yet" body="Start a donation campaign to fund your next drive." actionLabel="New campaign" onAction={() => navigation.navigate('NgoCreateCampaign')} />
        )}
        {campaigns.map((c, i) => {
          const progress = c.goalAmountCents ? Math.min(1, c.raisedAmountCents / c.goalAmountCents) : null;
          return (
            <FadeInRow key={c.id} delay={i * 60}>
              <GlassCard variant="warm" style={styles.card}>
                <View style={styles.cardRow}>
                  <IconBadge icon="💚" color={COLORS.golden} size={40} />
                  <View style={styles.cardContent}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle}>{c.title}</Text>
                      <StatusPill
                        label={c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                        color={CAMPAIGN_STATUS_COLORS[c.status]}
                      />
                    </View>
                    <Text style={styles.cardBody} numberOfLines={2}>{c.description}</Text>
                    <View style={styles.metaRow}>
                      <Text style={styles.metaText}>
                        ₹{(c.raisedAmountCents / 100).toLocaleString()}
                        {c.goalAmountCents ? ` / ₹${(c.goalAmountCents / 100).toLocaleString()}` : ' raised'}
                      </Text>
                    </View>
                    {progress != null && (
                      <View style={styles.progressTrack}>
                        <LinearGradient
                          colors={[COLORS.sageLight, COLORS.forest]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.progressFill, { width: `${progress * 100}%` }]}
                        />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => (c.status === 'active' ? closeMutation.mutate(c.id) : reopenMutation.mutate(c.id))}
                    >
                      <Text style={styles.toggleText}>{c.status === 'active' ? 'Close campaign' : 'Reopen campaign'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </GlassCard>
            </FadeInRow>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardContent: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1 },
  cardBody: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, gap: 8 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flexShrink: 1 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: COLORS.beige, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  toggleButton: { alignSelf: 'flex-start', marginTop: 10 },
  toggleText: { fontSize: 12, color: COLORS.forest, fontWeight: '700' },
  statusPill: { alignSelf: 'flex-start', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
});
