import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { COLORS } from '../../constants/colors';

export interface StoryRingStatus {
  hasStory: boolean;
  seen: boolean;
}

interface StoryRingProps {
  /** Undefined while still loading, or when the author has no story to show at all. */
  status?: StoryRingStatus | null;
  /** Width/height of the avatar this wraps. */
  size: number;
  /** Avatar's own corner radius. Defaults to `size / 2` (a full circle). */
  borderRadius?: number;
  ringWidth?: number;
  /** Gap between the avatar and the ring. */
  gap?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * Wraps an avatar with a colored ring when its author has an active story — sage green for an
 * unseen one, a faded brown once every active story from them has been viewed (kept translucent
 * so it stays clearly distinct from the solid unseen ring). Renders children unchanged (no extra
 * sizing) when there's no active story, so most avatars are unaffected.
 */
export function StoryRing({ status, size, borderRadius, ringWidth = 2.5, gap = 2, style, children }: StoryRingProps) {
  if (!status?.hasStory) return <>{children}</>;

  const radius = borderRadius ?? size / 2;
  const outerSize = size + (ringWidth + gap) * 2;
  const outerRadius = radius + ringWidth + gap;

  return (
    <View
      style={[
        {
          width: outerSize,
          height: outerSize,
          borderRadius: outerRadius,
          borderWidth: ringWidth,
          borderColor: status.seen ? 'rgba(139,107,71,0.35)' : COLORS.sage,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
