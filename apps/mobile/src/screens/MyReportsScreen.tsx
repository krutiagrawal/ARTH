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
import { useMyReports } from '../hooks/useSocialQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { REPORT_REASONS, type ApiMyReport } from '../api/social';

const STATUS_LABEL: Record<string, string> = { open: 'Under review', actioned: 'Actioned', dismissed: 'Dismissed' };
const TARGET_LABEL: Record<string, string> = {
  post: 'Post',
  story: 'Story',
  user: 'User',
  ngo: 'NGO',
  nursery: 'Nursery',
  corporate: 'Corporate account',
  portfolio_entry: 'Past-work entry',
  order_review: 'Review',
};

function ReportRow({ report }: { report: ApiMyReport }) {
  const reasonLabel = REPORT_REASONS.find((r) => r.key === report.reason)?.label ?? report.reason;
  return (
    <BorderCard noPadding style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{TARGET_LABEL[report.targetType] ?? report.targetType} reported</Text>
        <Text style={styles.meta}>{reasonLabel} · {new Date(report.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={[styles.statusPill, report.status === 'actioned' && styles.statusPillActioned]}>
        <Text style={styles.statusText}>{STATUS_LABEL[report.status] ?? report.status}</Text>
      </View>
    </BorderCard>
  );
}

/** Available to every role's account — content/accounts I've reported and what came of them. */
export function MyReportsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = useMyReports();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const reports = data?.reports ?? [];

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
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : reports.length === 0 ? (
        <EmptyState icon="🚩" title="No reports filed" body="Content or accounts you report will show up here." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {reports.map((r) => (
            <ReportRow key={r.id} report={r} />
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
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(212,168,83,0.18)' },
  statusPillActioned: { backgroundColor: 'rgba(94,133,80,0.15)' },
  statusText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
});
