import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useMySponsorships } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { ApiMySponsorship } from '../api/drives';

const STATUS_COLOR: Record<string, any> = {
  succeeded: { backgroundColor: 'rgba(94,133,80,0.15)' },
  pending: { backgroundColor: 'rgba(212,168,83,0.18)' },
  failed: { backgroundColor: 'rgba(194,74,59,0.12)' },
  refunded: { backgroundColor: 'rgba(194,74,59,0.12)' },
};

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

function SponsorshipRow({ s, navigation }: { s: ApiMySponsorship; navigation: any }) {
  return (
    <TouchableOpacity onPress={() => navigation.navigate('DriveDetail', { driveId: s.driveId })} activeOpacity={0.85}>
      <BorderCard noPadding style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{s.speciesName}</Text>
          <Text style={styles.meta}>{s.driveTitle} · {s.ngoName}</Text>
          <Text style={styles.date}>{new Date(s.sponsoredAt).toLocaleDateString()}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amount}>{formatRupees(s.amountCents)}</Text>
          <View style={[styles.statusPill, STATUS_COLOR[s.status]]}>
            <Text style={styles.statusText}>{s.status}</Text>
          </View>
        </View>
      </BorderCard>
    </TouchableOpacity>
  );
}

export function MySponsorshipsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: sponsorships, isLoading, refetch } = useMySponsorships();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Sponsorships</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : !sponsorships || sponsorships.length === 0 ? (
        <EmptyState icon="🌱" title="No sponsorships yet" body="Plants you sponsor on drives will show up here." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {sponsorships.map((s) => (
            <SponsorshipRow key={s.id} s={s} navigation={navigation} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.md, padding: 14, marginBottom: 10 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  meta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  date: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  amount: { fontSize: 15, fontWeight: '700', color: COLORS.forest },
  statusPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
});
