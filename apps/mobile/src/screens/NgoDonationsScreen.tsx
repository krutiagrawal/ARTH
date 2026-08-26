import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { DonationJarIllustration } from '../components/common/DonationJarIllustration';
import { SectionHeader } from '../components/common/SectionHeader';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { IconBadge } from '../components/common/IconBadge';
import { useNgoDonations, useNgoDonationsSummary } from '../hooks/useApiQueries';
import type { DonationsFilter } from '../api/ngo';
import { useSlideUp } from '../hooks/useAnimations';

const STATUS_BADGE: Record<string, { icon: string; color: string }> = {
  succeeded: { icon: '💰', color: COLORS.sage },
  pending: { icon: '⏳', color: COLORS.golden },
  failed: { icon: '✕', color: COLORS.coral },
  refunded: { icon: '↩', color: COLORS.textMuted },
};

function FadeInRow({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

const STATUS_FILTERS: { key: DonationsFilter['status'] | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'succeeded', label: 'Succeeded' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
  { key: 'refunded', label: 'Refunded' },
];

export function NgoDonationsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [statusFilter, setStatusFilter] = useState<DonationsFilter['status'] | 'all'>('all');
  const { data, isLoading } = useNgoDonations(statusFilter === 'all' ? {} : { status: statusFilter });
  const { data: summary = [] } = useNgoDonationsSummary();
  const donations = data?.donations ?? [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Donations" subtitle="View and manage all donations" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {summary.length > 0 && (
          <>
          <SectionHeader title="By campaign" />
          <GlassCard variant="warm" style={styles.summaryCard}>
            {summary.map((row) => (
              <View key={row.campaignId} style={styles.summaryRow}>
                <Text style={styles.summaryLabel} numberOfLines={1}>{row.campaignTitle}</Text>
                <Text style={styles.summaryValue}>₹{(row.totalAmountCents / 100).toLocaleString()} ({row.donationCount})</Text>
              </View>
            ))}
          </GlassCard>
          </>
        )}

        <SectionHeader title="All donations" icon="💸" />
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity key={f.key} style={[styles.chip, statusFilter === f.key && styles.chipSelected]} onPress={() => setStatusFilter(f.key)}>
              <Text style={[styles.chipText, statusFilter === f.key && styles.chipTextSelected]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && donations.length === 0 && (
          <View style={styles.emptyWrap}>
            <EmptyState
              illustration={<DonationJarIllustration size={200} />}
              title={statusFilter === 'all' ? 'No donations yet' : 'No donations here'}
              body={
                statusFilter === 'all'
                  ? "When donations come in, you'll see them here."
                  : 'Donations matching this filter will show up here.'
              }
            />
            <AnimatedButton
              label="♥  Accept Donations"
              onPress={() => navigation.navigate('NgoCreateCampaign')}
              fullWidth
              gradientColors={[COLORS.forest, COLORS.forestDeep]}
              style={styles.emptyCta}
            />
          </View>
        )}
        {donations.map((d, i) => (
          <FadeInRow key={d.id} delay={i * 60}>
            <GlassCard variant="warm" style={styles.card}>
              <View style={styles.cardRow}>
                <IconBadge icon={STATUS_BADGE[d.status]?.icon ?? '💰'} color={STATUS_BADGE[d.status]?.color ?? COLORS.sage} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{d.donor.name}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>{d.campaignTitle}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amountText}>₹{(d.amountCents / 100).toLocaleString()}</Text>
                  <Text style={styles.statusText}>{d.status}</Text>
                </View>
              </View>
            </GlassCard>
          </FadeInRow>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  emptyWrap: { marginTop: 24 },
  emptyCta: { marginTop: 8 },
  summaryCard: { marginBottom: 4, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  summaryValue: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.6)', borderWidth: 1, borderColor: COLORS.sand },
  chipSelected: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  chipText: { fontSize: 12, color: COLORS.textPrimary, fontWeight: '600' },
  chipTextSelected: { color: COLORS.white },
  loader: { marginTop: 20 },
  card: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  amountText: { fontSize: 15, fontWeight: '700', color: COLORS.forest },
  statusText: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
