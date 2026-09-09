import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { resolveMediaUrl } from '../../api/client';
import { EmptyState } from '../common/EmptyState';
import { EFFECTIVE_WIDTH } from '../../utils/responsive';
import type { ApiPost } from '../../api/posts';

const GAP = 3;
const TILE = (EFFECTIVE_WIDTH - GAP * 2) / 3;

function GridTile({ post, onPress }: { post: ApiPost; onPress: () => void }) {
  const cover = resolveMediaUrl(post.media[0]?.url);
  return (
    <TouchableOpacity style={styles.tile} activeOpacity={0.85} onPress={onPress}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imageEmpty]}>
          <Text style={styles.textOnly} numberOfLines={4}>
            {post.caption}
          </Text>
        </View>
      )}
      {post.media.length > 1 && (
        <View style={styles.multiBadge}>
          <Text style={styles.multiBadgeText}>⧉</Text>
        </View>
      )}
      {post.likeCount > 0 && (
        <View style={styles.likeBadge}>
          <Text style={styles.likeBadgeText}>❤️ {post.likeCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Instagram-style 3-column post grid. A single FlatList (not nested in a ScrollView) so the
 * profile-tabs pattern still virtualizes: `ListHeaderComponent` carries the profile header, tab
 * bar, and — for non-"posts" tabs — that tab's whole content, with `posts` passed as `[]` so the
 * grid area itself renders nothing.
 */
export function PostGrid({
  posts,
  onPressPost,
  onEndReached,
  isFetchingNextPage,
  ListHeaderComponent,
  emptyTitle = 'No posts yet',
  emptyBody,
}: {
  posts: ApiPost[];
  onPressPost: (post: ApiPost) => void;
  onEndReached?: () => void;
  isFetchingNextPage?: boolean;
  ListHeaderComponent?: React.ReactElement | null;
  emptyTitle?: string;
  emptyBody?: string;
}) {
  const renderItem = useMemo(
    () =>
      ({ item }: { item: ApiPost }) =>
        <GridTile post={item} onPress={() => onPressPost(item)} />,
    [onPressPost],
  );

  return (
    <FlatList
      data={posts}
      keyExtractor={(p) => p.id}
      numColumns={3}
      renderItem={renderItem}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.content}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={<EmptyState icon="🌱" title={emptyTitle} body={emptyBody} />}
      ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={styles.footer} color={COLORS.sage} /> : null}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.6}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  row: { gap: GAP },
  tile: { width: TILE, height: TILE, marginBottom: GAP, overflow: 'hidden', backgroundColor: COLORS.mintLight },
  image: { width: '100%', height: '100%' },
  imageEmpty: { padding: 8, alignItems: 'center', justifyContent: 'center' },
  textOnly: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 15 },
  multiBadge: { position: 'absolute', top: 5, right: 5 },
  multiBadgeText: { fontSize: 13, color: COLORS.white },
  likeBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  likeBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  footer: { marginVertical: 16 },
});
