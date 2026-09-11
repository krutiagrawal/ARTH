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
import { ImpactStatsCard } from '../components/common/ImpactStatsCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useNurseryImpact, useNurseryProfile } from '../hooks/useApiQueries';

export function NurseryImpactScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: impact, isLoading } = useNurseryImpact();
  const { data: profile } = useNurseryProfile();

  const maxTrend = Math.max(1, ...(impact?.monthlyTrend ?? []).map((m) => m.count));

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Your Impact"
        subtitle="How your saplings are growing across ARTH"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      {isLoading || !impact ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <ImpactStatsCard
            co2={impact.estimatedCo2Kg}
            treesPlanted={impact.treesGrowingThroughYou}
            daysActive={0}
            title="🌳 Trees Growing Through You"
            stats={[
              { value: impact.treesGrowingThroughYou, label: 'Trees Growing' },
              { value: impact.totalSaplingsSupplied, label: 'Saplings Supplied' },
              { value: `${impact.verificationPercentage}%`, label: 'Verified' },
            ]}
          />

          <View style={styles.gridRow}>
            <BorderCard style={styles.gridCard}>
              <Text style={styles.gridValue}>{impact.speciesCount}</Text>
              <Text style={styles.gridLabel}>Species supplied</Text>
            </BorderCard>
            <BorderCard style={styles.gridCard}>
              <Text style={styles.gridValue}>{impact.ngoDrivesSupported}</Text>
              <Text style={styles.gridLabel}>NGO drives supported</Text>
            </BorderCard>
            <BorderCard style={styles.gridCard}>
              <Text style={styles.gridValue}>{impact.estimatedCo2Kg.toFixed(0)}kg</Text>
              <Text style={styles.gridLabel}>Est. CO₂ / year</Text>
            </BorderCard>
          </View>

          <Text style={styles.sectionTitle}>Monthly trend</Text>
          <BorderCard style={styles.trendCard}>
            {impact.monthlyTrend.length === 0 ? (
              <Text style={styles.emptyTrend}>No plantings tracked yet.</Text>
            ) : (
              impact.monthlyTrend.map((row) => (
                <View key={row.month} style={styles.trendRow}>
                  <Text style={styles.trendMonth}>{row.month}</Text>
                  <View style={styles.trendBarTrack}>
                    <View style={[styles.trendBarFill, { width: `${Math.max(4, (row.count / maxTrend) * 100)}%` }]} />
                  </View>
                  <Text style={styles.trendCount}>{row.count}</Text>
                </View>
              ))
            )}
          </BorderCard>

          <AnimatedButton
            label="🗺️  View on Map"
            onPress={() => navigation.navigate('NurseryMap', { nurseryId: profile?.id })}
            variant="secondary"
            size="lg"
            fullWidth
            style={{ marginTop: 20 }}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: 4 },
  gridRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  gridCard: { flex: 1, alignItems: 'center', gap: 4 },
  gridValue: { fontSize: 18, fontWeight: '800', color: COLORS.forest },
  gridLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 20, marginBottom: 8 },
  trendCard: { gap: 10 },
  emptyTrend: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 8 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  trendMonth: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, width: 56 },
  trendBarTrack: { flex: 1, height: 10, borderRadius: RADIUS.full, backgroundColor: 'rgba(94,133,80,0.12)', overflow: 'hidden' },
  trendBarFill: { height: '100%', borderRadius: RADIUS.full, backgroundColor: COLORS.sage },
  trendCount: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, width: 24, textAlign: 'right' },
});
