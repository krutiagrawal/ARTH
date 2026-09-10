import React, { useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { EmptyState } from '../components/common/EmptyState';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { PostCard } from '../components/social/PostCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { useGroupActivity, useGroupActivityForMember } from '../hooks/useApiQueries';
import { useToggleLike, useToggleSave, useDeletePost } from '../hooks/useSocialQueries';
import type { GroupActivityItem } from '../api/groupActivity';
import type { ApiPost } from '../api/posts';

const ACTIVITY_COPY: Record<string, (name: string) => string> = {
  tree_planted: (name) => `${name} planted a tree 🌳`,
  achievement_unlocked: (name) => `${name} unlocked an achievement 🏆`,
  streak_milestone: (name) => `${name} hit a streak milestone 🔥`,
  friend_cheer: (name) => `${name} cheered a friend 👏`,
  challenge_joined: (name) => `${name} joined a challenge 🎯`,
  challenge_completed: (name) => `${name} completed a challenge 🎉`,
};

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function ActivityRow({ item }: { item: Extract<GroupActivityItem, { kind: 'activity' }> }) {
  const copy = ACTIVITY_COPY[item.type]?.(item.user.name) ?? `${item.user.name} did something great`;
  return (
    <View style={styles.activityRow}>
      <View style={styles.activityAvatar}>
        <Text style={styles.activityAvatarText}>{item.user.avatarEmoji}</Text>
      </View>
      <View style={styles.activityTextWrap}>
        <Text style={styles.activityText}>{copy}</Text>
        <Text style={styles.activityTime}>{relativeTime(item.createdAt)}</Text>
      </View>
    </View>
  );
}

interface GroupActivityScreenProps {
  navigation: any;
  route?: { params?: { groupId?: string } };
}

/**
 * Merges auto-generated member activity (tree planted, streak milestone, achievement
 * unlocked, challenge joined/completed) with manually posted photo/status updates into one
 * timeline. Works for both the group's own login (no groupId — owner-facing endpoint) and a
 * regular member viewing a group they belong to (groupId param — member-facing endpoint).
 */
export function GroupActivityScreen({ navigation, route }: GroupActivityScreenProps) {
  const insets = useSafeAreaInsets();
  const groupId = route?.params?.groupId;

  const ownerQuery = useGroupActivity({ enabled: !groupId });
  const memberQuery = useGroupActivityForMember(groupId);
  const { data: items = [], isLoading, refetch, isRefetching } = groupId ? memberQuery : ownerQuery;

  const toggleLike = useToggleLike();
  const toggleSave = useToggleSave();
  const deletePost = useDeletePost();

  const postUpdateParams = useMemo(() => (groupId ? { groupId } : undefined), [groupId]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Group Activity"
        subtitle="What your group has been up to"
        onBack={groupId ? () => navigation?.goBack?.() : undefined}
      />

      <View style={styles.postButtonWrap}>
        <AnimatedButton
          label="📸  Post an update"
          onPress={() => navigation.navigate('GroupPostUpdate', postUpdateParams)}
          gradientColors={[COLORS.forest, COLORS.forestDeep]}
        />
      </View>

      {isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={COLORS.forest} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          renderItem={({ item }) =>
            item.kind === 'post' ? (
              <PostCard
                post={item.post as ApiPost}
                onToggleLike={(p) => toggleLike.mutate({ id: p.id, liked: p.likedByMe })}
                onToggleSave={(p) => toggleSave.mutate({ id: p.id, saved: p.savedByMe })}
                onDelete={(p) => deletePost.mutate(p.id)}
                isTogglingLike={toggleLike.isPending && toggleLike.variables?.id === item.post.id}
              />
            ) : (
              <ActivityRow item={item} />
            )
          }
          ListEmptyComponent={
            <EmptyState
              icon="🌿"
              title="No activity yet"
              body="Plant a tree or post an update – it'll show up here for the whole group to see."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  postButtonWrap: { paddingHorizontal: 20, marginBottom: 8 },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 10,
  },
  activityAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.beigeLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityAvatarText: { fontSize: 20 },
  activityTextWrap: { flex: 1 },
  activityText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  activityTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
