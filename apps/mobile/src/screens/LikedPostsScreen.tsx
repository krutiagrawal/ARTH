import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { PostGrid } from '../components/profile/PostGrid';
import { useLikedPosts } from '../hooks/useSocialQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

import { TEXT } from '../constants/typography';
/** Available to every role's account — posts I've liked, regardless of what I'm logged in as. */
export function LikedPostsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useLikedPosts();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);


  const posts = useMemo(() => data?.pages.flatMap((p) => p.posts) ?? [], [data]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);


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
        // Tiles open ProfilePostFeed in 'liked' mode: the tapped post full-size, scrollable
        // through the rest of the liked list.
        <PostGrid
          posts={posts}
          onPressPost={(p: any) => navigation.navigate('ProfilePostFeed', { authorKind: 'liked', initialPostId: p.id })}
          onEndReached={onEndReached}
          isFetchingNextPage={isFetchingNextPage}
          emptyTitle="No liked posts yet"
          emptyBody="Posts you like will show up here."
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { flex: 1,...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
});
