import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { EcoWidget } from '../components/common/EcoWidget';
import { EmptyState } from '../components/common/EmptyState';
import { useStockAnalytics, useStockLedger } from '../hooks/useApiQueries';
import type { ApiStockLedgerEntry } from '../api/nursery';

const REASON_LABEL: Record<ApiStockLedgerEntry['reason'], string> = {
  manual_add: 'Added stock',
  manual_adjust: 'Adjusted stock',
  manual_remove: 'Removed stock',
  reservation_fulfilled: 'Given to a planter',
};

function LedgerRow({ item }: { item: ApiStockLedgerEntry }) {
  const positive = item.delta > 0;
  return (
    <BorderCard noPadding style={styles.ledgerRow}>
      <View style={styles.ledgerText}>
        <Text style={styles.ledgerSpecies}>{item.species}</Text>
        <Text style={styles.ledgerMeta}>
          {REASON_LABEL[item.reason]} · {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <Text style={[styles.ledgerDelta, { color: positive ? COLORS.sage : COLORS.coral }]}>
        {positive ? '+' : ''}
        {item.delta}
      </Text>
    </BorderCard>
  );
}

export function NurseryStockAnalyticsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: analytics, isLoading: statsLoading } = useStockAnalytics();
  const { data: ledger = [], isLoading: ledgerLoading } = useStockLedger();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Stock Analytics"
        subtitle="How your inventory has grown over time"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      {statsLoading || !analytics ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.gridRow}>
            <EcoWidget icon="🎁" value={analytics.totalGivenOutLifetime} label="Given out (lifetime)" color={COLORS.golden} delay={0} style={styles.gridTile} fill />
            <EcoWidget icon="🌱" value={analytics.totalAddedLifetime} label="Added (lifetime)" color={COLORS.sage} delay={60} style={styles.gridTile} fill />
          </View>
          <View style={styles.gridRow}>
            <EcoWidget icon="🤝" value={analytics.reservationsFulfilled} label="Requests fulfilled" color={COLORS.xpBlue} delay={120} style={styles.gridTile} fill />
            <EcoWidget icon="📦" value={analytics.currentTotalQuantity} label="Currently in stock" color={COLORS.earth} delay={180} style={styles.gridTile} fill />
          </View>

          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {ledgerLoading ? (
            <ActivityIndicator color={COLORS.sage} style={{ marginTop: 12 }} />
          ) : ledger.length === 0 ? (
            <EmptyState icon="📜" title="No activity yet" body="Stock changes will show up here." />
          ) : (
            ledger.map((item) => <LedgerRow key={item.id} item={item} />)
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  gridRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 10 },
  gridTile: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16, marginBottom: 8 },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 8,
  },
  ledgerText: { flex: 1 },
  ledgerSpecies: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  ledgerMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  ledgerDelta: { fontSize: 15, fontWeight: '800' },
});
