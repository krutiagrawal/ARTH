import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { EmptyState } from '../components/common/EmptyState';
import { PostCard } from '../components/social/PostCard';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useNgoProfile } from '../hooks/useApiQueries';
import { useDeletePost, useNgoPosts, useToggleLike, useToggleSave } from '../hooks/useSocialQueries';
import type { ApiPost } from '../api/posts';

/**
 * Everything this NGO has published, with its own engagement visible.
 *
 * Uses the same PostCard as the public feed rather than a bespoke grid so an NGO sees its posts
 * exactly as supporters do — including how the caption truncates and how the carousel reads.
 */
export function NgoOwnPostsScreen({ navigation }: any) {
  const clearance = useBottomNavClearance();
  const { data: profile } = useNgoProfile();
  const {
    data,
    isLoading,
    refetch,
    isRefetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNgoPosts(profile?.id);

  const toggleLike = useToggleLike();
  const toggleSave = useToggleSave();
  const deletePost = useDeletePost();

  const posts = useMemo(() => data?.pages.flatMap((p) => p.posts) ?? [], [data]);

  const totalLikes = useMemo(() => posts.reduce((sum, p) => sum + p.likeCount, 0), [posts]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={COLORS.forest} />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      contentContainerStyle={[styles.list, { paddingBottom: clearance }]}
      onRefresh={refetch}
      refreshing={isRefetching}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      ListHeaderComponent={
        posts.length > 0 ? (
          <View style={styles.summary}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{posts.length}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{totalLikes}</Text>
              <Text style={styles.statLabel}>Likes</Text>
            </View>
          </View>
        ) : null
      }
      renderItem={({ item }: { item: ApiPost }) => (
        <PostCard
          post={item}
          onToggleLike={(p) => toggleLike.mutate({ id: p.id, liked: p.likedByMe })}
          onToggleSave={(p) => toggleSave.mutate({ id: p.id, saved: p.savedByMe })}
          onPressLikes={(p) => navigation?.navigate('PostLikes', { postId: p.id })}
          onPressDrive={(p) => p.driveId && navigation?.navigate('DriveDetail', { driveId: p.driveId })}
          onDelete={(p) => deletePost.mutate(p.id)}
          isTogglingLike={toggleLike.isPending && toggleLike.variables?.id === item.id}
        />
      )}
      ListFooterComponent={
        isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={COLORS.forest} /> : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="📸"
          title="Nothing posted yet"
          body="Share a photo from a drive – your followers see it in their feed, and posting each week keeps your streak alive."
          actionLabel="Create a post"
          onAction={() => navigation?.navigate('NgoPostUpdate')}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.md },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginBottom: SPACING.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: FONTS.displayBold, fontSize: 24, lineHeight: 32, color: COLORS.forest },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  divider: { width: 1, height: 30, backgroundColor: COLORS.sand },
  footer: { marginVertical: SPACING.md },
});
