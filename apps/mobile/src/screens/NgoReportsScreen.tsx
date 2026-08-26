import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { StatDisplay } from '../components/common/StatDisplay';
import { SectionHeader } from '../components/common/SectionHeader';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { IconBadge } from '../components/common/IconBadge';
import { useNgoReports } from '../hooks/useApiQueries';
import { useFadeIn, useCountUp } from '../hooks/useAnimations';

function AnimatedBar({ count, max, delay, isLatest }: { count: number; max: number; delay: number; isLatest: boolean }) {
  const height = useCountUp(Math.max(4, (count / max) * 100), 900, delay);
  const style = useAnimatedStyle(() => ({ height: `${height.value}%` }));
  return (
    <View style={styles.barTrack}>
      <Animated.View style={style}>
        <LinearGradient
          colors={isLatest ? [COLORS.golden, COLORS.amber] : [COLORS.sageLight, COLORS.forest]}
          style={styles.barFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </Animated.View>
    </View>
  );
}

function MonthlyBarRow({
  label,
  icon,
  color,
  data,
  delay = 0,
}: {
  label: string;
  icon: string;
  color: string;
  data: { month: string; count: number }[];
  delay?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const rowAnim = useFadeIn(delay);
  return (
    <Animated.View style={[styles.barSection, rowAnim]}>
      <View style={styles.barSectionHeader}>
        <IconBadge icon={icon} color={color} size={28} />
        <Text style={styles.barSectionLabel}>{label}</Text>
      </View>
      <View style={styles.barRow}>
        {data.map((d, i) => (
          <View key={d.month} style={styles.barCol}>
            <AnimatedBar count={d.count} max={max} delay={delay + i * 60} isLatest={i === data.length - 1} />
            <Text style={styles.barCount}>{d.count}</Text>
            <Text style={styles.barMonth}>{d.month}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

export function NgoReportsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: reports, isLoading } = useNgoReports();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Reports" subtitle="Track your impact over time" onBack={() => navigation.goBack()} />

      {isLoading || !reports ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryCard}>
            <StatDisplay value={String(reports.totalDrives)} label="Total Drives" align="center" size="md" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} style={styles.summaryItem} />
            <View style={styles.summaryDivider} />
            <StatDisplay value={String(reports.totalRsvps)} label="RSVPs" align="center" size="md" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} style={styles.summaryItem} />
            <View style={styles.summaryDivider} />
            <StatDisplay value={`₹${(reports.totalRaisedCents / 100).toLocaleString()}`} label="Raised" align="center" size="md" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} style={styles.summaryItem} />
            <View style={styles.summaryDivider} />
            <StatDisplay value={String(reports.volunteersInvolved)} label="Volunteers" align="center" size="md" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} style={styles.summaryItem} />
          </View>

          <View style={styles.bigStatsRow}>
            <StatDisplay value={String(reports.communitiesReached)} label="Cities Reached" align="center" size="lg" style={styles.bigStat} />
            <StatDisplay value={`${reports.co2AbsorptionKg}kg`} label="CO₂ Potential" align="center" size="lg" style={styles.bigStat} />
          </View>

          <SectionHeader title="Impact over 6 months" />
          <GlassCard variant="warm" style={styles.chartCard}>
            <MonthlyBarRow label="Donations (6 months)" icon="💰" color={COLORS.golden} data={reports.monthly.donations} delay={0} />
            <MonthlyBarRow label="RSVPs (6 months)" icon="🤝" color={COLORS.sage} data={reports.monthly.rsvps} delay={120} />
            <MonthlyBarRow label="Adoptions (6 months)" icon="🌳" color={COLORS.forest} data={reports.monthly.adoptions} delay={240} />
          </GlassCard>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.forest,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 8,
    ...SHADOWS.md,
  },
  summaryItem: { flex: 1 },
  summaryDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.2)' },
  bigStatsRow: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 20 },
  bigStat: { flex: 1 },
  chartCard: { gap: 16 },
  barSection: { gap: 8 },
  barSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barSectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 90 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { width: 14, height: 56, borderRadius: 7, backgroundColor: COLORS.beige, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', height: '100%', borderRadius: 7 },
  barCount: { fontSize: 10, fontWeight: '700', color: COLORS.textPrimary },
  barMonth: { fontSize: 9, color: COLORS.textMuted },
});
