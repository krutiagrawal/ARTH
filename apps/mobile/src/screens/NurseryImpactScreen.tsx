import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING, SHADOWS } from '../constants/theme';
import { TEXT } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { ProgressRing } from '../components/common/ProgressRing';
import { GROWTH_LEVEL_META } from '../components/common/GrowthLevelBadge';
import { useNurseryImpact, useNurseryProfile, useNurseryReputation, useNurseryStats } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useSlideUp } from '../hooks/useAnimations';
import { formatKg } from '../utils/impact';

// Rough figures used only to give the CO₂ number a relatable frame of reference.
const CAR_KG_CO2_PER_KM = 0.12;
const TREE_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
const BAR_AREA_HEIGHT = 110;

function Section({ title, delay, children }: { title: string; delay: number; children: React.ReactNode }) {
  const anim = useSlideUp(delay, 20);
  return (
    <Animated.View style={anim}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </Animated.View>
  );
}

function MetricTile({ icon, tint, value, label, hint }: { icon: string; tint: string; value: string; label: string; hint?: string }) {
  return (
    <View style={styles.metricTile}>
      <View style={[styles.metricIcon, { backgroundColor: tint + '2E' }]}>
        <Text style={styles.metricEmoji}>{icon}</Text>
      </View>
      <Text style={styles.metricValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.metricLabel} numberOfLines={2}>{label}</Text>
      {hint ? <Text style={[styles.metricHint, { color: tint }]}>{hint}</Text> : null}
    </View>
  );
}

function shortMonth(m: string) {
  // API sends "YYYY-MM" (or a ready label); fall back to the raw string.
  const match = /^(\d{4})-(\d{2})/.exec(m);
  if (!match) return m.slice(0, 3);
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleString(undefined, { month: 'short' });
}

export function NurseryImpactScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: impact, isLoading, refetch } = useNurseryImpact();
  const { data: profile } = useNurseryProfile();
  const { data: stats, refetch: refetchStats } = useNurseryStats();
  const { data: reputation, refetch: refetchRep } = useNurseryReputation();
  const { refreshing, onRefresh } = usePullToRefresh([refetch, refetchStats, refetchRep]);

  // Polling (15s, in the hooks) keeps the screen live while open; this also refreshes the moment
  // the screen regains focus (e.g. back from Stock or Orders).
  useFocusEffect(
    React.useCallback(() => {
      refetch();
      refetchStats();
      refetchRep();
    }, [refetch, refetchStats, refetchRep])
  );
  const heroAnim = useSlideUp(0, 20);

  const trend = impact?.monthlyTrend ?? [];
  const maxTrend = Math.max(1, ...trend.map((m) => m.count));
  const trendTotal = trend.reduce((s, m) => s + m.count, 0);
  const bestMonth = trend.reduce<{ month: string; count: number } | null>((b, m) => (!b || m.count > b.count ? m : b), null);

  const trees = impact?.treesGrowingThroughYou ?? 0;
  const nextMilestone = TREE_MILESTONES.find((m) => m > trees) ?? null;
  const prevMilestone = [...TREE_MILESTONES].reverse().find((m) => m <= trees) ?? 0;
  const milestoneProgress = nextMilestone ? (trees - prevMilestone) / (nextMilestone - prevMilestone) : 1;

  const co2 = impact?.estimatedCo2Kg ?? 0;
  const carKm = Math.round(co2 / CAR_KG_CO2_PER_KM);
  const verified = impact?.verificationPercentage ?? 0;

  const level = stats ? GROWTH_LEVEL_META[stats.growthLevel] : null;
  const gp = reputation?.growthProgress;
  const levelProgress =
    gp && gp.nextLevel && gp.suppliedToNext != null
      ? gp.lifetimeSupplied / Math.max(1, gp.lifetimeSupplied + gp.suppliedToNext)
      : 1;

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
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {/* Hero */}
          <Animated.View style={heroAnim}>
            <LinearGradient colors={[COLORS.nightForest, COLORS.forest]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
              <View style={styles.heroGlow} pointerEvents="none" />
              <View style={styles.heroTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroKicker}>🌳 TREES GROWING THROUGH YOU</Text>
                  <Text style={styles.heroNumber}>{trees.toLocaleString('en-IN')}</Text>
                  <Text style={styles.heroCaption}>from {impact.totalSaplingsSupplied.toLocaleString('en-IN')} saplings supplied</Text>
                </View>
                <ProgressRing
                  size={92}
                  strokeWidth={9}
                  progress={verified / 100}
                  color={COLORS.sageLight}
                  trackColor="rgba(255,255,255,0.15)"
                  label={`${Math.round(verified)}%`}
                  sublabel="verified"
                  delay={200}
                />
              </View>

              <View style={styles.heroStatRow}>
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{formatKg(co2)}<Text style={styles.heroStatUnit}> kg</Text></Text>
                  <Text style={styles.heroStatLabel}>CO₂ stored</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>
                    {impact.estimatedOxygenKg != null ? formatKg(impact.estimatedOxygenKg) : '–'}
                    <Text style={styles.heroStatUnit}> kg</Text>
                  </Text>
                  <Text style={styles.heroStatLabel}>Oxygen</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <Text style={styles.heroStatValue}>{impact.ngoDrivesSupported}</Text>
                  <Text style={styles.heroStatLabel}>NGO drives</Text>
                </View>
              </View>

              {carKm > 0 && (
                <View style={styles.heroEquiv}>
                  <Text style={styles.heroEquivText}>🚗 ≈ taking a car off the road for {carKm.toLocaleString('en-IN')} km</Text>
                </View>
              )}
              {impact.impactConfidence === 'low' && (
                <Text style={styles.heroNote}>Estimates firm up as more of your trees get verified.</Text>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Milestone */}
          <Section title="Next milestone" delay={80}>
            <BorderCard>
              <View style={styles.milestoneHead}>
                <Text style={styles.milestoneTitle}>
                  {nextMilestone ? `${nextMilestone.toLocaleString('en-IN')} trees` : 'Every milestone reached 🎉'}
                </Text>
                {nextMilestone ? (
                  <Text style={styles.milestoneSub}>{(nextMilestone - trees).toLocaleString('en-IN')} to go</Text>
                ) : null}
              </View>
              <View style={styles.track}>
                <LinearGradient
                  colors={[COLORS.sage, COLORS.forest]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.fill, { width: `${Math.max(4, milestoneProgress * 100)}%` }]}
                />
              </View>
              <View style={styles.milestoneEnds}>
                <Text style={styles.endLabel}>{prevMilestone.toLocaleString('en-IN')}</Text>
                <Text style={styles.endLabel}>{nextMilestone ? nextMilestone.toLocaleString('en-IN') : '∞'}</Text>
              </View>
            </BorderCard>
          </Section>

          {/* Metrics */}
          <Section title="At a glance" delay={140}>
            <View style={styles.metricGrid}>
              <MetricTile icon="🌿" tint={COLORS.sage} value={String(impact.speciesCount)} label="Species supplied" />
              <MetricTile icon="🤝" tint={COLORS.xpBlue} value={String(impact.ngoDrivesSupported)} label="NGO drives supported" />
              <MetricTile icon="📦" tint={COLORS.golden} value={stats ? String(stats.totalQuantity) : '–'} label="Saplings in stock" />
              <MetricTile icon="🏅" tint={COLORS.coral} value={stats ? String(stats.badgesCount ?? 0) : '–'} label="Badges earned" />
              <MetricTile
                icon="🔥"
                tint={COLORS.coral}
                value={reputation ? `${reputation.fulfilmentStreak.current} wk` : '–'}
                label="Fulfilment streak"
                hint={reputation ? `best ${reputation.fulfilmentStreak.max}` : undefined}
              />
              <MetricTile
                icon="🛡️"
                tint={COLORS.forest}
                value={(stats?.trustScore ?? reputation?.trustScore) != null ? String(stats?.trustScore ?? reputation?.trustScore) : '–'}
                label="ARTH Trust Score"
              />
            </View>
          </Section>

          {/* Trend */}
          <Section title="Monthly trend" delay={200}>
            <BorderCard>
              {trend.length === 0 ? (
                <Text style={styles.emptyTrend}>No plantings tracked yet.</Text>
              ) : (
                <>
                  <View style={styles.trendSummary}>
                    <View>
                      <Text style={styles.trendBig}>{trendTotal.toLocaleString('en-IN')}</Text>
                      <Text style={styles.trendSmall}>saplings planted, last {trend.length} months</Text>
                    </View>
                    {bestMonth && bestMonth.count > 0 ? (
                      <View style={styles.bestPill}>
                        <Text style={styles.bestPillText}>🏆 Best: {shortMonth(bestMonth.month)} · {bestMonth.count}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={styles.bars}>
                    {trend.map((row, i) => {
                      const h = Math.max(6, (row.count / maxTrend) * BAR_AREA_HEIGHT);
                      const isLast = i === trend.length - 1;
                      return (
                        <View key={row.month} style={styles.barCol}>
                          <Text style={styles.barCount}>{row.count}</Text>
                          <LinearGradient
                            colors={isLast ? [COLORS.sage, COLORS.forest] : [COLORS.sageLight, COLORS.sage]}
                            style={[styles.bar, { height: h }]}
                          />
                          <Text style={styles.barMonth}>{shortMonth(row.month)}</Text>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </BorderCard>
          </Section>

          {/* Growth level */}
          {level && (
            <Section title="Your nursery level" delay={260}>
              <BorderCard>
                <View style={styles.levelRow}>
                  <ProgressRing
                    size={72}
                    strokeWidth={7}
                    progress={levelProgress}
                    color={level.color}
                    label={level.emoji}
                    delay={300}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.levelName}>{level.label}</Text>
                    <Text style={styles.levelSub}>
                      {gp?.nextLevel
                        ? `Next: ${GROWTH_LEVEL_META[gp.nextLevel].label}` +
                          (gp.suppliedToNext != null ? ` · ${gp.suppliedToNext.toLocaleString('en-IN')} more saplings` : '') +
                          (gp.monthsToNext ? ` · ${gp.monthsToNext} mo` : '')
                        : 'Top level reached'}
                    </Text>
                    {gp ? (
                      <Text style={styles.levelMeta}>
                        {gp.monthsActive} months active · {gp.lifetimeSupplied.toLocaleString('en-IN')} supplied
                      </Text>
                    ) : null}
                  </View>
                </View>
              </BorderCard>
            </Section>
          )}

          <AnimatedButton
            label="🗺️  View on Map"
            onPress={() => navigation.navigate('NurseryMap', { nurseryId: profile?.id })}
            variant="secondary"
            size="lg"
            fullWidth
            style={{ marginTop: 20 }}
          />
          <AnimatedButton
            label="📈  Full report by date"
            onPress={() => navigation.navigate('NurseryReports')}
            variant="secondary"
            size="lg"
            fullWidth
            style={{ marginTop: 10 }}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginTop: 22, marginBottom: 8 },

  hero: { borderRadius: RADIUS.xl, padding: 20, gap: 16, overflow: 'hidden', ...SHADOWS.md },
  heroGlow: { position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(168,196,153,0.16)' },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: COLORS.sageLight },
  heroNumber: { ...TEXT.statSmall, fontSize: 52, lineHeight: 58, color: COLORS.white, marginTop: 2 },
  heroCaption: { fontSize: 12, color: 'rgba(255,255,255,0.75)' },
  heroStatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.md, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontSize: 18, fontWeight: '800', color: COLORS.white },
  heroStatUnit: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 2 },
  heroDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.18)' },
  heroEquiv: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, padding: 10 },
  heroEquivText: { fontSize: 12, color: COLORS.white, textAlign: 'center', fontWeight: '500' },
  heroNote: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center' },

  milestoneHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  milestoneTitle: { fontSize: 16, fontWeight: '800', color: COLORS.forest },
  milestoneSub: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  track: { height: 12, borderRadius: RADIUS.full, backgroundColor: 'rgba(94,133,80,0.14)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.full },
  milestoneEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  endLabel: { fontSize: 11, color: COLORS.textSecondary },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricTile: {
    width: '31.5%',
    flexGrow: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    borderRadius: RADIUS.lg,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  metricIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  metricEmoji: { fontSize: 20 },
  metricValue: { ...TEXT.statSmall, fontSize: 18, color: COLORS.forest },
  metricLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center' },
  metricHint: { fontSize: 10, fontWeight: '700' },

  emptyTrend: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 8 },
  trendSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 14 },
  trendBig: { ...TEXT.statSmall, fontSize: 24, color: COLORS.forest },
  trendSmall: { fontSize: 11, color: COLORS.textSecondary },
  bestPill: { backgroundColor: 'rgba(212,168,83,0.18)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 5 },
  bestPillText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  bar: { width: '100%', maxWidth: 34, borderRadius: 8 },
  barCount: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
  barMonth: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },

  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  levelName: { fontSize: 18, fontWeight: '800', color: COLORS.forest },
  levelSub: { fontSize: 12, color: COLORS.textPrimary, marginTop: 2 },
  levelMeta: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
});
