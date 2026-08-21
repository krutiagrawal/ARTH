import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { StatDisplay } from '../components/common/StatDisplay';
import { useNgoReports } from '../hooks/useApiQueries';

function MonthlyBarRow({ label, data }: { label: string; data: { month: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <View style={styles.barSection}>
      <Text style={styles.barSectionLabel}>{label}</Text>
      <View style={styles.barRow}>
        {data.map((d) => (
          <View key={d.month} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${Math.max(4, (d.count / max) * 100)}%` }]} />
            </View>
            <Text style={styles.barCount}>{d.count}</Text>
            <Text style={styles.barMonth}>{d.month}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function NgoReportsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: reports, isLoading } = useNgoReports();

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
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !reports ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.statsGrid}>
            <StatDisplay value={String(reports.totalDrives)} label="Total drives" />
            <StatDisplay value={String(reports.totalRsvps)} label="Total RSVPs" />
            <StatDisplay value={`₹${(reports.totalRaisedCents / 100).toLocaleString()}`} label="Raised" />
            <StatDisplay value={String(reports.volunteersInvolved)} label="Volunteers" />
            <StatDisplay value={String(reports.communitiesReached)} label="Cities reached" />
            <StatDisplay value={`${reports.co2AbsorptionKg}kg`} label="CO2 potential" />
          </View>

          <GlassCard variant="warm" style={styles.chartCard}>
            <MonthlyBarRow label="Donations (6 months)" data={reports.monthly.donations} />
            <MonthlyBarRow label="RSVPs (6 months)" data={reports.monthly.rsvps} />
            <MonthlyBarRow label="Adoptions (6 months)" data={reports.monthly.adoptions} />
          </GlassCard>
        </ScrollView>
      )}
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  chartCard: { gap: 16 },
  barSection: { gap: 8 },
  barSectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 90 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { width: 14, height: 56, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: COLORS.sage, borderRadius: 7 },
  barCount: { fontSize: 10, fontWeight: '700', color: COLORS.textPrimary },
  barMonth: { fontSize: 9, color: COLORS.textMuted },
});
