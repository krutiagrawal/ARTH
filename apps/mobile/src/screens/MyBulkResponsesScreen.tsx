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
import { useMyBulkResponses } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import type { ApiMyBulkResponse } from '../api/nursery';

const STATUS_COLOR: Record<string, any> = {
  proposed: { backgroundColor: 'rgba(212,168,83,0.18)' },
  accepted: { backgroundColor: 'rgba(94,133,80,0.15)' },
  handed_off: { backgroundColor: 'rgba(94,133,80,0.15)' },
  fulfilled: { backgroundColor: 'rgba(94,133,80,0.15)' },
  declined: { backgroundColor: 'rgba(194,74,59,0.12)' },
  withdrawn: { backgroundColor: 'rgba(194,74,59,0.12)' },
};

function ResponseRow({ r }: { r: ApiMyBulkResponse }) {
  return (
    <BorderCard noPadding style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{r.ngoName}</Text>
        <Text style={styles.meta}>{r.quantityOffered} × {r.species}{r.priceCents != null ? ` · ₹${(r.priceCents / 100).toFixed(0)}` : ' · Free'}</Text>
        <Text style={styles.date}>{new Date(r.createdAt).toLocaleDateString()}</Text>
      </View>
      <View style={[styles.statusPill, STATUS_COLOR[r.status]]}>
        <Text style={styles.statusText}>{r.status.replace('_', ' ')}</Text>
      </View>
    </BorderCard>
  );
}

/** Nursery-only — every offer this nursery has ever made to an NGO's bulk requirement, regardless
 * of status, unlike NurseryBulkRequirementsScreen which only shows still-open requirements. */
export function MyBulkResponsesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: responses, isLoading, refetch } = useMyBulkResponses();
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
        <Text style={styles.headerTitle}>My Responses</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : !responses || responses.length === 0 ? (
        <EmptyState icon="🤝" title="No responses yet" body="Offers you make to NGOs' bulk requirements will show up here." />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {responses.map((r) => (
            <ResponseRow key={r.id} r={r} />
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
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary, textTransform: 'capitalize' },
});
