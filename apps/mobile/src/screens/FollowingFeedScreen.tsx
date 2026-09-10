import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { EmptyState } from '../components/common/EmptyState';
import { PostCard } from '../components/social/PostCard';
import { ReportSheet } from '../components/social/ReportSheet';
import { NotificationBell } from '../components/social/NotificationBell';
import { StoriesTray } from '../components/stories/StoriesTray';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import {
  useBlockTarget,
  useDeletePost,
  useSocialFeed,
  useToggleLike,
  useToggleSave,
} from '../hooks/useSocialQueries';
import { useRingStatus } from '../hooks/useApiQueries';
import type { ApiPost } from '../api/posts';

interface FollowingFeedScreenProps {
  navigation: any;
  /** True when hosted inside the Community tab rather than pushed as its own screen. */
  embedded?: boolean;
}

/**
 * The main social feed: stories on top, then posts from followed NGOs and friends.
 *
 * Cursor-paginated through `useSocialFeed`, so new posts landing mid-scroll can't duplicate or
 * skip rows the way the old page/offset endpoint did.
 */
export function FollowingFeedScreen({ navigation, embedded = false }: FollowingFeedScreenProps) {
  const insets = useSafeAreaInsets();
  const clearance = useBottomNavClearance();

  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSocialFeed();

  const toggleLike = useToggleLike();
  const toggleSave = useToggleSave();
  const deletePost = useDeletePost();
  const blockTarget = useBlockTarget();
  const [reportTarget, setReportTarget] = useState<ApiPost | null>(null);

  const posts = useMemo(() => data?.pages.flatMap((p) => p.posts) ?? [], [data]);

  const authorIds = useMemo(() => {
    const userIds = new Set<string>();
    const ngoIds = new Set<string>();
    const nurseryIds = new Set<string>();
    for (const p of posts) {
      if (p.author.kind === 'user') userIds.add(p.author.id);
      else if (p.author.kind === 'ngo') ngoIds.add(p.author.id);
      else if (p.author.kind === 'nursery') nurseryIds.add(p.author.id);
    }
    return { userIds: [...userIds], ngoIds: [...ngoIds], nurseryIds: [...nurseryIds] };
  }, [posts]);
  const ringStatus = useRingStatus(authorIds);
  const ringFor = useCallback(
    (post: ApiPost) => {
      const buckets = ringStatus.data;
      if (!buckets) return null;
      if (post.author.kind === 'user') return buckets.users[post.author.id];
      if (post.author.kind === 'ngo') return buckets.ngos[post.author.id];
      if (post.author.kind === 'nursery') return buckets.nurseries[post.author.id];
      return null;
    },
    [ringStatus.data],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const openAuthor = useCallback(
    (post: ApiPost) => {
      if (post.author.kind === 'ngo') {
        navigation.navigate('NgoPublicProfile', { ngoId: post.author.id });
      } else if (post.author.kind === 'nursery') {
        navigation.navigate('NurseryPublicProfile', { nurseryId: post.author.id });
      } else if (post.author.kind === 'user') {
        navigation.navigate('UserPublicProfile', { userId: post.author.id });
      }
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      {!embedded && (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Feed</Text>
          <NotificationBell onPress={() => navigation.navigate('Notifications')} />
        </View>
      )}

      {isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={COLORS.forest} />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.list, { paddingBottom: clearance }]}
          showsVerticalScrollIndicator={false}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          ListHeaderComponent={
            <View style={styles.trayWrap}>
              <StoriesTray tone="onLight" />
            </View>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onToggleLike={(p) => toggleLike.mutate({ id: p.id, liked: p.likedByMe })}
              onToggleSave={(p) => toggleSave.mutate({ id: p.id, saved: p.savedByMe })}
              onPressAuthor={openAuthor}
              onPressLikes={(p) => navigation.navigate('PostLikes', { postId: p.id })}
              onPressDrive={(p) => p.driveId && navigation.navigate('DriveDetail', { driveId: p.driveId })}
              onReport={(p) => setReportTarget(p)}
              onBlock={(p) =>
                blockTarget.mutate(
                  p.author.kind === 'ngo' ? { ngoId: p.author.id } : { userId: p.author.id },
                )
              }
              onDelete={(p) => deletePost.mutate(p.id)}
              isTogglingLike={toggleLike.isPending && toggleLike.variables?.id === item.id}
              storyRing={ringFor(item)}
            />
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={COLORS.forest} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="🌿"
              title="Your feed is quiet"
              body="Follow a few NGOs and add some friends – their drives, photos and milestones land here."
              actionLabel="Browse NGOs"
              onAction={() => navigation.navigate('NgoDirectory')}
            />
          }
        />
      )}

      <ReportSheet
        visible={reportTarget !== null}
        onClose={() => setReportTarget(null)}
        targetType="post"
        targetId={reportTarget?.id ?? null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  backIcon: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: {
    fontFamily: FONTS.displayBold,
    fontSize: 22,
    lineHeight: 29,
    color: COLORS.textPrimary,
  },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  trayWrap: { marginBottom: SPACING.sm },
  footer: { marginVertical: SPACING.md },
});
