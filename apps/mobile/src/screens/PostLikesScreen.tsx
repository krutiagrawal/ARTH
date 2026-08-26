import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { EmptyState } from '../components/common/EmptyState';
import { usePostLikers } from '../hooks/useSocialQueries';

/** Who liked a post. Reached by tapping the like count on a PostCard. */
export function PostLikesScreen({ navigation, route }: any) {
  const postId: string | undefined = route?.params?.postId;
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    usePostLikers(postId);

  const likers = useMemo(() => data?.pages.flatMap((p) => p.likers) ?? [], [data]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Likes"
        subtitle={likers.length > 0 ? `${likers.length} so far` : undefined}
        onBack={() => navigation.goBack()}
      />

      {isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={COLORS.forest} />
        </View>
      ) : (
        <FlatList
          data={likers}
          keyExtractor={(u) => u.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarEmoji}>{item.avatarEmoji}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.handle} numberOfLines={1}>
                  @{item.handle}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={COLORS.forest} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState icon="🤍" title="No likes yet" body="Be the first to show some love." />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.md, gap: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    padding: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 21 },
  rowText: { flex: 1 },
  name: { fontFamily: FONTS.display, fontSize: 15, lineHeight: 21, color: COLORS.textPrimary },
  handle: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  footer: { marginVertical: SPACING.md },
});
