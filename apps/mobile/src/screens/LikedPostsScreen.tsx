import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { EmptyState } from '../components/common/EmptyState';
import { PostCard } from '../components/social/PostCard';
import { ReportSheet } from '../components/social/ReportSheet';
import { useBlockTarget, useDeletePost, useLikedPosts, useToggleLike, useToggleSave } from '../hooks/useSocialQueries';
import type { ApiPost } from '../api/posts';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

/** Available to every role's account — posts I've liked, regardless of what I'm logged in as. */
export function LikedPostsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useLikedPosts();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const toggleLike = useToggleLike();
  const toggleSave = useToggleSave();
  const deletePost = useDeletePost();
  const blockTarget = useBlockTarget();
  const [reportTarget, setReportTarget] = useState<ApiPost | null>(null);

  const posts = useMemo(() => data?.pages.flatMap((p) => p.posts) ?? [], [data]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const openAuthor = useCallback(
    (post: ApiPost) => {
      if (post.author.kind === 'ngo') navigation.navigate('NgoPublicProfile', { ngoId: post.author.id });
      else if (post.author.kind === 'nursery') navigation.navigate('NurseryPublicProfile', { nurseryId: post.author.id });
      else if (post.author.kind === 'user') navigation.navigate('UserPublicProfile', { userId: post.author.id });
    },
    [navigation],
  );

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Liked Posts</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={onRefresh}
          refreshing={refreshing}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onToggleLike={(p) => toggleLike.mutate({ id: p.id, liked: p.likedByMe })}
              onToggleSave={(p) => toggleSave.mutate({ id: p.id, saved: p.savedByMe })}
              onPressAuthor={openAuthor}
              onPressLikes={(p) => navigation.navigate('PostLikes', { postId: p.id })}
              onPressDrive={(p) => p.driveId && navigation.navigate('DriveDetail', { driveId: p.driveId })}
              onReport={(p) => setReportTarget(p)}
              onBlock={(p) => blockTarget.mutate(p.author.kind === 'ngo' ? { ngoId: p.author.id } : { userId: p.author.id })}
              onDelete={(p) => deletePost.mutate(p.id)}
              isTogglingLike={toggleLike.isPending && toggleLike.variables?.id === item.id}
            />
          )}
          ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={COLORS.forest} /> : null}
          ListEmptyComponent={<EmptyState icon="💚" title="No liked posts yet" body="Posts you like will show up here." />}
        />
      )}

      <ReportSheet visible={reportTarget !== null} onClose={() => setReportTarget(null)} targetType="post" targetId={reportTarget?.id ?? null} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  list: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  footer: { marginVertical: SPACING.md },
});
