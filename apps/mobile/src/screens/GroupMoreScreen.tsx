import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { GroupScreen } from '../components/groups/GroupScreen';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useGroup } from '../hooks/useGroupQueries';

/** Everything else a group has, one tap away: timeline, achievements, rankings, numbers, trees, giving, settings. */
export function GroupMoreScreen({ navigation, groupId }: { navigation: any; groupId: string }) {
  const clearance = useBottomNavClearance();
  const group = useGroup(groupId);

  const items: { emoji: string; label: string; route: string }[] = [
    { emoji: '📣', label: 'Activity', route: 'GroupActivity' },
    { emoji: '🏅', label: 'Achievements', route: 'GroupAchievements' },
    { emoji: '🏆', label: 'Leaderboards', route: 'GroupLeaderboard' },
    { emoji: '📊', label: 'Analytics', route: 'GroupAnalytics' },
    { emoji: '🌳', label: 'Our trees', route: 'GroupTrees' },
    { emoji: '💚', label: 'Donations & adoptions', route: 'GroupGiving' },
    { emoji: '⚙️', label: 'Group settings', route: 'GroupSettings' },
  ];

  return (
    <GroupScreen title="More" subtitle={group.data?.name} onBack={() => navigation.goBack()} bottomPad={clearance}>
      <BorderCard noPadding>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.route}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(item.route, { groupId })}
            style={[styles.row, i > 0 && styles.divider]}
          >
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </BorderCard>
      <View style={{ height: 12 }} />
      <BorderCard noPadding>
        <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Groups')} style={styles.row}>
          <Text style={styles.emoji}>🔀</Text>
          <Text style={styles.label}>Switch group</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </BorderCard>
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.sageLight },
  emoji: { fontSize: 22 },
  label: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  chevron: { fontSize: 24, color: COLORS.textMuted },
});
