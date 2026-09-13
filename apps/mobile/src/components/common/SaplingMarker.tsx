import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../constants/colors';

/**
 * The live-delivery-tracking marker — a small sapling instead of a bike/car icon, echoing the
 * app's own botanical iconography (see LeafBranch.tsx's leaf shapes) rather than a generic pin.
 * Wrapped in a white "pin bubble" circle so it reads clearly against any map tile color, matching
 * the pin-bubble style MapScreen.tsx's custom markers already use (that screen uses a different
 * map library — only the visual language is shared, not any code).
 */

/** A pointed leaf, drawn from its base at the origin out along +y (upright). Same recipe as
 * LeafBranch.tsx's leafPath, just oriented vertically for a small upright sprig. */
function leafPath(length: number, halfWidth: number): string {
  const L = length;
  const W = halfWidth;
  return (
    `M0 0 C ${(-W).toFixed(1)} ${(L * 0.32).toFixed(1)}, ` +
    `${(-W * 0.8).toFixed(1)} ${(L * 0.72).toFixed(1)}, 0 ${L} ` +
    `C ${(W * 0.8).toFixed(1)} ${(L * 0.72).toFixed(1)}, ` +
    `${W.toFixed(1)} ${(L * 0.32).toFixed(1)}, 0 0 Z`
  );
}

export function SaplingMarker({ size = 30 }: { size?: number }) {
  const bubbleSize = size + 12;
  return (
    <View style={[styles.bubble, { width: bubbleSize, height: bubbleSize, borderRadius: bubbleSize / 2 }]}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {/* Soil/pot base */}
        <Path d="M11 33 L14 24 L26 24 L29 33 Z" fill={COLORS.earth} />
        <Path d="M9 33 H31 V36 H9 Z" fill={COLORS.earth} opacity={0.85} />
        {/* Upright sprig — a center leaf plus two angled side leaves, same leafPath curve as the
            app's other botanical iconography. */}
        <Path d={leafPath(15, 4.5)} fill={COLORS.forest} transform="translate(20 24) rotate(180)" />
        <Path d={leafPath(11, 3.6)} fill={COLORS.sage} transform="translate(20 24) rotate(150)" />
        <Path d={leafPath(11, 3.6)} fill={COLORS.sage} transform="translate(20 24) rotate(-150)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
