import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { GroupScreen } from '../components/groups/GroupScreen';
import { GroupAvatar, ProgressBar, SectionTitle, StatTile, describeActivity, groupTypeLabel, rupees } from '../components/groups/GroupBits';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import {
  useGroup,
  useGroupAchievements,
  useGroupActivity,
  useGroupChallenges,
  useGroupRequests,
  useGroupStats,
} from '../hooks/useGroupQueries';

interface Props {
  navigation: any;
  groupId: string;
  onNavigateTab: (tab: 'Members' | 'Challenges' | 'More') => void;
}

/** The group's dashboard: the same shape as an individual's home, but showing the group's own numbers. */
export function GroupHomeScreen({ navigation, groupId, onNavigateTab }: Props) {
  const clearance = useBottomNavClearance();
  const group = useGroup(groupId);
  const stats = useGroupStats(groupId);
  const challenges = useGroupChallenges(groupId);
  const achievements = useGroupAchievements(groupId);
  const activity = useGroupActivity(groupId);
  const isAdmin = group.data?.viewer.role === 'admin';
  const requests = useGroupRequests(groupId, isAdmin);

  const g = group.data;
  const s = stats.data;
  const openChallenges = (challenges.data ?? []).filter((c) => c.status === 'active' || c.status === 'completed').slice(0, 2);
  const unlocked = (achievements.data ?? []).filter((a) => a.unlocked);
  const nextAchievement = (achievements.data ?? []).filter((a) => !a.unlocked).sort((a, b) => b.progress / b.target - a.progress / a.target)[0];
  const pending = (requests.data ?? []).filter((r) => r.kind === 'join_request').length;

  return (
    <GroupScreen
      title={g?.name ?? 'Group'}
      subtitle={g ? `${groupTypeLabel(g.groupType)}${g.city ? ` · ${g.city}` : ''}` : undefined}
      onBack={() => navigation.goBack()}
      right={g ? <GroupAvatar group={g} size={36} /> : undefined}
      refetch={[group.refetch, stats.refetch, challenges.refetch, achievements.refetch, activity.refetch]}
      bottomPad={clearance}
    >
      {pending > 0 && (
        <TouchableOpacity activeOpacity={0.8} onPress={() => onNavigateTab('Members')} style={styles.banner}>
          <Text style={styles.bannerText}>
            🙋 {pending} {pending === 1 ? 'person wants' : 'people want'} to join. Review requests →
          </Text>
        </TouchableOpacity>
      )}

      {s && (
        <BorderCard style={styles.levelCard}>
          <Text style={styles.levelLabel}>GROUP LEVEL {s.level}</Text>
          <Text style={styles.levelName}>{s.name}</Text>
          <ProgressBar value={s.progress} />
          <Text style={styles.levelHint}>
            {s.nextName ? `${s.treesToNext} more ${s.treesToNext === 1 ? 'tree' : 'trees'} to reach ${s.nextName}` : 'Highest level reached 🌲'}
          </Text>
        </BorderCard>
      )}

      <View style={styles.tiles}>
        <StatTile emoji="👥" value={s?.memberCount ?? '–'} label="Members" />
        <StatTile emoji="🌳" value={s?.treesPlanted ?? '–'} label="Trees" />
        <StatTile emoji="🌍" value={s ? `${s.co2Kg}` : '–'} label="kg CO₂" />
      </View>
      <View style={[styles.tiles, { marginTop: 10 }]}>
        <StatTile emoji="🔥" value={s?.streakCurrent ?? '–'} label={`Streak · best ${s?.streakMax ?? 0}`} />
        <StatTile emoji="🤝" value={s?.adoptions ?? '–'} label="Adopted" />
        <StatTile emoji="💚" value={s ? rupees(s.donatedCents) : '–'} label="Donated" />
      </View>

      <SectionTitle action={{ label: 'All →', onPress: () => onNavigateTab('Challenges') }}>Challenges</SectionTitle>
      {openChallenges.length === 0 ? (
        <BorderCard>
          <Text style={styles.muted}>No active challenge. {isAdmin ? 'Start one to get everyone planting.' : 'An admin can start one.'}</Text>
        </BorderCard>
      ) : (
        openChallenges.map((c) => (
          <BorderCard key={c.id} style={styles.gap}>
            <Text style={styles.cardTitle}>{c.title}</Text>
            <ProgressBar value={c.progress / c.goalTotal} />
            <Text style={styles.muted}>
              {Math.min(c.progress, c.goalTotal)} / {c.goalTotal} trees{c.status === 'completed' ? ' · completed 🏆' : ''}
            </Text>
          </BorderCard>
        ))
      )}

      <SectionTitle action={{ label: 'All →', onPress: () => navigation.navigate('GroupAchievements', { groupId }) }}>Achievements</SectionTitle>
      <BorderCard>
        <Text style={styles.cardTitle}>
          {unlocked.length} of {(achievements.data ?? []).length} unlocked
        </Text>
        <Text style={styles.muted}>{unlocked.slice(0, 6).map((a) => a.icon).join('  ') || 'Plant your first tree to start.'}</Text>
        {nextAchievement && (
          <Text style={[styles.muted, { marginTop: 6 }]}>
            Next: {nextAchievement.icon} {nextAchievement.title} ({Math.floor(nextAchievement.progress)}/{nextAchievement.target})
          </Text>
        )}
      </BorderCard>

      <SectionTitle action={{ label: 'All →', onPress: () => navigation.navigate('GroupActivity', { groupId }) }}>Recent activity</SectionTitle>
      <BorderCard noPadding>
        {(activity.data ?? []).slice(0, 5).map((a, i) => {
          const line = describeActivity(a);
          return (
            <View key={a.id} style={[styles.activityRow, i > 0 && styles.divider]}>
              <Text style={styles.activityEmoji}>{line.emoji}</Text>
              <Text style={styles.activityText} numberOfLines={2}>
                {line.text}
              </Text>
            </View>
          );
        })}
        {(activity.data ?? []).length === 0 && <Text style={[styles.muted, { padding: 14 }]}>Nothing yet. Plant a tree to get things going.</Text>}
      </BorderCard>

      {g?.viewer.role === 'admin' && (
        <AnimatedButton
          label="🌱 Plant, adopt or donate"
          size="sm"
          variant="primary"
          fullWidth
          style={{ marginTop: 20 }}
          onPress={() => navigation.navigate('GroupActions', { groupId, groupName: g.name })}
        />
      )}
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: COLORS.golden, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  bannerText: { color: COLORS.textPrimary, fontWeight: '700', fontSize: 13 },
  levelCard: { gap: 6 },
  levelLabel: { fontSize: 11, fontWeight: '800', color: COLORS.earth, letterSpacing: 1.2 },
  levelName: { fontSize: 22, fontWeight: '800', color: COLORS.forest },
  levelHint: { fontSize: 12, color: COLORS.textMuted },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 12 },
  gap: { marginBottom: 8, gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  muted: { fontSize: 12, color: COLORS.textMuted },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14 },
  activityEmoji: { fontSize: 18 },
  activityText: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.sageLight },
});
