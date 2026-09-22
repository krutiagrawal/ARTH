import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { StoryRing, type StoryRingStatus } from './StoryRing';
import { StoryViewer } from '../stories/StoryViewer';
import { useUserStories, useNgoStories } from '../../hooks/useApiQueries';
import { useMarkStoryViewed } from '../../hooks/useSocialQueries';

interface StoryAvatarProps {
  /** 'user' and 'ngo' open a story; nursery/group avatars fall through to `onPress` unchanged,
   * since there's no per-author story fetch for those kinds yet. */
  authorKind: 'user' | 'ngo' | 'nursery' | 'group';
  authorId: string;
  authorName: string;
  authorAvatarEmoji?: string;
  /** Undefined/null (still loading, or no active story) falls back to `onPress`. */
  status?: StoryRingStatus | null;
  size: number;
  borderRadius?: number;
  children: React.ReactNode;
  /** The screen's normal avatar-tap behavior (e.g. navigate to profile) — used whenever there's
   * no story to open. */
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * Drop-in replacement for wrapping an avatar in `<StoryRing>` — same ring, but tapping it opens
 * that author's active story (any page, any list) instead of only running `onPress`. Falls back
 * to `onPress` when there's nothing to show (no story, or not a user avatar), so every existing
 * call site's original tap behavior (open profile, etc.) still works once the story's been seen
 * or for author kinds without story support yet.
 */
export function StoryAvatar({
  authorKind,
  authorId,
  authorName,
  authorAvatarEmoji,
  status,
  size,
  borderRadius,
  children,
  onPress,
  disabled,
}: StoryAvatarProps) {
  const [open, setOpen] = useState(false);
  const canOpenStory = (authorKind === 'user' || authorKind === 'ngo') && !!status?.hasStory;

  // Only fetches once actually tapped open — not on mount — so a screen full of avatars doesn't
  // fire a story request per row. Both hooks are always called (Rules of Hooks); each is gated by
  // its own `enabled` so only the one matching this avatar's kind actually fires.
  const { data: userStories = [] } = useUserStories(authorKind === 'user' && open ? authorId : null);
  const { data: ngoStories = [] } = useNgoStories(authorKind === 'ngo' && open ? authorId : null);
  const stories = authorKind === 'ngo' ? ngoStories : userStories;
  const markViewed = useMarkStoryViewed();

  const handlePress = () => {
    if (canOpenStory) {
      setOpen(true);
    } else {
      onPress?.();
    }
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={canOpenStory || onPress ? 0.85 : 1}
        onPress={handlePress}
        disabled={disabled || (!canOpenStory && !onPress)}
      >
        <StoryRing status={status} size={size} borderRadius={borderRadius}>
          {children}
        </StoryRing>
      </TouchableOpacity>

      {open && (
        <StoryViewer
          visible
          stories={stories}
          authorName={authorName}
          authorAvatar={authorAvatarEmoji}
          onView={(id) => markViewed.mutate(id)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
