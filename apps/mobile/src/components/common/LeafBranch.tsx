import React from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

/**
 * The botanical branch that sits top-right on the NGO section headers.
 *
 * Replaces a 🌿 emoji rendered at `opacity: 0.07`, which was so faint it read as a smudge. Drawn
 * as SVG so it stays crisp at any size and so the tone is a real colour we control — the
 * reference art is a solid sage at roughly 45% opacity, i.e. several times more present than the
 * emoji watermark was.
 */

const LEAF_SAGE = '#A8B88A';
const STEM_SAGE = '#8FA274';

const STEMS: string[] = [
  'M34 104 Q 88 53, 142 26',
  'M8 138 Q 70 107, 132 100',
];

/**
 * [x, y, rotation°, length, halfWidth] per leaf — laid out in pairs down each stem, one leaf to
 * either side, shrinking toward the tip. Sizes and spacing matter more than they look: at the
 * first attempt the leaves were fat ellipses packed close together and merged into one shapeless
 * blob, so each is now a pointed lens with visible sky between it and its neighbours.
 */
const LEAVES: [number, number, number, number, number][] = [
  [51.3, 88.6, -81.8, 27, 6.2],
  [54.3, 91.6, 8.2, 25, 5.8],
  [70.7, 72.2, -81.8, 25, 5.9],
  [73.7, 75.2, 8.2, 23, 5.5],
  [90.2, 57.5, -81.8, 23, 5.5],
  [93.2, 60.5, 8.2, 21, 5.1],
  [109.6, 44.5, -81.8, 21, 5.2],
  [112.6, 47.5, 8.2, 19, 4.8],
  [126.9, 34.4, -81.8, 19, 4.8],
  [129.9, 37.4, 8.2, 17, 4.4],
  [142.0, 26.0, -35.8, 20, 5.0],
  [30.3, 127.9, -65.0, 28, 6.4],
  [33.3, 130.9, 25.0, 26, 6.0],
  [55.1, 118.0, -65.0, 26, 6.0],
  [58.1, 121.0, 25.0, 24, 5.6],
  [79.9, 110.1, -65.0, 24, 5.6],
  [82.9, 113.1, 25.0, 22, 5.2],
  [104.7, 104.5, -65.0, 22, 5.2],
  [107.7, 107.5, 25.0, 20, 4.8],
  [132.0, 100.0, -17.0, 20, 5.0],
];

/** A pointed leaf, drawn from its base at the origin out along +x. */
function leafPath(length: number, halfWidth: number): string {
  const L = length;
  const W = halfWidth;
  return (
    `M0 0 C ${(L * 0.32).toFixed(1)} ${(-W).toFixed(1)}, ` +
    `${(L * 0.72).toFixed(1)} ${(-W * 0.8).toFixed(1)}, ${L} 0 ` +
    `C ${(L * 0.72).toFixed(1)} ${(W * 0.8).toFixed(1)}, ` +
    `${(L * 0.32).toFixed(1)} ${W.toFixed(1)}, 0 0 Z`
  );
}

export function LeafBranch({
  size = 150,
  color = LEAF_SAGE,
  opacity = 0.45,
  style,
}: {
  size?: number;
  color?: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 160 160" opacity={opacity}>
        {/* Stems first, so the leaves overlap them the way the reference art does. */}
        <G>
          {STEMS.map((d, i) => (
            <Path key={i} d={d} stroke={STEM_SAGE} strokeWidth={2.2} fill="none" strokeLinecap="round" />
          ))}
        </G>
        <G>
          {LEAVES.map(([x, y, rotation, length, halfWidth], i) => (
            <Path
              key={i}
              d={leafPath(length, halfWidth)}
              fill={color}
              transform={`translate(${x} ${y}) rotate(${rotation})`}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, right: -14 },
});
