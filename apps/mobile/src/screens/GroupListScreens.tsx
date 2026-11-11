import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { SlidingSegment } from '../components/common/SlidingSegment';
import { GroupScreen } from '../components/groups/GroupScreen';
import { GroupRow, PersonRow, ProgressBar, SectionTitle, describeActivity, rupees } from '../components/groups/GroupBits';
import { resolveMediaUrl } from '../api/client';
import {
  useGroup,
  useGroupAchievements,
  useGroupActivity,
  useGroupAdoptions,
  useGroupAnalytics,
  useGroupContributors,
  useGroupDonations,
  useGroupsLeaderboard,
  useGroupTrees,
} from '../hooks/useGroupQueries';

const divider = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.warmBrown } as const;
const timeAgo = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

// ---------- Activity ----------

export function GroupActivityScreen({ navigation, route }: any) {
  const groupId: string = route.params.groupId;
  const activity = useGroupActivity(groupId);
  const list = activity.data ?? [];
  return (
    <GroupScreen title="Activity" onBack={() => navigation.goBack()} refetch={[activity.refetch]} paged={activity}>
      {list.length === 0 ? (
        <EmptyState icon="📣" title="Nothing yet" body="Joins, plantings, adoptions and donations show up here." />
      ) : (
        <BorderCard noPadding>
          {list.map((a, i) => {
            const line = describeActivity(a);
            return (
              <View key={a.id} style={[styles.row, i > 0 && divider]}>
                <Text style={styles.emoji}>{line.emoji}</Text>
                <Text style={styles.text}>{line.text}</Text>
                <Text style={styles.date}>{timeAgo(a.createdAt)}</Text>
              </View>
            );
          })}
        </BorderCard>
      )}
    </GroupScreen>
  );
}

// ---------- Achievements ----------

export function GroupAchievementsScreen({ navigation, route }: any) {
  const groupId: string = route.params.groupId;
  const achievements = useGroupAchievements(groupId);
  const list = achievements.data ?? [];
  return (
    <GroupScreen title="Achievements" subtitle={`${list.filter((a) => a.unlocked).length} of ${list.length} unlocked`} onBack={() => navigation.goBack()} refetch={[achievements.refetch]}>
      {list.map((a) => (
        <BorderCard key={a.key} style={[styles.achievement, !a.unlocked && { opacity: 0.7 }]}>
          <Text style={styles.bigEmoji}>{a.unlocked ? a.icon : '🔒'}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.title}>{a.title}</Text>
            <Text style={styles.muted}>{a.description}</Text>
            <ProgressBar value={a.progress / a.target} />
            <Text style={styles.muted}>
              {Math.floor(a.progress)} / {a.target}
            </Text>
          </View>
        </BorderCard>
      ))}
    </GroupScreen>
  );
}

// ---------- Leaderboards ----------

export function GroupLeaderboardScreen({ navigation, route }: any) {
  const groupId: string = route.params.groupId;
  const [tab, setTab] = useState<'groups' | 'planters'>('groups');
  const groups = useGroupsLeaderboard();
  const planters = useGroupContributors(groupId);

  return (
    <GroupScreen title="Leaderboards" onBack={() => navigation.goBack()} refetch={[groups.refetch, planters.refetch]}>
      <SlidingSegment
        fill
        value={tab}
        onChange={setTab}
        options={[
          { key: 'groups', label: 'Groups' },
          { key: 'planters', label: 'Our planters' },
        ]}
      />
      <View style={{ height: 12 }} />
      {tab === 'groups' ? (
        (groups.data ?? []).length === 0 ? (
          <EmptyState icon="🏆" title="No rankings yet" body="Groups appear here after their first tree." />
        ) : (
          <BorderCard noPadding>
            {(groups.data ?? []).map((r, i) => (
              <View key={r.group.id} style={[i > 0 && divider, r.isMine && styles.mine]}>
                <GroupRow
                  group={r.group}
                  right={
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.rank}>#{r.rank}</Text>
                      <Text style={styles.muted}>{r.treesPlanted} trees</Text>
                    </View>
                  }
                />
              </View>
            ))}
          </BorderCard>
        )
      ) : (
        <BorderCard noPadding>
          {(planters.data ?? []).map((r, i) => (
            <View key={r.user.id} style={i > 0 ? divider : undefined}>
              <PersonRow
                person={r.user}
                right={
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.rank}>#{r.rank}</Text>
                    <Text style={styles.muted}>{r.treesPlanted} trees</Text>
                  </View>
                }
              />
            </View>
          ))}
        </BorderCard>
      )}
    </GroupScreen>
  );
}

// ---------- Analytics ----------

export function GroupAnalyticsScreen({ navigation, route }: any) {
  const groupId: string = route.params.groupId;
  const [weeks, setWeeks] = useState<'4' | '8' | '12'>('8');
  const data = useGroupAnalytics(groupId, Number(weeks));
  const a = data.data;
  const max = Math.max(1, ...(a?.series.map((s) => s.trees) ?? [1]));

  return (
    <GroupScreen title="Analytics" onBack={() => navigation.goBack()} refetch={[data.refetch]}>
      <SlidingSegment
        fill
        value={weeks}
        onChange={setWeeks}
        options={[
          { key: '4', label: '4 weeks' },
          { key: '8', label: '8 weeks' },
          { key: '12', label: '12 weeks' },
        ]}
      />
      {!a ? (
        <Text style={[styles.muted, { textAlign: 'center', marginTop: 24 }]}>Loading…</Text>
      ) : (
        <>
          <SectionTitle>Trees planted per week</SectionTitle>
          <BorderCard>
            <View style={styles.chart}>
              {a.series.map((s) => (
                <View key={s.weekStart} style={styles.barCol}>
                  <Text style={styles.barValue}>{s.trees || ''}</Text>
                  <View style={[styles.bar, { height: 6 + (s.trees / max) * 90 }]} />
                  <Text style={styles.barLabel}>{timeAgo(s.weekStart)}</Text>
                </View>
              ))}
            </View>
          </BorderCard>

          <SectionTitle>In this period</SectionTitle>
          <BorderCard>
            <Line label="Trees planted" value={`${a.totals.treesInPeriod}`} />
            <Line label="Members who planted" value={`${a.totals.activePlanters} of ${a.totals.memberCount} (${a.totals.participationRate}%)`} />
            <Line label="New members" value={`${a.totals.newMembersInPeriod}`} />
            <Line label="Donated" value={rupees(a.totals.donatedCentsInPeriod)} />
          </BorderCard>

          <SectionTitle>All time</SectionTitle>
          <BorderCard>
            <Line label="Trees" value={`${a.overall.treesPlanted}`} />
            <Line label="CO₂ absorbed" value={`${a.overall.co2Kg} kg`} />
            <Line label="Expected CO₂ next year" value={`+${a.overall.co2NextYearKg} kg`} />
            <Line label="Longest planting streak" value={`${a.overall.streakMax} days`} />
            <Line label="Challenges completed" value={`${a.challenges.completed}`} />
            <Line label="Open challenges" value={`${a.challenges.open}`} />
          </BorderCard>
        </>
      )}
    </GroupScreen>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

// ---------- Trees ----------

export function GroupTreesScreen({ navigation, route }: any) {
  const groupId: string = route.params.groupId;
  const trees = useGroupTrees(groupId);
  const list = trees.data ?? [];
  return (
    <GroupScreen title="Our trees" subtitle={`${list.length} planted`} onBack={() => navigation.goBack()} refetch={[trees.refetch]} paged={trees}>
      {list.length === 0 ? (
        <EmptyState icon="🌱" title="No trees yet" body="Trees an admin plants for the group show up here." />
      ) : (
        <BorderCard noPadding>
          {list.map((t, i) => (
            <View key={t.id} style={[styles.row, i > 0 && divider]}>
              {t.photoUrl ? <Image source={{ uri: resolveMediaUrl(t.photoUrl) }} style={styles.thumb} /> : <Text style={styles.bigEmoji}>{t.species.emoji}</Text>}
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {t.nickname}
                </Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {t.species.commonName} · by {t.plantedBy.name} · {timeAgo(t.plantedAt)}
                </Text>
                {t.verification !== 'verified' && <Text style={styles.pending}>{t.verification === 'rejected' ? 'Photo rejected' : 'Awaiting review'}</Text>}
              </View>
            </View>
          ))}
        </BorderCard>
      )}
    </GroupScreen>
  );
}

// ---------- Donations and adoptions ----------

export function GroupGivingScreen({ navigation, route }: any) {
  const groupId: string = route.params.groupId;
  const [tab, setTab] = useState<'donations' | 'adoptions'>('donations');
  const donations = useGroupDonations(groupId);
  const adoptions = useGroupAdoptions(groupId);
  const group = useGroup(groupId);
  const active = tab === 'donations' ? donations : adoptions;

  return (
    <GroupScreen title="Giving" subtitle={group.data?.name} onBack={() => navigation.goBack()} refetch={[donations.refetch, adoptions.refetch]} paged={active}>
      <SlidingSegment
        fill
        value={tab}
        onChange={setTab}
        options={[
          { key: 'donations', label: 'Donations' },
          { key: 'adoptions', label: 'Adopted trees' },
        ]}
      />
      <View style={{ height: 12 }} />
      {tab === 'donations' ? (
        (donations.data ?? []).length === 0 ? (
          <EmptyState icon="💚" title="No donations yet" body="Donations an admin makes for the group appear here with their receipt number." />
        ) : (
          <BorderCard noPadding>
            {(donations.data ?? []).map((d, i) => (
              <View key={d.id} style={[styles.row, i > 0 && divider]}>
                <Text style={styles.bigEmoji}>💚</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {rupees(d.amountCents)} · {d.campaign.title}
                  </Text>
                  <Text style={styles.muted} numberOfLines={1}>
                    {d.campaign.ngoName} · by {d.donatedBy.name} · {timeAgo(d.createdAt)}
                  </Text>
                  {d.receiptNumber && <Text style={styles.muted}>Receipt {d.receiptNumber}</Text>}
                </View>
              </View>
            ))}
          </BorderCard>
        )
      ) : (adoptions.data ?? []).length === 0 ? (
        <EmptyState icon="🤝" title="No adopted trees yet" body="Trees an admin adopts for the group appear here." />
      ) : (
        <BorderCard noPadding>
          {(adoptions.data ?? []).map((a, i) => (
            <View key={a.id} style={[styles.row, i > 0 && divider]}>
              {a.tree.photoUrl ? <Image source={{ uri: resolveMediaUrl(a.tree.photoUrl) }} style={styles.thumb} /> : <Text style={styles.bigEmoji}>🌳</Text>}
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {a.tree.nickname}
                </Text>
                <Text style={styles.muted} numberOfLines={1}>
                  {a.tree.speciesName} · {a.tree.ngoName} · by {a.adoptedBy.name} · {timeAgo(a.createdAt)}
                </Text>
              </View>
            </View>
          ))}
        </BorderCard>
      )}
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  emoji: { fontSize: 18 },
  bigEmoji: { fontSize: 30, width: 44, textAlign: 'center' },
  text: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  date: { fontSize: 11, color: COLORS.textMuted },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  muted: { fontSize: 12, color: COLORS.textMuted },
  pending: { fontSize: 11, color: COLORS.golden, fontWeight: '700', marginTop: 2 },
  achievement: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  rank: { fontSize: 16, fontWeight: '800', color: COLORS.forest },
  mine: { borderLeftWidth: 4, borderLeftColor: COLORS.sage },
  thumb: { width: 44, height: 44, borderRadius: RADIUS.sm },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, height: 140 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  bar: { width: '70%', borderRadius: 4, backgroundColor: COLORS.sage },
  barValue: { fontSize: 11, fontWeight: '700', color: COLORS.forest },
  barLabel: { fontSize: 9, color: COLORS.textMuted },
  line: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  lineValue: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
});
