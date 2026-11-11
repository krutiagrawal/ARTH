import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/common/AppText';
import { BorderCard } from '../components/common/BorderCard';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { TEXT } from '../constants/typography';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { infiniteScrollProps } from '../hooks/useInfiniteList';
import { useGroup, useGroupActivity, useGroupChallenges, useGroupContributors, useGroupMembers, useGroupsLeaderboard } from '../hooks/useGroupQueries';
import { GroupActivityScreen, GroupLeaderboardScreen } from './GroupListScreens';
import { GroupMembersScreen } from './GroupMembersScreen';
import { GroupChallengesScreen } from './GroupChallengesScreen';

type Tab = 'activity' | 'members' | 'quests' | 'ranks';

const TAB_LABELS: Record<Tab, string> = {
  activity: '⚡ Activity',
  members: '👥 Members',
  quests: '⚔️ Quests',
  ranks: '🏆 Ranks',
};

/**
 * The group's Community tab: the same page as an individual's (header, directory pills, tab bar),
 * with the group's people and work in place of friends: what everyone is doing, the members, the
 * group's quests and the rankings.
 */
export function GroupCommunityScreen({ navigation, groupId }: { navigation: any; groupId: string }) {
  const insets = useSafeAreaInsets();
  const clearance = useBottomNavClearance();
  const [tab, setTab] = useState<Tab>('activity');
  const group = useGroup(groupId);
  const activity = useGroupActivity(groupId);
  const members = useGroupMembers(groupId);
  const challenges = useGroupChallenges(groupId);
  const contributors = useGroupContributors(groupId);
  const ranks = useGroupsLeaderboard();
  const { refreshing, onRefresh } = usePullToRefresh([
    group.refetch,
    activity.refetch,
    members.refetch,
    challenges.refetch,
    contributors.refetch,
    ranks.refetch,
  ]);

  // Only the lists that page need to react to scrolling.
  const scrollPaging = tab === 'activity' ? infiniteScrollProps(activity) : tab === 'members' ? infiniteScrollProps(members) : {};

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Community 🌱
        </Text>
      </View>
      <View style={styles.directoryRow}>
        <TouchableOpacity style={styles.pill} onPress={() => navigation.navigate('NgoDirectory')}>
          <Text style={styles.pillText}>🌿 NGOs</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pill} onPress={() => navigation.navigate('NurseryDirectory')}>
          <Text style={styles.pillText}>🌱 Nurseries</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pill} onPress={() => navigation.navigate('Groups')}>
          <Text style={styles.pillText}>👥 Groups</Text>
        </TouchableOpacity>
      </View>

      <BorderCard noPadding borderRadius={RADIUS.xl} style={styles.tabBar}>
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]} numberOfLines={1}>
              {TAB_LABELS[t]}
            </Text>
          </TouchableOpacity>
        ))}
      </BorderCard>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: clearance }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        {...scrollPaging}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        {tab === 'activity' && <GroupActivityScreen navigation={navigation} groupId={groupId} embedded />}
        {tab === 'members' && <GroupMembersScreen navigation={navigation} groupId={groupId} embedded />}
        {tab === 'quests' && <GroupChallengesScreen navigation={navigation} groupId={groupId} embedded />}
        {tab === 'ranks' && <GroupLeaderboardScreen navigation={navigation} groupId={groupId} embedded />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { flexShrink: 1, ...TEXT.title, color: COLORS.textPrimary },
  directoryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  pill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(45,90,39,0.1)',
    borderWidth: 1,
    borderColor: COLORS.sage,
    justifyContent: 'center',
  },
  pillText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  tabBar: { flexDirection: 'row', marginHorizontal: 16, padding: 4, marginBottom: 12, borderWidth: 0 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.lg },
  tabActive: { backgroundColor: COLORS.forest, ...SHADOWS.sm },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white },
});
