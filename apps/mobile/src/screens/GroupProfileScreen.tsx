import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/common/AppText';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { TreeCard } from '../components/common/TreeCard';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { ProfileHeader } from '../components/profile/ProfileHeader';
import { ProfileTabBar, type ProfileTabKey } from '../components/profile/ProfileTabBar';
import { AchievementsTabContent } from '../components/profile/AchievementsTabContent';
import { DrivesTabContent } from '../components/profile/DrivesTabContent';
import { PersonRow, groupTypeEmoji, groupTypeLabel, rupees } from '../components/groups/GroupBits';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useTimeTheme } from '../hooks/useTimeTheme';
import {
  useGroup,
  useGroupAchievements,
  useGroupContributors,
  useGroupDrives,
  useGroupStats,
  useGroupTrees,
  useGroupsLeaderboard,
} from '../hooks/useGroupQueries';
import { groupTreeAsTree } from '../utils/groupAdapters';
import type { ApiAchievement } from '../api/achievements';

/** The group's profile: the same page as an individual's, showing the group's work. */
export function GroupProfileScreen({ navigation, route }: any) {
  const groupId: string = route.params.groupId;
  const insets = useSafeAreaInsets();
  const theme = useTimeTheme();
  const [tab, setTab] = useState<ProfileTabKey>('posts');
  const group = useGroup(groupId);
  const stats = useGroupStats(groupId);
  const trees = useGroupTrees(groupId);
  const achievements = useGroupAchievements(groupId);
  const contributors = useGroupContributors(groupId);
  const drives = useGroupDrives(groupId);
  const ranks = useGroupsLeaderboard();
  const { refreshing, onRefresh } = usePullToRefresh([group.refetch, stats.refetch, trees.refetch, achievements.refetch, contributors.refetch, drives.refetch, ranks.refetch]);

  const g = group.data;
  const s = stats.data;
  const isAdmin = g?.viewer.role === 'admin';
  const myRank = (ranks.data ?? []).find((r) => r.group.id === groupId)?.rank;
  const asAchievements: ApiAchievement[] = (achievements.data ?? []).map((a) => ({
    id: a.key,
    title: a.title,
    description: a.description,
    icon: a.icon,
    rarity: 'rare',
    unlocked: a.unlocked,
    progress: a.progress,
    total: a.target,
  }));
  const unlocked = asAchievements.filter((a) => a.unlocked).length;
  const recentTrees = (trees.data ?? []).slice(0, 12).map(groupTreeAsTree);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <View style={styles.iconBlur}>
            <Text style={styles.iconText}>←</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('GroupSettings', { groupId })} style={styles.iconButton} hitSlop={8}>
          <View style={styles.iconBlur}>
            <Text style={styles.iconText}>⚙️</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        {g && (
          <ProfileHeader
            topInset={insets.top}
            avatarUrl={g.logoUrl}
            avatarEmoji={groupTypeEmoji(g.groupType)}
            xpProgress={s ? { progress: s.xpIntoLevel / s.xpPerLevel, level: s.level } : null}
            name={g.name}
            handle={g.handle}
            bio={g.description}
            meta={[groupTypeLabel(g.groupType), g.city, `${g.memberCount} members`].filter(Boolean).join(' · ')}
            stats={[
              { value: s?.treesPlanted ?? '–', label: 'Trees' },
              { value: s?.streakCurrent ?? '–', label: 'Streak' },
              { value: unlocked, label: 'Badges', onPress: () => setTab('achievements') },
              { value: myRank ? `#${myRank}` : '–', label: 'Rank', onPress: () => navigation.navigate('GroupLeaderboard', { groupId }) },
            ]}
            primaryAction={isAdmin ? { label: 'Edit group', icon: '✎', onPress: () => navigation.navigate('GroupSettings', { groupId }), variant: 'outline' } : null}
          />
        )}

        <ProfileTabBar activeTab={tab} onChange={setTab} role="group" />

        {tab === 'posts' && (
          <View style={styles.body}>
            {recentTrees.length === 0 ? (
              <EmptyState icon="🌱" title="No trees yet" body="Trees members plant, and trees planted for the group, appear here." />
            ) : (
              <>
                {recentTrees.map((tree) => (
                  <TreeCard key={tree.id} tree={tree} size="card" theme={theme} onPress={() => navigation.navigate('GroupTrees', { groupId })} />
                ))}
                <TouchableOpacity onPress={() => navigation.navigate('GroupTrees', { groupId })}>
                  <Text style={styles.seeAll}>See all trees →</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {tab === 'contributions' && (
          <View style={styles.body}>
            <BorderCard style={styles.card}>
              <Text style={styles.cardTitle}>🌍 Total impact</Text>
              <View style={styles.statRow}>
                <Impact value={`${(s?.co2Kg ?? 0).toFixed(1)}kg`} label="CO₂ stored so far" extra={s?.co2NextYearKg ? `+${s.co2NextYearKg.toFixed(1)}kg expected next year` : undefined} />
                <Impact value={`${s?.treesPlanted ?? 0}`} label="Trees planted" />
                <Impact value={`${s?.drivesJoined ?? 0}`} label="Drives joined" />
              </View>
              <View style={[styles.statRow, { marginTop: 12 }]}>
                <Impact value={`${s?.adoptions ?? 0}`} label="Trees adopted" />
                <Impact value={rupees(s?.donatedCents ?? 0)} label="Donated" />
                <Impact value={`${s?.streakMax ?? 0}`} label="Best streak (days)" />
              </View>
            </BorderCard>

            <Text style={styles.sectionTitle}>Who is planting</Text>
            <BorderCard noPadding>
              {(contributors.data ?? []).map((c, i) => (
                <View key={c.user.id} style={i > 0 ? styles.divider : undefined}>
                  <PersonRow person={c.user} right={<Text style={styles.count}>{c.treesPlanted} 🌳</Text>} />
                </View>
              ))}
            </BorderCard>
            <TouchableOpacity onPress={() => navigation.navigate('GroupGiving', { groupId })}>
              <Text style={styles.seeAll}>Donations and adopted trees →</Text>
            </TouchableOpacity>
          </View>
        )}

        {tab === 'achievements' && (
          <View style={{ gap: 16 }}>
            <AchievementsTabContent achievements={asAchievements} xp={s ? { xp: s.xp, level: s.level } : null} />
          </View>
        )}

        {tab === 'drives' && (
          <View style={styles.body}>
            <DrivesTabContent role="user" drives={(drives.data ?? []) as any} onPressDrive={(d) => navigation.navigate('DriveDetail', { driveId: d.id })} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Impact({ value, label, extra }: { value: string; label: string; extra?: string }) {
  return (
    <View style={styles.impact}>
      <Text style={styles.impactNum}>{value}</Text>
      <Text style={styles.impactLabel}>{label}</Text>
      {extra ? <Text style={styles.impactLabel}>{extra}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { position: 'absolute', left: 0, right: 0, top: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  iconButton: { width: 40, height: 40 },
  iconBlur: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.warmBrown, backgroundColor: 'transparent' },
  iconText: { fontSize: 18, color: COLORS.textPrimary },
  body: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  card: { gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  statRow: { flexDirection: 'row', gap: 8 },
  impact: { flex: 1, alignItems: 'center', gap: 2 },
  impactNum: { fontSize: 18, fontWeight: '800', color: COLORS.forest },
  impactLabel: { fontSize: 11, color: COLORS.textMuted, textAlign: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: COLORS.earth, letterSpacing: 1, textTransform: 'uppercase', marginTop: 12 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.warmBrown },
  count: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  seeAll: { fontSize: 13, fontWeight: '700', color: COLORS.sageDark, textAlign: 'center', paddingVertical: 8 },
});
