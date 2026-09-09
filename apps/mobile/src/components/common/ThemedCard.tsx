import React, { type RefObject } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { BorderCard } from './BorderCard';
import { RADIUS } from '../../constants/theme';
import type { TimeTheme } from '../../hooks/useTimeTheme';

/**
 * Flat, brown-bordered card used on the Corporate/Group/NGO dashboards' non-hero sections.
 * `theme`/`blurTarget` are accepted but unused — kept so call sites (which still pass them from
 * the surrounding time-of-day theme) don't need to change.
 */
export function ThemedCard({
  children,
  style,
  borderRadius = RADIUS.lg,
  noPadding = false,
}: {
  theme?: TimeTheme;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  noPadding?: boolean;
  blurTarget?: RefObject<View | null>;
}) {
  return (
    <BorderCard style={style} borderRadius={borderRadius} noPadding={noPadding}>
      {children}
    </BorderCard>
  );
}
