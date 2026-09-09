import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Modal, Image, Pressable, Animated, Dimensions, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { resolveStoryImage, type ApiStory } from '../../api/stories';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { TYPOGRAPHY } from '../../constants/typography';
import { StoryViewersSheet } from './StoryViewersSheet';
import { LikeButton } from '../social/LikeButton';
import { useToggleStoryLike } from '../../hooks/useApiQueries';

const { width: SW, height: SH } = Dimensions.get('window');
const STORY_DURATION = 5000;

export function StoryViewer({
  visible,
  stories,
  authorName,
  authorAvatar,
  initialIndex = 0,
  onClose,
  onDelete,
  onView,
}: {
  visible: boolean;
  stories: ApiStory[];
  authorName?: string;
  authorAvatar?: string;
  initialIndex?: number;
  onClose: () => void;
  onDelete?: (storyId: string) => void;
  /** Fired once per story as it comes on screen, so the tray ring can dim. Fire-and-forget. */
  onView?: (storyId: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(initialIndex);
  const [viewersOpen, setViewersOpen] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const toggleStoryLike = useToggleStoryLike();

  const current = stories[index];

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex, stories.length]);

  const goNext = () => {
    setIndex((i) => {
      if (i >= stories.length - 1) {
        onClose();
        return i;
      }
      return i + 1;
    });
  };

  const goPrev = () => {
    setIndex((i) => Math.max(0, i - 1));
  };

  // Record the view as the story comes on screen. Deliberately not awaited — the 5s timer must
  // not depend on a network round trip.
  useEffect(() => {
    if (visible && current) onView?.(current.id);
  }, [visible, current?.id]);

  // Drive the active segment's progress bar and auto-advance when it fills.
  useEffect(() => {
    if (!visible || !current) return;
    progress.setValue(0);
    anim.current = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });
    anim.current.start(({ finished }) => {
      if (finished) goNext();
    });
    return () => anim.current?.stop();
  }, [index, visible, current?.id]);

  if (!current) return null;

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Image source={{ uri: resolveStoryImage(current.imageUrl) }} style={styles.image} resizeMode="contain" />

        {/* Tap zones: left third = previous, right two-thirds = next */}
        <Pressable style={styles.tapLeft} onPress={goPrev} />
        <Pressable style={styles.tapRight} onPress={goNext} />

        {/* Progress segments */}
        <View style={[styles.progressRow, { top: insets.top + 8 }]}>
          {stories.map((s, i) => (
            <View key={s.id} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < index
                        ? '100%'
                        : i === index
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={[styles.header, { top: insets.top + 20 }]}>
          <View style={styles.authorRow}>
            {authorAvatar ? <Text style={styles.authorAvatar}>{authorAvatar}</Text> : null}
            {authorName ? <Text style={styles.authorName}>{authorName}</Text> : null}
          </View>
          <View style={styles.headerActions}>
            {onDelete && (
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => onDelete(current.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Delete story"
              >
                <Text style={styles.headerIcon}>🗑️</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.headerClose}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Caption */}
        {current.caption ? (
          <View style={[styles.captionWrap, { bottom: insets.bottom + 40 }]} pointerEvents="none">
            <Text style={styles.caption}>{current.caption}</Text>
          </View>
        ) : null}

        {/* Only ever true for your own story, per how ForestGallery wires onDelete */}
        {onDelete && (
          <TouchableOpacity
            style={[styles.viewersChip, { bottom: insets.bottom + 16 }]}
            onPress={() => setViewersOpen(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewersChipText}>👁 {current.viewCount ?? 0} viewed</Text>
          </TouchableOpacity>
        )}

        {/* Liking your own story isn't a thing, mirroring how the chip above is own-story-only */}
        {!onDelete && (
          <View style={[styles.likeWrap, { bottom: insets.bottom + 16 }]}>
            <LikeButton
              liked={!!current.likedByMe}
              count={current.likeCount}
              isToggling={toggleStoryLike.isPending}
              onToggle={() => toggleStoryLike.mutate({ id: current.id, liked: !!current.likedByMe })}
            />
          </View>
        )}
      </View>

      {onDelete && (
        <StoryViewersSheet visible={viewersOpen} storyId={current.id} onClose={() => setViewersOpen(false)} />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Full-bleed media viewer, not a cream Sheet surface — an immersive near-black backdrop is
  // intentional here (mirrors Instagram/WhatsApp-style story viewers) rather than a bug to fix,
  // but it's now COLORS.nightDeep (the app's darkest night token) instead of a bare '#000' literal.
  container: {
    flex: 1,
    backgroundColor: COLORS.nightDeep,
    justifyContent: 'center',
  },
  image: {
    width: SW,
    height: SH,
  },
  tapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SW * 0.33,
  },
  tapRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SW * 0.67,
  },
  progressRow: {
    position: 'absolute',
    left: 10,
    right: 10,
    flexDirection: 'row',
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: ON_DARK_SURFACE.muted,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
    backgroundColor: ON_DARK_SURFACE.primary,
  },
  header: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  authorAvatar: {
    fontSize: 22,
  },
  authorName: {
    ...TYPOGRAPHY.h4,
    color: ON_DARK_SURFACE.primary,
    textShadowColor: COLORS.overlay,
    textShadowRadius: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  // Matches Sheet's closeButtonNight treatment (translucent circular chip) instead of bare
  // text-on-image, so the control reads as a tappable affordance against busy photo content.
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 16,
  },
  headerClose: {
    color: ON_DARK_SURFACE.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  viewersChip: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  viewersChipText: {
    color: ON_DARK_SURFACE.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  likeWrap: {
    position: 'absolute',
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  captionWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  caption: {
    ...TYPOGRAPHY.h4,
    color: ON_DARK_SURFACE.primary,
    textAlign: 'center',
    backgroundColor: COLORS.overlay,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
});
