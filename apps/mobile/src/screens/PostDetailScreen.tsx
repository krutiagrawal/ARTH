import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { EmptyState } from '../components/common/EmptyState';
import { PostCard } from '../components/social/PostCard';
import { ReportSheet } from '../components/social/ReportSheet';
import {
  useBlockTarget,
  useDeletePost,
  usePost,
  useToggleLike,
  useToggleSave,
} from '../hooks/useSocialQueries';

/** A single post on its own screen — where a notification or a deep link lands. */
export function PostDetailScreen({ navigation, route }: any) {
  const postId: string | undefined = route?.params?.postId;
  const { data: post, isLoading, isError } = usePost(postId);

  const toggleLike = useToggleLike();
  const toggleSave = useToggleSave();
  const deletePost = useDeletePost();
  const blockTarget = useBlockTarget();
  const [reporting, setReporting] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Post" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={COLORS.forest} />
        </View>
      ) : isError || !post ? (
        <EmptyState
          icon="🍃"
          title="This post is gone"
          body="It may have been deleted, or hidden while it is reviewed."
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <PostCard
            post={post}
            onToggleLike={(p) => toggleLike.mutate({ id: p.id, liked: p.likedByMe })}
            onToggleSave={(p) => toggleSave.mutate({ id: p.id, saved: p.savedByMe })}
            onPressLikes={(p) => navigation.navigate('PostLikes', { postId: p.id })}
            onPressAuthor={(p) =>
              p.author.kind === 'ngo' && navigation.navigate('NgoPublicProfile', { ngoId: p.author.id })
            }
            onPressDrive={(p) => p.driveId && navigation.navigate('DriveDetail', { driveId: p.driveId })}
            onReport={() => setReporting(true)}
            onBlock={(p) =>
              blockTarget.mutate(
                p.author.kind === 'ngo' ? { ngoId: p.author.id } : { userId: p.author.id },
                { onSuccess: () => navigation.goBack() },
              )
            }
            onDelete={(p) => deletePost.mutate(p.id, { onSuccess: () => navigation.goBack() })}
            isTogglingLike={toggleLike.isPending && toggleLike.variables?.id === post.id}
          />
        </ScrollView>
      )}

      <ReportSheet
        visible={reporting}
        onClose={() => setReporting(false)}
        targetType="post"
        targetId={postId ?? null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: SPACING.md },
});
