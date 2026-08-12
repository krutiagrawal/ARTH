import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withSpring } from 'react-native-reanimated';
import { DECORATION_COMPONENTS, HAND_DRAWN_STROKE_WIDTH } from '../../constants/decorationCatalog';
import { useUpdateDecorationPlacement, useDeleteDecorationPlacement } from '../../hooks/useApiQueries';
import { pointsToSmoothPathD, pointsBoundingBox } from '../../utils/smoothPath';
import type { ApiDecorationPlacement } from '../../api/decorations';

const BASE_SPRITE_SIZE = 46;
/** The sprite's touch area is deliberately much larger than the drawn shape so that a two-finger
 * pinch/rotate can land on it. It stays a constant size (only the inner shape scales), so grabbing
 * it with two fingers works at any zoom level. */
const HIT_SIZE = 104;
const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
/** Keep at least this many px of a sprite on-screen so it can never be dragged fully out of reach. */
const EDGE_MARGIN = 24;
/** Extra hit-area margin (each side) around a hand-drawn shape's own bounding box, so a thin drawn
 * line still has room for a two-finger pinch even though its box can otherwise be any size. */
const PATH_HIT_MARGIN = 32;
/** How much wider the soft shadow stroke is than the main stroke, matching the pre-made river/stream
 * icons' triple-stroke look (shadow + color + highlight). */
const SHADOW_STROKE_EXTRA = 6;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/** Precomputed local (box-relative) SVG geometry for a hand-drawn river/stream placement. */
function usePathRender(placement: ApiDecorationPlacement, canvasWidth: number, canvasHeight: number) {
  return useMemo(() => {
    const path = placement.path;
    if (!path || path.length < 2) return null;

    const strokeWidth = HAND_DRAWN_STROKE_WIDTH[placement.decorationType.variant] ?? 10;
    const pad = (strokeWidth + SHADOW_STROKE_EXTRA) / 2 + 4;

    const relPx = path.map((p) => ({ x: p.x * canvasWidth, y: p.y * canvasHeight }));
    const bbox = pointsBoundingBox(relPx);
    const boxWidth = bbox.width + pad * 2;
    const boxHeight = bbox.height + pad * 2;
    const localPoints = relPx.map((p) => ({ x: p.x - bbox.minX + pad, y: p.y - bbox.minY + pad }));
    const d = pointsToSmoothPathD(localPoints);

    return { boxWidth, boxHeight, d, strokeWidth };
  }, [placement.path, placement.decorationType.variant, canvasWidth, canvasHeight]);
}

function DraggableDecoration({
  placement,
  editable,
  canvasWidth,
  canvasHeight,
}: {
  placement: ApiDecorationPlacement;
  editable: boolean;
  canvasWidth: number;
  canvasHeight: number;
}) {
  const pathRender = usePathRender(placement, canvasWidth, canvasHeight);
  const isPath = !!pathRender;
  const Shape = isPath ? null : DECORATION_COMPONENTS[placement.decorationType.variant];

  const spriteWidth = pathRender?.boxWidth ?? BASE_SPRITE_SIZE;
  const spriteHeight = pathRender?.boxHeight ?? BASE_SPRITE_SIZE;
  const hitWidth = pathRender ? pathRender.boxWidth + PATH_HIT_MARGIN * 2 : HIT_SIZE;
  const hitHeight = pathRender ? pathRender.boxHeight + PATH_HIT_MARGIN * 2 : HIT_SIZE;

  const translateX = useSharedValue(placement.positionX * canvasWidth);
  const translateY = useSharedValue(placement.positionY * canvasHeight);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue(placement.scale ?? 1);
  const startScale = useSharedValue(1);
  const rotation = useSharedValue(placement.rotation ?? 0);
  const startRotation = useSharedValue(0);
  const pressScale = useSharedValue(1);

  const updateMutation = useUpdateDecorationPlacement();
  const deleteMutation = useDeleteDecorationPlacement();

  useEffect(() => {
    translateX.value = placement.positionX * canvasWidth;
    translateY.value = placement.positionY * canvasHeight;
    scale.value = placement.scale ?? 1;
    rotation.value = placement.rotation ?? 0;
  }, [placement.positionX, placement.positionY, placement.scale, placement.rotation, canvasWidth, canvasHeight]);

  const persistPosition = (x: number, y: number) => {
    updateMutation.mutate({ id: placement.id, positionX: x / canvasWidth, positionY: y / canvasHeight });
  };

  const persistTransform = (s: number, r: number) => {
    updateMutation.mutate({ id: placement.id, scale: s, rotation: ((r % 360) + 360) % 360 });
  };

  const pan = Gesture.Pan()
    .enabled(editable)
    .averageTouches(true)
    .onStart(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
      pressScale.value = withSpring(1.08);
    })
    .onUpdate((e) => {
      translateX.value = clamp(startX.value + e.translationX, EDGE_MARGIN, canvasWidth - EDGE_MARGIN);
      translateY.value = clamp(startY.value + e.translationY, EDGE_MARGIN, canvasHeight - EDGE_MARGIN);
    })
    .onEnd(() => {
      pressScale.value = withSpring(1);
      runOnJS(persistPosition)(translateX.value, translateY.value);
    });

  const pinch = Gesture.Pinch()
    .enabled(editable)
    .onStart(() => {
      startScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = clamp(startScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      runOnJS(persistTransform)(scale.value, rotation.value);
    });

  const rotate = Gesture.Rotation()
    .enabled(editable)
    .onStart(() => {
      startRotation.value = rotation.value;
    })
    .onUpdate((e) => {
      // e.rotation is in radians; convert accumulated delta to degrees
      rotation.value = startRotation.value + (e.rotation * 180) / Math.PI;
    })
    .onEnd(() => {
      runOnJS(persistTransform)(scale.value, rotation.value);
    });

  const composed = Gesture.Simultaneous(pan, pinch, rotate);

  // Outer touch area: constant size, only translated/rotated (+ a small press bump). Keeping it
  // unscaled means two fingers can always land on it regardless of the sprite's zoom.
  const outerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value - hitWidth / 2 },
      { translateY: translateY.value - hitHeight / 2 },
      { rotate: `${rotation.value}deg` },
      { scale: pressScale.value },
    ],
  }));

  // Inner shape carries the user-controlled scale.
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // The delete badge is anchored to the shape corner (inside the scaled shapeWrap) but counter-scales
  // by 1/scale so it renders at a constant on-screen size no matter how big/small the element is.
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 / scale.value }],
  }));

  if (!isPath && !Shape) return null;

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        style={[styles.hitArea, { width: hitWidth, height: hitHeight }, outerStyle]}
        pointerEvents={editable ? 'auto' : 'none'}
      >
        <Animated.View style={[{ width: spriteWidth, height: spriteHeight }, styles.shapeWrap, innerStyle]}>
          {isPath && pathRender ? (
            <Svg width={pathRender.boxWidth} height={pathRender.boxHeight} viewBox={`0 0 ${pathRender.boxWidth} ${pathRender.boxHeight}`}>
              <Path
                d={pathRender.d}
                stroke="#6B8E7A"
                strokeWidth={pathRender.strokeWidth + SHADOW_STROKE_EXTRA}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.3}
              />
              <Path
                d={pathRender.d}
                stroke={placement.decorationType.colorway}
                strokeWidth={pathRender.strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d={pathRender.d}
                stroke="#FFFFFF"
                strokeWidth={Math.max(2, pathRender.strokeWidth * 0.18)}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.4}
              />
            </Svg>
          ) : (
            Shape && <Shape color={placement.decorationType.colorway} size={BASE_SPRITE_SIZE} />
          )}
          {editable && (
            <Animated.View style={[styles.deleteBadge, badgeStyle]}>
              <TouchableOpacity
                style={styles.deleteBadgeTouch}
                onPress={() => deleteMutation.mutate(placement.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.deleteBadgeText}>×</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

/** Renders every placed forest decoration as a draggable/resizable/rotatable sprite layered on top
 * of the Skia canvas — same technique as the existing FloatingLeaf/BirdAnimation overlay, since Skia
 * canvas nodes don't have convenient per-shape touch/drag support. `editable` toggles whether
 * decorations can be moved/pinched/rotated/deleted (decorate mode) or just sit there (normal viewing).
 * Elements are placed freely anywhere on the canvas — no per-zone constraints. Hand-drawn river/stream
 * placements (with a `path`) render their own dynamically-sized SVG instead of a fixed catalog icon,
 * but share all the same move/resize/rotate/delete gesture code. */
export function DecorationOverlay({
  placements,
  editable,
  canvasWidth,
  canvasHeight,
}: {
  placements: ApiDecorationPlacement[];
  editable: boolean;
  canvasWidth: number;
  canvasHeight: number;
}) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={editable ? 'box-none' : 'none'}>
      {placements.map((placement) => (
        <DraggableDecoration
          key={placement.id}
          placement={placement}
          editable={editable}
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shapeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#C0392B',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  deleteBadgeTouch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 14,
  },
});
