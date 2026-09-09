import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, Share } from 'react-native';
import { Text } from '../common/AppText';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../constants/colors';
import { RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { FONTS } from '../../constants/typography';
import { resolveMediaUrl } from '../../api/client';
import type { ApiPost } from '../../api/posts';
import { MediaCarousel } from './MediaCarousel';
import { LikeButton } from './LikeButton';
import { StoryRing, type StoryRingStatus } from '../common/StoryRing';
import { ActionSheet, type ActionSheetOption } from './ActionSheet';
import { useHaptics } from '../../hooks/useHaptics';
import { useConfirm } from '../../context/ConfirmDialogContext';

/** "3h", "2d", "12 Mar" — compact enough for the author row. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const CAPTION_CLAMP = 3;

interface PostCardProps {
  post: ApiPost;
  onToggleLike: (post: ApiPost) => void;
  onToggleSave?: (post: ApiPost) => void;
  onPressAuthor?: (post: ApiPost) => void;
  onPressLikes?: (post: ApiPost) => void;
  onPressDrive?: (post: ApiPost) => void;
  onReport?: (post: ApiPost) => void;
  onBlock?: (post: ApiPost) => void;
  onDelete?: (post: ApiPost) => void;
  /** True while a like toggle for this exact post is in flight — see LikeButton. */
  isTogglingLike?: boolean;
  /** Set false to hide the Share menu option — e.g. the reduced-actions grid post detail view. */
  enableShare?: boolean;
  /** Sage = author has an unseen story, brown = seen, omitted = no active story. */
  storyRing?: StoryRingStatus | null;
}

export function PostCard({
  post,
  onToggleLike,
  onToggleSave,
  onPressAuthor,
  onPressLikes,
  onPressDrive,
  onReport,
  onBlock,
  onDelete,
  isTogglingLike = false,
  enableShare = true,
  storyRing,
}: PostCardProps) {
  const { selection, light } = useHaptics();
  const confirm = useConfirm();
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const avatarUri = useMemo(() => resolveMediaUrl(post.author.imageUrl), [post.author.imageUrl]);

  // The big centred burst on double-tap — separate from LikeButton's own small ring flourish.
  const burstScale = useSharedValue(0.3);
  const burstOpacity = useSharedValue(0);
  const burstStyle = useAnimatedStyle(() => ({
    opacity: burstOpacity.value,
    transform: [{ scale: burstScale.value }],
  }));

  const likedByMe = post.likedByMe;
  const doubleTap = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .maxDuration(250)
        .onEnd((_e, success) => {
          if (!success) return;
          burstScale.value = 0.3;
          burstOpacity.value = withSequence(withTiming(1, { duration: 90 }), withDelay(350, withTiming(0, { duration: 250 })));
          burstScale.value = withSequence(withTiming(1.15, { duration: 180 }), withTiming(1, { duration: 120 }));
          // Reversible stays reversible: a double-tap only ever likes, exactly like the heart
          // button's own first tap — it never undoes an existing like, so it can't fight a
          // deliberate single tap on the heart to unlike.
          if (!likedByMe) {
            runOnJS(light)();
            runOnJS(onToggleLike)(post);
          }
        }),
    [likedByMe, onToggleLike, post, burstScale, burstOpacity, light],
  );

  const menuOptions = useMemo<ActionSheetOption[]>(() => {
    const options: ActionSheetOption[] = [];

    if (post.isMine) {
      if (onDelete) {
        options.push({
          key: 'delete',
          icon: '🗑️',
          label: 'Delete post',
          hint: 'Removes it for everyone',
          destructive: true,
          onPress: () =>
            confirm('Delete this post?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => onDelete(post) },
            ]),
        });
      }
    } else {
      if (onReport) {
        options.push({
          key: 'report',
          icon: '🚩',
          label: 'Report post',
          hint: 'Tell us what is wrong with it',
          onPress: () => onReport(post),
        });
      }
      if (onBlock) {
        options.push({
          key: 'block',
          icon: '🚫',
          label: post.author.kind === 'ngo' ? `Block ${post.author.name}` : 'Block this person',
          hint: 'Hides their posts and stories both ways',
          destructive: true,
          onPress: () =>
            confirm(
              `Block ${post.author.name}?`,
              'You will stop seeing their posts and stories, and they will stop seeing yours.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Block', style: 'destructive', onPress: () => onBlock(post) },
              ],
            ),
        });
      }
    }

    if (enableShare) {
      options.push({
        key: 'share',
        icon: '📤',
        label: 'Share',
        onPress: () => {
          const what = post.caption?.trim() || `A post from ${post.author.name}`;
          Share.share({ message: `${what}\n\nShared from PLANT 🌱` }).catch(() => undefined);
        },
      });
    }

    return options;
  }, [post, onDelete, onReport, onBlock, enableShare]);

  const openMenu = useCallback(() => {
    selection();
    setMenuOpen(true);
  }, [selection]);

  return (
    <View style={styles.card}>
      {/* Author row */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.authorRow}
          activeOpacity={0.7}
          onPress={() => onPressAuthor?.(post)}
        >
          <StoryRing status={storyRing} size={42}>
            <View style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarEmoji}>{post.author.avatarEmoji ?? '🌱'}</Text>
              )}
            </View>
          </StoryRing>

          <View style={styles.authorText}>
            <View style={styles.nameRow}>
              <Text style={styles.authorName} numberOfLines={1}>
                {post.author.name}
              </Text>
              {post.author.kind === 'ngo' && (
                <View style={styles.orgTag}>
                  <Text style={styles.orgTagText}>NGO</Text>
                </View>
              )}
            </View>
            <Text style={styles.meta} numberOfLines={1}>
              {post.author.handle ? `@${post.author.handle} · ` : ''}
              {relativeTime(post.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuBtn} onPress={openMenu} hitSlop={10}>
          <Text style={styles.menuDots}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Only the author ever sees this — everyone else's query filters hidden posts out. */}
      {post.isHidden && (
        <View style={styles.reviewBanner}>
          <Text style={styles.reviewText}>
            ⚠️  Hidden while our team reviews reports about this post.
          </Text>
        </View>
      )}

      {post.media.length > 0 && (
        <GestureDetector gesture={doubleTap}>
          <View style={styles.mediaWrap}>
            <MediaCarousel media={post.media} />
            <View style={styles.burstOverlay} pointerEvents="none">
              <Animated.View style={[styles.burstStack, burstStyle]}>
                {/* A drawn flat heart, not the ❤️ emoji — the emoji's glossy highlight/shine
                    (and its glyph occasionally painting outside its reported metrics, cropping the
                    top-right lobe at this size) isn't something we can control across devices. */}
                <Svg width={90} height={90} viewBox="0 0 24 24" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
                  <Path
                    d="M12,21.35l-1.45-1.32C5.4,15.36,2,12.28,2,8.5C2,5.42,4.42,3,7.5,3c1.74,0,3.41,0.81,4.5,2.09
                       C13.09,3.81,14.76,3,16.5,3C19.58,3,22,5.42,22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z"
                    fill={COLORS.danger}
                  />
                </Svg>
                <Animated.Text style={styles.burstSapling}>🌱</Animated.Text>
              </Animated.View>
            </View>
          </View>
        </GestureDetector>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <LikeButton
          liked={post.likedByMe}
          count={post.likeCount}
          onToggle={() => onToggleLike(post)}
          onPressCount={post.likeCount > 0 ? () => onPressLikes?.(post) : undefined}
          isToggling={isTogglingLike}
        />

        <View style={styles.actionsRight}>
          {onToggleSave && (
            <TouchableOpacity onPress={() => onToggleSave(post)} hitSlop={8} activeOpacity={0.7}>
              <Text style={styles.saveIcon}>{post.savedByMe ? '🔖' : '🏷️'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Caption */}
      {post.caption ? (
        <TouchableOpacity activeOpacity={0.9} onPress={() => setExpanded((v) => !v)}>
          <Text style={styles.caption} numberOfLines={expanded ? undefined : CAPTION_CLAMP}>
            {post.caption}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* Drive / tree tag */}
      {post.driveTitle ? (
        <TouchableOpacity style={styles.tag} activeOpacity={0.7} onPress={() => onPressDrive?.(post)}>
          <Text style={styles.tagText} numberOfLines={1}>
            📍 {post.driveTitle}
          </Text>
        </TouchableOpacity>
      ) : post.treeNickname ? (
        <View style={styles.tag}>
          <Text style={styles.tagText} numberOfLines={1}>
            🌳 {post.treeNickname}
          </Text>
        </View>
      ) : null}

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={post.author.name}
        options={menuOptions}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: 10,
    ...SHADOWS.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 21 },
  authorText: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  authorName: {
    fontFamily: FONTS.display,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  orgTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.glassSageSubtle,
  },
  orgTagText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6, color: COLORS.forest },
  meta: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  menuBtn: { paddingHorizontal: 4 },
  menuDots: { fontSize: 20, color: COLORS.textMuted, lineHeight: 22 },
  reviewBanner: {
    backgroundColor: 'rgba(194,74,59,0.10)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  reviewText: { fontSize: 12, color: COLORS.dangerDark, fontWeight: '600' },
  mediaWrap: { alignItems: 'center' },
  burstOverlay: {
    ...{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burstStack: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
  // The heart path's belly (its widest open space, below the two-lobe notch) sits a little past
  // dead centre of its viewBox — nudging the sapling down from the box's exact centre puts it
  // there instead of straddling the notch. Plain emoji text, not AppText: this needs the system's
  // default color-emoji rendering, which a forced custom font family can break.
  burstSapling: { position: 'absolute', fontSize: 30, marginTop: 6 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionsRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  saveIcon: { fontSize: 18 },
  caption: { fontSize: 14, lineHeight: 21, color: COLORS.textSecondary },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.mintLight,
    maxWidth: '100%',
  },
  tagText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
});
