import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { useNgoDonations, useNgoDonationsSummary } from '../hooks/useApiQueries';
import type { DonationsFilter } from '../api/ngo';

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

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {summary.length > 0 && (
          <GlassCard variant="warm" style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>By campaign</Text>
            {summary.map((row) => (
              <View key={row.campaignId} style={styles.summaryRow}>
                <Text style={styles.summaryLabel} numberOfLines={1}>{row.campaignTitle}</Text>
                <Text style={styles.summaryValue}>₹{(row.totalAmountCents / 100).toLocaleString()} ({row.donationCount})</Text>
              </View>
            ))}
          </GlassCard>
        )}

        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity key={f.key} style={[styles.chip, statusFilter === f.key && styles.chipSelected]} onPress={() => setStatusFilter(f.key)}>
              <Text style={[styles.chipText, statusFilter === f.key && styles.chipTextSelected]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && donations.length === 0 && (
          <EmptyState icon="💸" title="No donations here" body="Donations matching this filter will show up here." />
        )}
        {donations.map((d) => (
          <GlassCard key={d.id} variant="warm" style={styles.card}>
            <View style={styles.cardRow}>
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
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 20 },
  summaryCard: { marginBottom: 12, gap: 6 },
  summaryTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
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
