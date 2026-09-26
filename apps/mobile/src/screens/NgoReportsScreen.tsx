import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { StatDisplay } from '../components/common/StatDisplay';
import { SectionHeader } from '../components/common/SectionHeader';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { IconBadge } from '../components/common/IconBadge';
import { useNgoReports } from '../hooks/useApiQueries';
import { useFadeIn, useCountUp } from '../hooks/useAnimations';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

// Same tier set as NgoStreakBadgesScreen.tsx's NGO_GROWTH_LEVEL_META, kept as its own local copy
// per that file's convention (not worth sharing for two usages).
const GROWTH_LEVEL_META: Record<'seedling' | 'growing' | 'established' | 'evergreen', { emoji: string; label: string }> = {
  seedling: { emoji: '🌱', label: 'Seedling' },
  growing: { emoji: '🪴', label: 'Growing' },
  established: { emoji: '🌳', label: 'Established' },
  evergreen: { emoji: '🌲', label: 'Evergreen' },
};

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
  onPress,
}: {
  label: string;
  icon: string;
  color: string;
  data: { month: string; count: number }[];
  delay?: number;
  onPress?: () => void;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const rowAnim = useFadeIn(delay);
  return (
    <Animated.View style={[styles.barSection, rowAnim]}>
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={!onPress}>
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
      </TouchableOpacity>
    </Animated.View>
  );
}

function StatLink({ onPress, style, children }: { onPress?: () => void; style?: any; children: React.ReactNode }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} disabled={!onPress} style={style}>
      {children}
    </TouchableOpacity>
  );
}

export function NgoReportsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: reports, isLoading, refetch } = useNgoReports();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Reports" subtitle="Track your impact over time" onBack={() => navigation.goBack()} />

      {isLoading || !reports ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <View style={styles.summaryCard}>
            <StatLink style={styles.summaryItem} onPress={() => navigation.navigate('NgoManage', { initialSegment: 'drives' })}>
              <StatDisplay value={String(reports.totalDrives)} label="Total Drives" align="center" size="md" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} />
            </StatLink>
            <View style={styles.summaryDivider} />
            <StatLink style={styles.summaryItem} onPress={() => navigation.navigate('NgoManage', { initialSegment: 'drives' })}>
              <StatDisplay value={String(reports.totalRsvps)} label="RSVPs" align="center" size="md" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} />
            </StatLink>
            <View style={styles.summaryDivider} />
            <StatLink style={styles.summaryItem} onPress={() => navigation.navigate('NgoDonations')}>
              <StatDisplay value={`₹${(reports.totalRaisedCents / 100).toLocaleString()}`} label="Raised" align="center" size="md" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} />
            </StatLink>
            <View style={styles.summaryDivider} />
            <StatLink style={styles.summaryItem} onPress={() => navigation.navigate('NgoVolunteers')}>
              <StatDisplay value={String(reports.volunteersInvolved)} label="Volunteers" align="center" size="md" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} />
            </StatLink>
          </View>

          <View style={[styles.bigStatsRow, styles.firstBigStatsRow]}>
            <StatLink style={styles.bigStat} onPress={() => navigation.navigate('NgoManage', { initialSegment: 'drives' })}>
              <StatDisplay value={String(reports.communitiesReached)} label="Cities Reached" align="center" size="lg" />
            </StatLink>
            <StatLink style={styles.bigStat} onPress={() => navigation.navigate('NgoManage', { initialSegment: 'trees' })}>
              <StatDisplay value={`${reports.co2AbsorptionKg}kg`} label="CO₂ Potential" align="center" size="lg" />
            </StatLink>
          </View>

          <View style={styles.bigStatsRow}>
            <StatLink style={styles.bigStat} onPress={() => navigation.navigate('NgoManage', { initialSegment: 'trees' })}>
              <StatDisplay value={String(reports.treesAvailable)} label="Trees Available" align="center" size="lg" />
            </StatLink>
            <StatLink style={styles.bigStat} onPress={() => navigation.navigate('NgoManage', { initialSegment: 'trees' })}>
              <StatDisplay value={String(reports.treesAdopted)} label="Trees Adopted" align="center" size="lg" />
            </StatLink>
          </View>

          <SectionHeader title="Survival & attendance" />
          <View style={styles.bigStatsRow}>
            <StatLink style={styles.bigStat} onPress={() => navigation.navigate('NgoPlantations')}>
              <StatDisplay
                value={`${reports.survival.survivalRate}%`}
                label="Survival Rate"
                sublabel={`${reports.survival.total} trees tracked`}
                align="center"
                size="lg"
              />
            </StatLink>
            <StatLink style={styles.bigStat} onPress={() => navigation.navigate('NgoManage', { initialSegment: 'drives' })}>
              <StatDisplay
                value={reports.attendance.rate != null ? `${reports.attendance.rate}%` : '–'}
                label="Attendance Rate"
                sublabel={reports.attendance.rate != null ? `${reports.attendance.recorded} recorded` : 'Not yet tracked'}
                align="center"
                size="lg"
              />
            </StatLink>
          </View>

          <SectionHeader title="Standing & funding" />
          <View style={styles.bigStatsRow}>
            <StatLink style={styles.bigStat} onPress={() => navigation.navigate('NgoStreakBadges')}>
              <StatDisplay value={reports.trustScore != null ? String(reports.trustScore) : 'N/A'} label="ARTH Trust Score" align="center" size="lg" />
            </StatLink>
            <StatLink style={styles.bigStat} onPress={() => navigation.navigate('NgoStreakBadges')}>
              <StatDisplay value={`${GROWTH_LEVEL_META[reports.growthLevel].emoji} ${GROWTH_LEVEL_META[reports.growthLevel].label}`} label="Growth Level" align="center" size="lg" />
            </StatLink>
          </View>
          <StatLink onPress={() => navigation.navigate('NgoManage', { initialSegment: 'drives' })}>
            <BorderCard style={styles.sponsorCard}>
              <StatDisplay
                value={String(reports.sponsoredTrees.count)}
                label="Sponsored Trees"
                sublabel={`₹${(reports.sponsoredTrees.totalAmountCents / 100).toLocaleString()} raised`}
                align="center"
                size="lg"
              />
            </BorderCard>
          </StatLink>

          <SectionHeader title="Impact over 6 months" />
          <BorderCard style={styles.chartCard}>
            <MonthlyBarRow
              label="Donations (6 months)"
              icon="💰"
              color={COLORS.golden}
              data={reports.monthly.donations}
              delay={0}
              onPress={() => navigation.navigate('NgoDonations')}
            />
            <MonthlyBarRow
              label="RSVPs (6 months)"
              icon="🤝"
              color={COLORS.sage}
              data={reports.monthly.rsvps}
              delay={120}
              onPress={() => navigation.navigate('NgoManage', { initialSegment: 'drives' })}
            />
            <MonthlyBarRow
              label="Adoptions (6 months)"
              icon="🌳"
              color={COLORS.forest}
              data={reports.monthly.adoptions}
              delay={240}
              onPress={() => navigation.navigate('NgoManage', { initialSegment: 'trees' })}
            />
          </BorderCard>
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
  bigStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  firstBigStatsRow: { marginTop: 20 },
  bigStat: { flex: 1 },
  sponsorCard: { marginBottom: 16 },
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
