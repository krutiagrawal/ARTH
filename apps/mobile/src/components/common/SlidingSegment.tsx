import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';

interface Option<T extends string> {
  key: T;
  label: string;
}

interface SlidingSegmentProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (key: T) => void;
  /** Items share the row's width equally (view toggles) instead of hugging their label (sort chips). */
  fill?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SLIDE_MS = 240;

/**
 * Single-select options with no outline of their own – one brown outline sits on the selected
 * option and slides to the next when the selection changes.
 */
export function SlidingSegment<T extends string>({ options, value, onChange, fill, small, style }: SlidingSegmentProps<T>) {
  const layouts = useRef<Record<string, { x: number; width: number; height: number }>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const height = useSharedValue(0);
  const opacity = useSharedValue(0);
  const placed = useRef(false);

  const moveTo = (key: string, animate: boolean) => {
    const l = layouts.current[key];
    if (!l) return;
    height.value = l.height;
    if (animate) {
      const cfg = { duration: SLIDE_MS, easing: Easing.out(Easing.cubic) };
      x.value = withTiming(l.x, cfg);
      width.value = withTiming(l.width, cfg);
    } else {
      x.value = l.x;
      width.value = l.width;
    }
    opacity.value = 1;
  };

  // Slide whenever the selected option changes (after the first placement).
  useEffect(() => {
    if (placed.current) moveTo(value, true);
  }, [value]);

  const onItemLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x: lx, width: lw, height: lh } = e.nativeEvent.layout;
    layouts.current[key] = { x: lx, width: lw, height: lh };
    if (!placed.current && Object.keys(layouts.current).length === options.length) {
      placed.current = true;
      moveTo(value, false);
    } else if (placed.current && key === value) {
      moveTo(value, false);
    }
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width: width.value,
    height: height.value,
    transform: [{ translateX: x.value }],
  }));

  return (
    <View style={[styles.row, fill && styles.rowFill, style]}>
      <Animated.View pointerEvents="none" style={[styles.indicator, small && styles.indicatorSmall, indicatorStyle]} />
      {options.map((o) => (
        <TouchableOpacity
          key={o.key}
          activeOpacity={0.7}
          onPress={() => onChange(o.key)}
          onLayout={onItemLayout(o.key)}
          style={[styles.item, small && styles.itemSmall, fill && styles.itemFill]}
          accessibilityRole="button"
          accessibilityState={{ selected: o.key === value }}
        >
          <Text style={[styles.label, small && styles.labelSmall]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowFill: { alignSelf: 'stretch' },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    borderRadius: 14,
  },
  indicatorSmall: { borderRadius: 999 },
  item: { paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  itemSmall: { paddingHorizontal: 10, paddingVertical: 4 },
  itemFill: { flex: 1 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  labelSmall: { fontSize: 12 },
});
