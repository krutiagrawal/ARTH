import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useNgoRangeReport, useNgoReports, useNgoProfile, useMyDrives, useMyCampaigns } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { formatKg } from '../utils/impact';
import { STATUS_META } from '../constants/treeHealth';
import { rangeForPreset, rangeParams, describeRange, type DateRangeValue } from '../components/reports/DateRangeBar';
import { FilterSelect } from '../components/reports/FilterSelect';
import { Donut, InteractiveBars, peakOf } from '../components/reports/ReportFun';
import { PanelBlock, verdictFor, type MetricTileSpec } from '../components/reports/DashboardTiles';
import { StoryPager, StorySlide, PopGrid, Jar, Hearts, Ring, Confetti } from '../components/reports/StoryKit';
import { ReportTopBar, DetailList } from '../components/reports/ReportChrome';
import { Mascot } from '../components/common/Mascot';
import { KpiGrid, KpiTile, RankedBars, StatRow, rupees, compactRupees, num, percent, changePct } from '../components/reports/ReportKit';

const DONATION_STATUS_COLORS: Record<string, string> = { succeeded: COLORS.sage, pending: COLORS.amber, failed: COLORS.danger, refunded: COLORS.textMuted };
const DONATION_STATUS_LABEL: Record<string, string> = { succeeded: 'Paid', pending: 'Pending', failed: 'Failed', refunded: 'Refunded' };
const BULK_LABEL: Record<string, string> = { proposed: 'Offered', accepted: 'Accepted', handed_off: 'Handed off', declined: 'Declined', fulfilled: 'Fulfilled', withdrawn: 'Withdrawn' };
const BULK_COLORS = [COLORS.sage, COLORS.golden, COLORS.xpBlue, COLORS.coral, COLORS.forest, COLORS.textMuted];

const shortDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function NgoReportsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<DateRangeValue>(() => rangeForPreset('last30'));
  const [driveId, setDriveId] = useState<string | null>(null);
  const [campaignId, setCampaignId] = useState<string | null>(null);

  const params = useMemo(
    () => ({ ...rangeParams(range), driveId: driveId ?? undefined, campaignId: campaignId ?? undefined }),
    [range, driveId, campaignId],
  );
  const { data: report, isLoading, isFetching, refetch } = useNgoRangeReport(params);
  const { data: lifetime, refetch: refetchLifetime } = useNgoReports();
  const { data: profile } = useNgoProfile();
  const { data: drives = [] } = useMyDrives();
  const { data: campaigns = [] } = useMyCampaigns();
  const { refreshing, onRefresh } = usePullToRefresh([refetch, refetchLifetime]);

  const driveOptions = useMemo(() => [{ value: null, label: 'All drives' }, ...drives.map((d) => ({ value: d.id, label: d.title }))], [drives]);
  const campaignOptions = useMemo(() => [{ value: null, label: 'All campaigns' }, ...campaigns.map((c) => ({ value: c.id, label: c.title }))], [campaigns]);

  const k = report?.kpis;
  const p = report?.previousKpis;
  const g = report?.range.granularity ?? 'day';

  const tiles = useMemo<MetricTileSpec[]>(() => {
    if (!report || !k) return [];
    const spark = (pts: { value: number; count: number }[], useCount?: boolean) => pts.map((x) => (useCount ? x.count : x.value));
    return [
      {
        id: 'raised',
        emoji: '💚',
        label: 'Raised',
        value: k.raisedCents / 100,
        format: (n) => `₹${n.toLocaleString('en-IN')}`,
        change: changePct(k.raisedCents, p?.raisedCents),
        spark: spark(report.series.donations),
        colors: [COLORS.golden, COLORS.amber],
        dark: true,
        panel: (
          <>
            <PanelBlock title="Donations over time" subtitle="Tap a bar to see that day">
              <InteractiveBars points={report.series.donations} granularity={g} format={compactRupees} color={COLORS.golden} />
            </PanelBlock>
            <KpiGrid>
              <KpiTile label="Donors" value={num(k.donors)} change={changePct(k.donors, p?.donors)} />
              <KpiTile label="Average gift" value={rupees(k.avgDonationCents)} change={changePct(k.avgDonationCents, p?.avgDonationCents)} />
              <KpiTile label="Plants sponsored" value={compactRupees(k.sponsoredCents)} change={changePct(k.sponsoredCents, p?.sponsoredCents)} />
              <KpiTile label="Donations" value={num(k.donationCount)} change={changePct(k.donationCount, p?.donationCount)} />
            </KpiGrid>
            {report.fundraising.byCampaign.length > 0 && (
              <PanelBlock title="Top campaigns">
                <RankedBars
                  color={COLORS.golden}
                  rows={report.fundraising.byCampaign.map((c) => ({
                    label: c.title,
                    value: c.raisedCents,
                    display: compactRupees(c.raisedCents),
                    sub: `${c.donations} donation${c.donations === 1 ? '' : 's'}${c.goalCents ? ` · goal ${compactRupees(c.goalCents)}` : ''}`,
                  }))}
                />
              </PanelBlock>
            )}
            <PanelBlock title="Donation status">
              <Donut
                centerLabel="donations"
                segments={Object.keys(DONATION_STATUS_LABEL).map((s) => ({ label: DONATION_STATUS_LABEL[s], value: report.fundraising.statusSplit[s] ?? 0, color: DONATION_STATUS_COLORS[s] }))}
              />
            </PanelBlock>
            {report.fundraising.byCategory.length > 0 && (
              <PanelBlock title="By category">
                <RankedBars
                  rows={report.fundraising.byCategory.map((c) => ({
                    label: c.category === 'uncategorised' ? 'No category' : c.category.charAt(0).toUpperCase() + c.category.slice(1),
                    value: c.cents,
                    display: compactRupees(c.cents),
                  }))}
                />
              </PanelBlock>
            )}
          </>
        ),
      },
      {
        id: 'volunteers',
        emoji: '🙋',
        label: 'Volunteer sign-ups',
        value: k.rsvps,
        format: num,
        change: changePct(k.rsvps, p?.rsvps),
        spark: spark(report.series.rsvps, true),
        colors: [COLORS.sage, COLORS.forest],
        panel: (
          <>
            <PanelBlock title="Sign-ups over time" subtitle="Tap a bar to see that day">
              <InteractiveBars points={report.series.rsvps} granularity={g} useCount color={COLORS.sage} />
            </PanelBlock>
            <KpiGrid>
              <KpiTile label="Attendance" value={percent(k.attendanceRate)} sub="of recorded RSVPs" change={changePct(k.attendanceRate, p?.attendanceRate)} />
              <KpiTile label="Volunteer hours" value={num(k.volunteerHours)} change={changePct(k.volunteerHours, p?.volunteerHours)} />
              <KpiTile label="New volunteers" value={num(k.newVolunteers)} />
              <KpiTile label="Returning" value={num(k.returningVolunteers)} sub="volunteered before" />
            </KpiGrid>
            {report.drives.topVolunteers.length > 0 && (
              <PanelBlock title="Top volunteers" subtitle="By hours logged">
                <RankedBars rows={report.drives.topVolunteers.map((v) => ({ label: v.name, value: v.hours, display: `${v.hours} h`, sub: v.handle ? `@${v.handle}` : undefined }))} />
              </PanelBlock>
            )}
          </>
        ),
      },
      {
        id: 'trees',
        emoji: '🌳',
        label: 'Trees planted',
        value: k.treesPlanted,
        format: num,
        change: changePct(k.treesPlanted, p?.treesPlanted),
        spark: spark(report.series.trees, true),
        colors: [COLORS.forest, COLORS.forestDeep],
        panel: (
          <>
            <PanelBlock title="Planted over time" subtitle="Tap a bar to see that day">
              <InteractiveBars points={report.series.trees} granularity={g} useCount color={COLORS.forest} />
            </PanelBlock>
            {report.trees.total > 0 && (
              <PanelBlock title="How they're doing" subtitle={report.trees.survivalRate != null ? `${report.trees.survivalRate}% survival` : undefined}>
                <Donut
                  centerLabel="trees"
                  segments={(['healthy', 'struggling', 'dead', 'removed', 'not_checked'] as const).map((s) => ({ label: STATUS_META[s].label, value: report.trees.survival[s], color: STATUS_META[s].color }))}
                />
              </PanelBlock>
            )}
            {report.trees.bySpecies.length > 0 && (
              <PanelBlock title="Most planted species">
                <RankedBars color={COLORS.forest} rows={report.trees.bySpecies.map((s) => ({ label: s.species, value: s.planted, display: `${s.planted}`, sub: `${s.alive} alive` }))} />
              </PanelBlock>
            )}
            {report.trees.byZone.length > 0 && (
              <PanelBlock title="By zone">
                <RankedBars rows={report.trees.byZone.map((z) => ({ label: z.zone, value: z.count, display: `${z.count}` }))} />
              </PanelBlock>
            )}
          </>
        ),
      },
      {
        id: 'drives',
        emoji: '🤝',
        label: 'Drives held',
        value: k.drivesHeld,
        format: num,
        change: changePct(k.drivesHeld, p?.drivesHeld),
        colors: [COLORS.earth, COLORS.warmBrown],
        panel:
          report.drives.rows.length === 0 ? (
            <Text style={styles.none}>No drives in this period.</Text>
          ) : (
            <PanelBlock title="Drives in this period" subtitle="Tap one to open it">
              {report.drives.rows.map((d) => (
                <TouchableOpacity key={d.id} activeOpacity={0.7} onPress={() => navigation.navigate('DriveDetail', { driveId: d.id })}>
                  <StatRow
                    left={d.title}
                    sub={`${shortDay(d.startsAt)}${d.city ? ` · ${d.city}` : ''} · ${d.status}${d.treesPlanted ? ` · ${d.treesPlanted} trees` : ''}`}
                    right={`${d.rsvps} RSVPs${d.attendanceRate != null ? ` · ${d.attendanceRate}%` : ''}`}
                  />
                </TouchableOpacity>
              ))}
            </PanelBlock>
          ),
      },
      {
        id: 'adoptions',
        emoji: '🌱',
        label: 'Adoptions',
        value: k.adoptions,
        format: num,
        change: changePct(k.adoptions, p?.adoptions),
        spark: spark(report.series.adoptions, true),
        colors: [COLORS.coral, '#C95F45'],
        panel: (
          <PanelBlock title="Adopted over time" subtitle="Tap a bar to see that day">
            <InteractiveBars points={report.series.adoptions} granularity={g} useCount color={COLORS.coral} />
          </PanelBlock>
        ),
      },
      {
        id: 'followers',
        emoji: '👥',
        label: 'New followers',
        value: k.followersGained,
        format: num,
        change: changePct(k.followersGained, p?.followersGained),
        spark: spark(report.series.followers, true),
        colors: [COLORS.xpBlue, '#3B6EA8'],
        panel: (
          <>
            <PanelBlock title="Follower growth" subtitle={`${num(report.followersTotal)} followers in total`}>
              <InteractiveBars points={report.series.followers} granularity={g} useCount color={COLORS.xpBlue} />
            </PanelBlock>
            <KpiGrid>
              <KpiTile label="Posts" value={num(k.posts)} change={changePct(k.posts, p?.posts)} />
              <KpiTile label="Total followers" value={num(report.followersTotal)} />
            </KpiGrid>
            {Object.keys(report.bulkRequirements).length > 0 && (
              <PanelBlock title="Nursery replies to your sapling requests">
                <Donut
                  centerLabel="replies"
                  segments={Object.entries(report.bulkRequirements).map(([status, value], i) => ({ label: BULK_LABEL[status] ?? status, value, color: BULK_COLORS[i % BULK_COLORS.length] }))}
                />
              </PanelBlock>
            )}
          </>
        ),
      },
    ];
  }, [report, k, p, g, navigation]);

  const verdict = useMemo(
    () => (k ? verdictFor([changePct(k.raisedCents, p?.raisedCents), changePct(k.rsvps, p?.rsvps), changePct(k.treesPlanted, p?.treesPlanted), changePct(k.adoptions, p?.adoptions), changePct(k.followersGained, p?.followersGained)]).verdict : ''),
    [k, p],
  );
  const detail = useMemo(() => {
    if (!report) return undefined;
    const best = peakOf(report.series.donations);
    return best ? `Best fundraising ${g}: ${compactRupees(best.amount)} on ${shortDay(best.start)}. Tap a tile to dig in.` : 'Tap a tile to dig in.';
  }, [report, g]);

  const good = !!k && verdictFor([changePct(k.raisedCents, p?.raisedCents), changePct(k.rsvps, p?.rsvps), changePct(k.treesPlanted, p?.treesPlanted), changePct(k.adoptions, p?.adoptions), changePct(k.followersGained, p?.followersGained)]).up >= 3;
  const activeFilters = (driveId ? 1 : 0) + (campaignId ? 1 : 0);

  // Plain-language takeaways for the "Highlights" slide.
  const highlights = useMemo(() => {
    if (!report) return [] as { emoji: string; title: string; text: string }[];
    const out: { emoji: string; title: string; text: string }[] = [];
    const topCampaign = report.fundraising.byCampaign[0];
    if (topCampaign) out.push({ emoji: '💚', title: 'Top campaign', text: `${topCampaign.title} raised ${compactRupees(topCampaign.raisedCents)}` });
    const topSpecies = report.trees.bySpecies[0];
    if (topSpecies) out.push({ emoji: '🌱', title: 'Most planted', text: `${topSpecies.planted} ${topSpecies.species} went into the ground` });
    const topVol = report.drives.topVolunteers[0];
    if (topVol) out.push({ emoji: '⭐', title: 'Volunteer of the period', text: `${topVol.name} gave ${topVol.hours} hours` });
    const bestDrive = [...report.drives.rows].sort((x, y) => y.rsvps - x.rsvps)[0];
    if (bestDrive && bestDrive.rsvps > 0) out.push({ emoji: '🤝', title: 'Busiest drive', text: `${bestDrive.title} drew ${bestDrive.rsvps} RSVPs` });
    return out.slice(0, 4);
  }, [report]);

  const loaded = !isLoading && !!report && !!k;
  const pages: ((active: boolean) => React.ReactNode)[] = loaded
    ? [
        // 0 – hello
        (active) => (
          <StorySlide colors={[COLORS.forest, COLORS.forestDeep]} eyebrow={describeRange(range)} active={active} caption={verdict} scene={
              <>
                <Mascot size={150} mood={good ? 'excited' : 'happy'} animate />
                {good && <Confetti active={active} />}
              </>
            }>
            <Text style={styles.storyTitle}>{profile?.orgName ?? 'Your impact'}</Text>
            {detail ? <Text style={styles.storySub}>{detail}</Text> : null}
          </StorySlide>
        ),
        // 1 – money
        (active) => (
          <StorySlide
            colors={['#D9921B', '#7A4B00']}
            eyebrow="Raised"
            active={active}
            value={k!.raisedCents / 100}
            format={(n) => `₹${n.toLocaleString('en-IN')}`}
            caption={`${k!.donationCount} donation${k!.donationCount === 1 ? '' : 's'} from ${k!.donors} donor${k!.donors === 1 ? '' : 's'}`}
            change={changePct(k!.raisedCents, p?.raisedCents)}
            scene={<Jar fill={p ? k!.raisedCents / Math.max(k!.raisedCents, p.raisedCents, 1) : 0.7} active={active} />}
          />
        ),
        // 2 – volunteers
        (active) => (
          <StorySlide
            colors={[COLORS.sage, '#3E6B37']}
            eyebrow="Volunteers"
            active={active}
            value={k!.rsvps}
            format={num}
            caption={`${num(k!.volunteerHours)} volunteer hours · ${percent(k!.attendanceRate)} attendance`}
            change={changePct(k!.rsvps, p?.rsvps)}
            scene={<PopGrid emojis={['🙋', '🙋‍♀️', '🧑‍🌾']} count={k!.rsvps} active={active} size={32} />}
          />
        ),
        // 3 – trees
        (active) => (
          <StorySlide
            colors={['#2D7A3A', '#123D1B']}
            eyebrow="Trees planted"
            active={active}
            value={k!.treesPlanted}
            format={num}
            caption={report!.trees.bySpecies[0] ? `Most planted: ${report!.trees.bySpecies[0].species}` : 'Plant your first tree this period'}
            change={changePct(k!.treesPlanted, p?.treesPlanted)}
            scene={<PopGrid emojis={['🌳', '🌲', '🌳', '🌴']} count={k!.treesPlanted} active={active} size={34} />}
          />
        ),
        // 4 – survival
        ...(report!.trees.total > 0 && report!.trees.survivalRate != null
          ? [
              (active: boolean) => (
                <StorySlide
                  colors={['#3E8E6F', '#17503C']}
                  eyebrow="Survival"
                  active={active}
                  value={report!.trees.survivalRate!}
                  format={(n) => `${n}%`}
                  caption={`${report!.trees.survival.healthy} healthy · ${report!.trees.survival.struggling} struggling · ${report!.trees.survival.dead} lost`}
                  scene={<Ring rate={report!.trees.survivalRate!} active={active} emoji={report!.trees.survivalRate! >= 80 ? '🌿' : '🩺'} />}
                />
              ),
            ]
          : []),
        // 5 – reach
        (active) => (
          <StorySlide
            colors={['#4A90D9', '#25508A']}
            eyebrow="Your community"
            active={active}
            value={k!.followersGained}
            format={(n) => `+${num(n)}`}
            caption={`new followers · ${num(report!.followersTotal)} in total · ${k!.adoptions} tree${k!.adoptions === 1 ? '' : 's'} adopted`}
            change={changePct(k!.followersGained, p?.followersGained)}
            scene={<Hearts active={active} emoji="👥" />}
          />
        ),
        // 6 – highlights
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
        // last – all the numbers
        () => (
          <View style={styles.detailPage}>
            <Text style={styles.detailTitle}>All the numbers</Text>
            <Text style={styles.detailSub}>Tap any row to open its charts and breakdowns.</Text>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
              <DetailList items={tiles} />
              {lifetime && (
                <Text style={styles.lifetimeText}>
                  Since you joined: {compactRupees(lifetime.totalRaisedCents)} raised · {num(lifetime.totalDrives)} drives · {formatKg(lifetime.co2AbsorptionKg)} kg CO₂ absorbed
                </Text>
              )}
            </ScrollView>
          </View>
        ),
      ]
    : [];

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Reports" subtitle="Your impact, as a story" onBack={() => navigation.goBack()} />

      <ReportTopBar
        range={range}
        onRange={setRange}
        activeFilters={activeFilters}
        filters={
          <>
            <FilterSelect label="Drive" options={driveOptions} value={driveId} onChange={setDriveId} />
            <FilterSelect label="Campaign" options={campaignOptions} value={campaignId} onChange={setCampaignId} />
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
  lifetimeText: { fontSize: 12, lineHeight: 18, color: COLORS.textMuted, textAlign: 'center', marginTop: 18 },
});
