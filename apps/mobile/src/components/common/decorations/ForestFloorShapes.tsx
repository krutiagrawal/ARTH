import React from 'react';
import Svg, { Ellipse, Circle, Path, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import type { DecorationShapeProps } from './CanopyShapes';

/** A stack of smooth boulders/rocks with soft top-light shading and a ground shadow. */
export function RockStackShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <LinearGradient id="rockG" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset="45%" stopColor={color} />
          <Stop offset="100%" stopColor={color} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={30} cy={52} rx={22} ry={5} fill="#000000" opacity={0.12} />
      <Path d="M8 50 Q6 38 18 36 Q30 34 32 46 Q32 52 20 52 Q10 52 8 50 Z" fill="url(#rockG)" />
      <Path d="M30 50 Q28 40 40 38 Q52 38 52 48 Q52 52 42 52 Q32 52 30 50 Z" fill={color} />
      <Path d="M20 38 Q18 26 30 24 Q44 24 44 36 Q44 40 32 40 Q22 40 20 38 Z" fill="url(#rockG)" />
      <Path d="M26 28 Q30 26 36 28" stroke="#FFFFFF" strokeWidth={1.4} opacity={0.35} fill="none" />
    </Svg>
  );
}

/** A classic toadstool — rounded cap on a stem, with a few pale spot accents. */
export function MushroomCapShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Ellipse cx={30} cy={54} rx={14} ry={3} fill="#000000" opacity={0.1} />
      <Rect x={26} y={36} width={8} height={18} rx={4} fill="#F0E6D2" />
      <Path d="M12 36 Q12 16 30 14 Q48 16 48 36 Q30 44 12 36 Z" fill={color} />
      <Circle cx={22} cy={26} r={2.6} fill="#FFFFFF" opacity={0.75} />
      <Circle cx={34} cy={22} r={2} fill="#FFFFFF" opacity={0.7} />
      <Circle cx={40} cy={30} r={2.3} fill="#FFFFFF" opacity={0.7} />
      <Circle cx={27} cy={33} r={1.8} fill="#FFFFFF" opacity={0.6} />
    </Svg>
  );
}

/** A bracket/shelf fungus fanning sideways off a small log stub. */
export function ShelfFungiShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Rect x={8} y={40} width={44} height={10} rx={5} fill="#5C4028" />
      <Path d="M14 40 Q14 24 30 22 Q44 24 42 40 Z" fill={color} opacity={0.95} />
      <Path d="M18 40 Q18 30 30 28 Q40 30 38 40 Z" fill={color} opacity={0.7} />
    </Svg>
  );
}

/** A cluster of small round cream puffball mushrooms. */
export function PuffballShape({ color, size }: DecorationShapeProps) {
  const puffs = [[20, 40, 9], [34, 44, 7], [44, 38, 6]];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Ellipse cx={30} cy={50} rx={22} ry={3} fill="#000000" opacity={0.08} />
      {puffs.map(([x, y, r], i) => (
        <Circle key={i} cx={x} cy={y} r={r} fill={color} />
      ))}
      <Circle cx={17} cy={37} r={1.6} fill="#FFFFFF" opacity={0.5} />
    </Svg>
  );
}

/** A mound of overlapping fallen-leaf silhouettes. */
export function LeafPileShape({ color, size }: DecorationShapeProps) {
  const leaves = [
    { x: 18, y: 42, r: -18 },
    { x: 30, y: 46, r: 8 },
    { x: 42, y: 40, r: 22 },
    { x: 24, y: 36, r: -6 },
    { x: 36, y: 34, r: 14 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {leaves.map((leaf, i) => (
        <Ellipse
          key={i}
          cx={leaf.x}
          cy={leaf.y}
          rx={9}
          ry={5.5}
          fill={color}
          opacity={0.85 + (i % 2) * 0.1}
          transform={`rotate(${leaf.r} ${leaf.x} ${leaf.y})`}
        />
      ))}
    </Svg>
  );
}

/** A scattered cluster of rounded pebbles in varying grey tones. */
export function PebbleClusterShape({ color, size }: DecorationShapeProps) {
  const pebbles = [
    { x: 16, y: 42, rx: 7, ry: 5, o: 1 },
    { x: 30, y: 46, rx: 9, ry: 6, o: 0.85 },
    { x: 44, y: 40, rx: 6, ry: 5, o: 0.9 },
    { x: 24, y: 34, rx: 5, ry: 4, o: 0.75 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {pebbles.map((p, i) => (
        <Ellipse key={i} cx={p.x} cy={p.y} rx={p.rx} ry={p.ry} fill={color} opacity={p.o} />
      ))}
    </Svg>
  );
}
