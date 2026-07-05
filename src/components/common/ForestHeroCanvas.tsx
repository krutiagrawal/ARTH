import React, { useMemo } from 'react';
import {
  Canvas,
  Path,
  Circle,
  Group,
  LinearGradient as SkiaLinearGradient,
  RadialGradient,
  Skia,
  vec,
  Fill,
  RoundedRect,
  type SkPath,
} from '@shopify/react-native-skia';
import type { TimeTheme } from '../../hooks/useTimeTheme';
import { drawTreePath } from '../../utils/skiaTrees';
import type { ForestTreeShape } from '../../constants/forestThemePalettes';

const TREE_SHAPES: ForestTreeShape[] = ['pine', 'oak', 'birch', 'pine', 'fruit'];

// Fixed relative star positions (top 55% of the band), reused across renders via useMemo.
const STAR_SPOTS: [number, number][] = [
  [0.08, 0.10], [0.20, 0.22], [0.33, 0.08], [0.48, 0.28],
  [0.62, 0.12], [0.74, 0.24], [0.88, 0.10], [0.94, 0.30],
];

/** A gently undulating hill silhouette spanning the full width, its top edge wobbling around
 * `baseY` by `amplitude`, filled solid down to the bottom of the canvas. */
function buildHillPath(width: number, height: number, baseY: number, amplitude: number, seedOffset: number): SkPath {
  const bumps = 4;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= bumps; i++) {
    const x = (width / bumps) * i;
    const y = baseY - amplitude - Math.sin(i * 1.6 + seedOffset) * amplitude;
    points.push({ x, y });
  }

  const path = Skia.Path.Make();
  path.moveTo(0, height);
  path.lineTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    path.quadTo(prev.x, prev.y, midX, midY);
  }
  const last = points[points.length - 1];
  path.lineTo(last.x, last.y);
  path.lineTo(width, height);
  path.close();
  return path;
}

export function ForestHeroCanvas({
  theme,
  width,
  height,
  treeCount = 10,
}: {
  theme: TimeTheme;
  width: number;
  height: number;
  treeCount?: number;
}) {
  const celestialCx = width * 0.82;
  const celestialCy = height * theme.celestialY;

  // Depth is exaggerated well beyond what a 200px widget needed — the amplitude and baseY spread
  // scale with the (now much taller) hero band so the three layers read as distinct rolling
  // hills rather than one flat, barely-visible strip along the bottom edge.
  const hillPaths = useMemo(
    () => [
      buildHillPath(width, height, height * 0.52, height * 0.055, 0.5),
      buildHillPath(width, height, height * 0.66, height * 0.05, 2.1),
      buildHillPath(width, height, height * 0.80, height * 0.045, 4.4),
    ],
    [width, height]
  );

  const lakePath = useMemo(() => {
    const p = Skia.Path.Make();
    const top = height * 0.74;
    p.moveTo(width * 0.1, height);
    p.lineTo(width * 0.2, top);
    p.lineTo(width * 0.8, top);
    p.lineTo(width * 0.9, height);
    p.close();
    return p;
  }, [width, height]);

  const clouds = useMemo(
    () => [
      { cx: width * 0.18, cy: height * 0.16, scale: 1 },
      { cx: width * 0.42, cy: height * 0.1, scale: 0.8 },
      { cx: width * 0.62, cy: height * 0.2, scale: 0.65 },
    ],
    [width, height]
  );

  const trees = useMemo(() => {
    const ridgeY = height * 0.79;
    return Array.from({ length: treeCount }, (_, i) => {
      const t = (i + 0.5) / treeCount;
      const jitterY = Math.sin(i * 2.3) * height * 0.02;
      return {
        x: width * (0.04 + t * 0.92),
        groundY: ridgeY + jitterY,
        h: height * (0.1 + (i % 3) * 0.035),
        w: height * (0.06 + (i % 3) * 0.02),
        type: TREE_SHAPES[i % TREE_SHAPES.length],
      };
    });
  }, [width, height, treeCount]);

  return (
    <Canvas style={{ width, height }}>
      {/* Sky */}
      <Fill>
        <SkiaLinearGradient start={vec(width / 2, 0)} end={vec(width / 2, height)} colors={theme.skyColors} />
      </Fill>

      {/* Stars */}
      {theme.hasStars &&
        STAR_SPOTS.map(([sx, sy], i) => (
          <Circle
            key={`star-${i}`}
            cx={width * sx}
            cy={height * sy * 0.55}
            r={1.4}
            color={theme.starColor}
            opacity={theme.starOpacity}
          />
        ))}

      {/* Clouds */}
      {theme.hasClouds &&
        clouds.map((c, i) => (
          <Group key={`cloud-${i}`} opacity={0.85}>
            <Circle cx={c.cx} cy={c.cy} r={16 * c.scale} color={theme.cloudColor} />
            <Circle cx={c.cx + 16 * c.scale} cy={c.cy - 6 * c.scale} r={20 * c.scale} color={theme.cloudColor} />
            <Circle cx={c.cx + 34 * c.scale} cy={c.cy} r={14 * c.scale} color={theme.cloudColor} />
          </Group>
        ))}

      {/* Sun / Moon + glow */}
      <Group>
        <Circle cx={celestialCx} cy={celestialCy} r={theme.glowRadius}>
          <RadialGradient c={vec(celestialCx, celestialCy)} r={theme.glowRadius} colors={[theme.glowColor, 'rgba(0,0,0,0)']} />
        </Circle>
        <Circle cx={celestialCx} cy={celestialCy} r={22} color={theme.celestialColor} />
      </Group>

      {/* Hills (far -> near) — far layer is semi-transparent so the sky shows through it
          (atmospheric haze), giving the three layers visible depth instead of reading as one
          flat band of similar-toned color. */}
      <Path path={hillPaths[0]} color={theme.hillColors[0]} opacity={0.6} />
      <Path path={hillPaths[1]} color={theme.hillColors[1]} opacity={0.85} />
      <Path path={hillPaths[2]} color={theme.hillColors[2]} />

      {/* Lake / river */}
      <Path path={lakePath}>
        <SkiaLinearGradient start={vec(width / 2, height * 0.74)} end={vec(width / 2, height)} colors={theme.lakeColors} />
      </Path>
      <Circle cx={celestialCx} cy={height * 0.82} r={height * 0.024} color={theme.lakeHighlight} />

      {/* Tree silhouettes along the near ridge */}
      {trees.map((tree, i) => {
        const { path, trunkPath } = drawTreePath(tree.type, tree.x, tree.h, tree.w, tree.groundY);
        return (
          <Group key={`tree-${i}`}>
            <Path path={trunkPath} color={theme.treeSilhouetteColor} />
            <Path path={path} color={theme.treeSilhouetteColor} />
          </Group>
        );
      })}

      {/* Seam strip so the near hill color reaches the very bottom edge */}
      <RoundedRect x={0} y={height - 6} width={width} height={6} r={0} color={theme.hillColors[2]} />
    </Canvas>
  );
}
