import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, type ListRenderItemInfo } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { PostCard } from '../components/social/PostCard';
import { ReportSheet } from '../components/social/ReportSheet';
import {
  useDeletePost,
  useGroupPosts,
  useNgoPosts,
  useNurseryPosts,
  useToggleLike,
  useUserPosts,
} from '../hooks/useSocialQueries';
import { useRingStatus } from '../hooks/useApiQueries';
import type { ApiPost } from '../api/posts';

export type ProfilePostFeedAuthorKind = 'user' | 'ngo' | 'nursery' | 'group';

/**
 * Opened by tapping a tile in any profile's post grid (user, NGO, nursery, or group) — lands on
 * that exact post, full width, and lets you keep scrolling up/down through the rest of that
 * author's posts in grid order, the way tapping into an Instagram grid does. Backed by the same
 * per-author-kind post query the grid itself uses, so it opens with zero network wait and
 * paginates the same way.
 *
 * Same reduced action set as the old grid modal it replaces: Like, plus Delete on your own posts
 * or Report on someone else's — no comments/save/share/author-nav, since every post here already
 * shares one author.
 */
export function ProfilePostFeedScreen({ navigation, route }: any) {
  const authorKind: ProfilePostFeedAuthorKind = route?.params?.authorKind ?? 'user';
  const authorId: string | undefined = route?.params?.authorId;
  const initialPostId: string | undefined = route?.params?.initialPostId;

  // Rules of hooks require all four to be called every render; only the one matching
  // `authorKind` is actually enabled (each hook no-ops when passed `undefined`).
  const userPosts = useUserPosts(authorKind === 'user' ? authorId : undefined);
  const ngoPosts = useNgoPosts(authorKind === 'ngo' ? authorId : undefined);
  const nurseryPosts = useNurseryPosts(authorKind === 'nursery' ? authorId : undefined);
  const groupPosts = useGroupPosts(authorKind === 'group' ? authorId : undefined);
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    authorKind === 'ngo' ? ngoPosts : authorKind === 'nursery' ? nurseryPosts : authorKind === 'group' ? groupPosts : userPosts;

  const posts = useMemo(() => data?.pages.flatMap((p) => p.posts) ?? [], [data]);

  const ringStatus = useRingStatus({
    userIds: authorKind === 'user' && authorId ? [authorId] : [],
    ngoIds: authorKind === 'ngo' && authorId ? [authorId] : [],
    nurseryIds: authorKind === 'nursery' && authorId ? [authorId] : [],
    groupIds: authorKind === 'group' && authorId ? [authorId] : [],
  });
  const authorRing = authorId
    ? authorKind === 'ngo'
      ? ringStatus.data?.ngos[authorId]
      : authorKind === 'nursery'
        ? ringStatus.data?.nurseries[authorId]
        : authorKind === 'group'
          ? ringStatus.data?.groups[authorId]
          : ringStatus.data?.users[authorId]
    : null;

  const toggleLike = useToggleLike();
  const deletePost = useDeletePost();
  const [reportTarget, setReportTarget] = useState<ApiPost | null>(null);

  const listRef = useRef<FlatList<ApiPost>>(null);
  const hasAppliedInitialScroll = useRef(false);

  const initialIndex = useMemo(() => {
    if (!initialPostId) return 0;
    const i = posts.findIndex((p) => p.id === initialPostId);
    return i >= 0 ? i : 0;
  }, [posts, initialPostId]);

  // FlatList only honours `initialScrollIndex` on mount, before content is measured, so once the
  // very first non-empty posts list lands we nudge it into place ourselves too — covers the case
  // where the tapped post's page was still in flight when this screen first rendered.
  useEffect(() => {
    if (hasAppliedInitialScroll.current || posts.length === 0 || initialIndex === 0) return;
    hasAppliedInitialScroll.current = true;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    });
  }, [posts.length, initialIndex]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onScrollToIndexFailed = useCallback((info: { index: number; averageItemLength: number }) => {
    listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
    setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 80);
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ApiPost>) => (
      <PostCard
        post={item}
        onToggleLike={(p) => toggleLike.mutate({ id: p.id, liked: p.likedByMe })}
        isTogglingLike={toggleLike.isPending && toggleLike.variables?.id === item.id}
        onDelete={item.isMine ? (p) => deletePost.mutate(p.id) : undefined}
        onReport={!item.isMine ? () => setReportTarget(item) : undefined}
        enableShare={false}
        storyRing={authorRing}
      />
    ),
    [toggleLike, deletePost, authorRing],
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Posts" onBack={() => navigation.goBack()} />

      {isLoading && posts.length === 0 ? (
        <View style={styles.centre}>
          <ActivityIndicator color={COLORS.forest} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={posts}
          keyExtractor={(p) => p.id}
          initialScrollIndex={initialIndex > 0 ? initialIndex : undefined}
          onScrollToIndexFailed={onScrollToIndexFailed}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          ListFooterComponent={
            isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={COLORS.forest} /> : null
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
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xl },
  footer: { marginVertical: SPACING.md },
});
