import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useNurseryReport, useNurseryProfile, useStockSpeciesOptions } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { rangeForPreset, rangeParams, describeRange, type DateRangeValue } from '../components/reports/DateRangeBar';
import { FilterSelect } from '../components/reports/FilterSelect';
import { Donut, InteractiveBars, peakOf } from '../components/reports/ReportFun';
import { PanelBlock, verdictFor, type MetricTileSpec } from '../components/reports/DashboardTiles';
import { StoryPager, StorySlide, PopGrid, Jar, Hearts, Stars, Confetti } from '../components/reports/StoryKit';
import { ReportTopBar, DetailList } from '../components/reports/ReportChrome';
import { Mascot } from '../components/common/Mascot';
import { KpiGrid, KpiTile, RankedBars, StatRow, rupees, compactRupees, num, percent, changePct } from '../components/reports/ReportKit';

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'New',
  packed: 'Packed',
  ready_for_pickup: 'Ready for pickup',
  out_for_delivery: 'Out for delivery',
  picked_up: 'Picked up',
  delivered: 'Delivered',
  plantation_verified: 'Plantation verified',
  cancelled: 'Cancelled',
};
const STATUS_COLOR: Record<string, string> = {
  confirmed: COLORS.golden,
  packed: COLORS.amber,
  ready_for_pickup: COLORS.xpBlue,
  out_for_delivery: COLORS.xpBlue,
  picked_up: COLORS.sage,
  delivered: COLORS.forest,
  plantation_verified: COLORS.mint,
  cancelled: COLORS.coral,
};
const BULK_LABEL: Record<string, string> = { proposed: 'Offered', accepted: 'Accepted', handed_off: 'Handed off', declined: 'Declined', fulfilled: 'Fulfilled', withdrawn: 'Withdrawn' };
const BULK_COLORS = [COLORS.sage, COLORS.golden, COLORS.xpBlue, COLORS.coral, COLORS.forest, COLORS.textMuted];

const shortDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function NurseryReportsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<DateRangeValue>(() => rangeForPreset('last30'));
  const [fulfilment, setFulfilment] = useState<string | null>(null);
  const [species, setSpecies] = useState<string | null>(null);

  const params = useMemo(
    () => ({ ...rangeParams(range), fulfillmentType: (fulfilment as 'pickup' | 'delivery' | null) ?? undefined, species: species ?? undefined }),
    [range, fulfilment, species],
  );
  const { data: report, isLoading, isFetching, refetch } = useNurseryReport(params);
  const { data: profile } = useNurseryProfile();
  // Distinct species straight from the server - not built from page 1 of the stock list, which
  // would silently drop every species beyond the first 20 rows.
  const { data: speciesNames = [] } = useStockSpeciesOptions();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const speciesOptions = useMemo(
    () => [{ value: null, label: 'All species' }, ...speciesNames.map((n) => ({ value: n, label: n }))],
    [speciesNames],
  );

  const k = report?.kpis;
  const p = report?.previousKpis;
  const g = report?.range.granularity ?? 'day';

  const tiles = useMemo<MetricTileSpec[]>(() => {
    if (!report || !k) return [];
    const totalStars = report.ratings.distribution.reduce((n, d) => n + d.count, 0);
    return [
      {
        id: 'revenue',
        emoji: '💰',
        label: 'Revenue',
        value: k.revenueCents / 100,
        format: (n) => `₹${n.toLocaleString('en-IN')}`,
        change: changePct(k.revenueCents, p?.revenueCents),
        spark: report.series.revenue.map((x) => x.value),
        colors: [COLORS.golden, COLORS.amber],
        dark: true,
        panel: (
          <>
            <PanelBlock title="Revenue over time" subtitle="Tap a bar to see that day">
              <InteractiveBars points={report.series.revenue} granularity={g} format={compactRupees} color={COLORS.golden} />
            </PanelBlock>
            <KpiGrid>
              <KpiTile label="Average order" value={rupees(k.avgOrderValueCents)} change={changePct(k.avgOrderValueCents, p?.avgOrderValueCents)} />
              <KpiTile label="Fulfilment rate" value={percent(k.fulfilmentRate)} sub="completed vs cancelled" change={changePct(k.fulfilmentRate, p?.fulfilmentRate)} />
            </KpiGrid>
            {report.sales.topSpecies.length > 0 && (
              <PanelBlock title="Best sellers" subtitle="By revenue">
                <RankedBars
                  color={COLORS.forest}
                  rows={report.sales.topSpecies.map((s) => ({ label: s.species, value: s.revenueCents, display: compactRupees(s.revenueCents), sub: `${s.quantity} sold` }))}
                />
              </PanelBlock>
            )}
          </>
        ),
      },
      {
        id: 'orders',
        emoji: '🧾',
        label: 'Orders',
        value: k.orders,
        format: num,
        change: changePct(k.orders, p?.orders),
        spark: report.series.orders.map((x) => x.count),
        colors: [COLORS.sage, COLORS.forest],
        panel: (
          <>
            <PanelBlock title="Orders over time" subtitle="Tap a bar to see that day">
              <InteractiveBars points={report.series.orders} granularity={g} useCount color={COLORS.sage} />
            </PanelBlock>
            <PanelBlock title="By status">
              <Donut centerLabel="orders" segments={Object.keys(STATUS_LABEL).map((s) => ({ label: STATUS_LABEL[s], value: report.sales.byStatus[s] ?? 0, color: STATUS_COLOR[s] }))} />
            </PanelBlock>
            <PanelBlock title="Pickup vs delivery">
              <Donut
                centerLabel="orders"
                segments={[
                  { label: 'Pickup', value: report.sales.byFulfilment.pickup ?? 0, color: COLORS.sage },
                  { label: 'Delivery', value: report.sales.byFulfilment.delivery ?? 0, color: COLORS.xpBlue },
                ]}
              />
            </PanelBlock>
            <KpiGrid>
              <KpiTile
                label="Cancellations"
                value={percent(k.cancellationRate)}
                sub={k.cancellationFeesCents ? `${rupees(k.cancellationFeesCents)} in fees` : undefined}
                change={changePct(k.cancellationRate, p?.cancellationRate)}
                invert
              />
            </KpiGrid>
          </>
        ),
      },
      {
        id: 'saplings',
        emoji: '🌱',
        label: 'Saplings sold',
        value: k.saplingsSold,
        format: num,
        change: changePct(k.saplingsSold, p?.saplingsSold),
        colors: [COLORS.forest, COLORS.forestDeep],
        panel:
          report.sales.topSpecies.length === 0 ? (
            <Text style={styles.none}>No completed orders in this period.</Text>
          ) : (
            <PanelBlock title="Most sold species" subtitle="By quantity">
              <RankedBars
                color={COLORS.forest}
                rows={[...report.sales.topSpecies].sort((a, b) => b.quantity - a.quantity).map((s) => ({ label: s.species, value: s.quantity, display: `${s.quantity}`, sub: compactRupees(s.revenueCents) }))}
              />
            </PanelBlock>
          ),
      },
      {
        id: 'rating',
        emoji: '⭐',
        label: 'Average rating',
        value: k.avgRating ?? 0,
        format: (n) => (k.avgRating == null ? '–' : (Math.round(n * 10) / 10).toFixed(1)),
        change: changePct(k.avgRating, p?.avgRating),
        colors: ['#F2B84B', '#E08A2B'],
        dark: true,
        panel:
          report.ratings.total === 0 ? (
            <Text style={styles.none}>No reviews in this period.</Text>
          ) : (
            <>
              <PanelBlock title="Rating breakdown" subtitle={`${report.ratings.total} review${report.ratings.total === 1 ? '' : 's'}`}>
                <RankedBars
                  color={COLORS.golden}
                  rows={[...report.ratings.distribution].reverse().map((d) => ({
                    label: `${d.stars} ★`,
                    value: d.count,
                    display: `${d.count}${totalStars ? ` (${Math.round((d.count / totalStars) * 100)}%)` : ''}`,
                  }))}
                />
              </PanelBlock>
              {report.ratings.responseRate != null && <Text style={styles.foot}>You replied to {report.ratings.responseRate}% of these reviews.</Text>}
            </>
          ),
      },
      {
        id: 'customers',
        emoji: '🤝',
        label: 'Customers',
        value: k.newCustomers + k.returningCustomers,
        format: num,
        colors: [COLORS.xpBlue, '#3B6EA8'],
        panel: (
          <>
            <PanelBlock title="New vs returning">
              <Donut
                centerLabel="customers"
                segments={[
                  { label: 'New', value: k.newCustomers, color: COLORS.sage },
                  { label: 'Returning', value: k.returningCustomers, color: COLORS.forest },
                ]}
              />
            </PanelBlock>
            {report.deliveryPartners.length > 0 && (
              <PanelBlock title="Delivery partners" subtitle="Completed deliveries in this period">
                {report.deliveryPartners.map((d) => (
                  <StatRow key={d.name} left={d.name} sub={d.avgRating != null ? `${d.avgRating} ★ average` : 'Not rated yet'} right={`${d.deliveries} deliveries`} />
                ))}
              </PanelBlock>
            )}
          </>
        ),
      },
      {
        id: 'stock',
        emoji: '📦',
        label: 'Saplings given out',
        value: report.stock.givenOut,
        format: num,
        colors: [COLORS.earth, COLORS.warmBrown],
        panel: (
          <>
            <KpiGrid>
              <KpiTile label="Added" value={num(report.stock.added)} />
              <KpiTile label="Given out" value={num(report.stock.givenOut)} sub="orders, requests, bulk" />
              <KpiTile label="Restocked" value={num(report.stock.restocked)} sub="from cancellations" />
              <KpiTile label="Species stocked" value={num(report.stock.current.species)} sub={`${report.stock.current.low} low · ${report.stock.current.out} out`} />
            </KpiGrid>
            {Object.keys(report.bulkRequirements).length > 0 && (
              <PanelBlock title="Replies to NGO sapling requests">
                <Donut
                  centerLabel="replies"
                  segments={Object.entries(report.bulkRequirements).map(([status, value], i) => ({ label: BULK_LABEL[status] ?? status, value, color: BULK_COLORS[i % BULK_COLORS.length] }))}
                />
              </PanelBlock>
            )}
            <TouchableOpacity onPress={() => navigation.navigate('NurseryStockAnalytics')}>
              <Text style={styles.link}>Open stock analytics ›</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('NurseryImpact')}>
              <Text style={styles.link}>See your planting impact ›</Text>
            </TouchableOpacity>
          </>
        ),
      },
    ];
  }, [report, k, p, g, navigation]);

  const verdict = useMemo(
    () =>
      k
        ? verdictFor(
            [changePct(k.revenueCents, p?.revenueCents), changePct(k.orders, p?.orders), changePct(k.saplingsSold, p?.saplingsSold), changePct(k.avgRating, p?.avgRating), changePct(k.cancellationRate, p?.cancellationRate)],
            [false, false, false, false, true],
          ).verdict
        : '',
    [k, p],
  );
  const detail = useMemo(() => {
    if (!report) return undefined;
    const best = peakOf(report.series.revenue);
    const low = report.stock.current.low + report.stock.current.out;
    const parts = [best ? `Best sales ${g}: ${compactRupees(best.amount)} on ${shortDay(best.start)}.` : null, low > 0 ? `${low} species low or out of stock.` : null, 'Tap a tile to dig in.'];
    return parts.filter(Boolean).join(' ');
  }, [report, g]);

  const good = !!k && verdictFor(
    [changePct(k.revenueCents, p?.revenueCents), changePct(k.orders, p?.orders), changePct(k.saplingsSold, p?.saplingsSold), changePct(k.avgRating, p?.avgRating), changePct(k.cancellationRate, p?.cancellationRate)],
    [false, false, false, false, true],
  ).up >= 3;
  const activeFilters = (fulfilment ? 1 : 0) + (species ? 1 : 0);

  const highlights = useMemo(() => {
    if (!report || !k) return [] as { emoji: string; title: string; text: string }[];
    const out: { emoji: string; title: string; text: string }[] = [];
    const top = report.sales.topSpecies[0];
    if (top) out.push({ emoji: '🌿', title: 'Best seller', text: `${top.species} – ${top.quantity} sold for ${compactRupees(top.revenueCents)}` });
    const customers = k.newCustomers + k.returningCustomers;
    if (customers > 0) out.push({ emoji: '🤝', title: 'Loyal customers', text: `${Math.round((k.returningCustomers / customers) * 100)}% ordered from you before` });
    if (report.ratings.responseRate != null) out.push({ emoji: '💬', title: 'Review replies', text: `You answered ${report.ratings.responseRate}% of reviews` });
    const low = report.stock.current.low + report.stock.current.out;
    if (low > 0) out.push({ emoji: '📦', title: 'Restock soon', text: `${report.stock.current.low} low and ${report.stock.current.out} out of stock` });
    return out.slice(0, 4);
  }, [report, k]);

  const loaded = !isLoading && !!report && !!k;
  const pages: ((active: boolean) => React.ReactNode)[] = loaded
    ? [
        (active) => (
          <StorySlide colors={[COLORS.forest, COLORS.forestDeep]} eyebrow={describeRange(range)} active={active} caption={verdict} scene={
              <>
                <Mascot size={150} mood={good ? 'excited' : 'happy'} animate />
                {good && <Confetti active={active} />}
              </>
            }>
            <Text style={styles.storyTitle}>{profile?.nurseryName ?? 'Your nursery'}</Text>
            {detail ? <Text style={styles.storySub}>{detail}</Text> : null}
          </StorySlide>
        ),
        (active) => (
          <StorySlide
            colors={['#D9921B', '#7A4B00']}
            eyebrow="Revenue"
            active={active}
            value={k!.revenueCents / 100}
            format={(n) => `₹${n.toLocaleString('en-IN')}`}
            caption={`${k!.orders} order${k!.orders === 1 ? '' : 's'} placed · average ${rupees(k!.avgOrderValueCents)}`}
            change={changePct(k!.revenueCents, p?.revenueCents)}
            scene={<Jar fill={p ? k!.revenueCents / Math.max(k!.revenueCents, p.revenueCents, 1) : 0.7} active={active} />}
          />
        ),
        (active) => (
          <StorySlide
            colors={[COLORS.sage, '#3E6B37']}
            eyebrow="Orders"
            active={active}
            value={k!.orders}
            format={num}
            caption={`${percent(k!.fulfilmentRate)} fulfilled · ${percent(k!.cancellationRate)} cancelled`}
            change={changePct(k!.orders, p?.orders)}
            scene={<PopGrid emojis={['📦', '🧾', '🚚']} count={k!.orders} active={active} size={32} />}
          />
        ),
        (active) => (
          <StorySlide
            colors={['#2D7A3A', '#123D1B']}
            eyebrow="Saplings sold"
            active={active}
            value={k!.saplingsSold}
            format={num}
            caption={report!.sales.topSpecies[0] ? `Best seller: ${report!.sales.topSpecies[0].species}` : 'Saplings sold in this period'}
            change={changePct(k!.saplingsSold, p?.saplingsSold)}
            scene={<PopGrid emojis={['🌱', '🌿', '🪴']} count={k!.saplingsSold} active={active} size={32} cap={30} />}
          />
        ),
        ...(k!.avgRating != null
          ? [
              (active: boolean) => (
                <StorySlide
                  colors={['#F2A93B', '#B8641A']}
                  eyebrow="Your rating"
                  active={active}
                  value={k!.avgRating!}
                  format={(n) => (Math.round(n * 10) / 10).toFixed(1)}
                  caption={`from ${k!.reviews} review${k!.reviews === 1 ? '' : 's'}`}
                  change={changePct(k!.avgRating, p?.avgRating)}
                  scene={<Stars rating={k!.avgRating!} active={active} />}
                />
              ),
            ]
          : []),
        (active) => (
          <StorySlide
            colors={['#4A90D9', '#25508A']}
            eyebrow="Your customers"
            active={active}
            value={k!.newCustomers + k!.returningCustomers}
            format={num}
            caption={`${k!.newCustomers} new · ${k!.returningCustomers} came back`}
            scene={<Hearts active={active} emoji="🤝" />}
          />
        ),
        ...(highlights.length > 0
          ? [
              (active: boolean) => (
                <StorySlide colors={[COLORS.earth, '#4E3820']} eyebrow="Highlights" active={active}>
                  <View style={styles.hlWrap}>
                    {highlights.map((h) => (
                      <View key={h.title} style={styles.hlCard}>
                        <Text style={styles.hlEmoji}>{h.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.hlTitle}>{h.title}</Text>
                          <Text style={styles.hlText}>{h.text}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </StorySlide>
              ),
            ]
          : []),
        () => (
          <View style={styles.detailPage}>
            <Text style={styles.detailTitle}>All the numbers</Text>
            <Text style={styles.detailSub}>Tap any row to open its charts and breakdowns.</Text>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
              <DetailList items={tiles} />
            </ScrollView>
          </View>
        ),
      ]
    : [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Reports" subtitle="Your nursery, as a story" onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined} />

      <ReportTopBar
        range={range}
        onRange={setRange}
        activeFilters={activeFilters}
        filters={
          <>
            <FilterSelect
              label="Fulfilment"
              options={[
                { value: null, label: 'Pickup & delivery' },
                { value: 'pickup', label: 'Pickup only' },
                { value: 'delivery', label: 'Delivery only' },
              ]}
              value={fulfilment}
              onChange={setFulfilment}
            />
            <FilterSelect label="Species" options={speciesOptions} value={species} onChange={setSpecies} />
          </>
        }
      />

      {loaded ? (
        <View style={[styles.pager, isFetching && styles.stale]}>
          <StoryPager pages={pages} />
        </View>
      ) : (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pager: { flex: 1, marginHorizontal: 12, marginBottom: 12, borderRadius: 28, overflow: 'hidden' },
  stale: { opacity: 0.7 },
  none: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', paddingVertical: 10 },
  foot: { fontSize: 12, color: COLORS.textSecondary },
  link: { fontSize: 13, fontWeight: '800', color: COLORS.forest },
  storyTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginTop: 6 },
  storySub: { fontSize: 13, lineHeight: 19, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 2 },
  hlWrap: { gap: 12, alignSelf: 'stretch', marginTop: 10 },
  hlCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 20, padding: 16 },
  hlEmoji: { fontSize: 32 },
  hlTitle: { fontSize: 12, fontWeight: '900', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.6 },
  hlText: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  detailPage: { flex: 1, backgroundColor: COLORS.cream, paddingHorizontal: 18, paddingTop: 22 },
  detailTitle: { fontSize: 22, fontWeight: '900', color: COLORS.forest },
  detailSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, marginBottom: 14 },
});
