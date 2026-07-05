import React from 'react';
import Svg, { Ellipse, Circle, Path, Defs, RadialGradient, LinearGradient, Stop, G } from 'react-native-svg';
import type { DecorationShapeProps } from './CanopyShapes';

/** A still round pond with soft shimmer highlight and ripple ring. */
export function PondRoundShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="pondGrad" cx="35%" cy="35%" r="70%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="100%" stopColor={color} stopOpacity={1} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={30} cy={34} rx={24} ry={14} fill={color} opacity={0.5} />
      <Ellipse cx={30} cy={34} rx={20} ry={11} fill="url(#pondGrad)" />
      <Ellipse cx={30} cy={34} rx={12} ry={6.5} fill="none" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1} />
    </Svg>
  );
}

/** A curved flowing stream segment with a lighter highlight running along it. */
export function StreamCurveShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Path d="M4 44 Q20 20 30 30 Q42 42 56 20" stroke={color} strokeWidth={12} strokeLinecap="round" fill="none" opacity={0.85} />
      <Path d="M4 44 Q20 20 30 30 Q42 42 56 20" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" fill="none" opacity={0.4} />
    </Svg>
  );
}

/** Round lily pads (classic notched-circle silhouette) with a small flower accent. */
export function LilyPadShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Ellipse cx={30} cy={40} rx={22} ry={10} fill="#4A90A4" opacity={0.35} />
      <Path d="M18 36 L28 30 A10 10 0 1 1 18 36 Z" fill={color} />
      <Path d="M40 42 L48 38 A7 7 0 1 1 40 42 Z" fill={color} opacity={0.9} />
      <Circle cx={24} cy={26} r={3.5} fill="#F4B8C8" />
      <Circle cx={24} cy={26} r={1.4} fill="#E8C23A" />
    </Svg>
  );
}

/** A cluster of thin reed blades, some tipped with a small cattail head. */
export function ReedClusterShape({ color, size }: DecorationShapeProps) {
  const blades = [-16, -8, 0, 8, 16];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {blades.map((offset, i) => (
        <Path
          key={i}
          d={`M30 54 Q${30 + offset * 0.4} ${34} ${30 + offset} ${12 + Math.abs(offset)}`}
          stroke={color}
          strokeWidth={2.2}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      <Ellipse cx={30} cy={20} rx={2.6} ry={7} fill="#6B4A2E" />
      <Ellipse cx={22} cy={24} rx={2.2} ry={6} fill="#6B4A2E" />
    </Svg>
  );
}

/** A single fish in side profile — the `color` prop tints it (koi / goldfish / clownfish variants). */
export function FishShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <LinearGradient id="fishBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.4} />
          <Stop offset="45%" stopColor={color} />
          <Stop offset="100%" stopColor={color} />
        </LinearGradient>
      </Defs>
      <Path d="M12 30 Q4 22 4 30 Q4 38 12 30 Z" fill={color} opacity={0.85} />
      <Path d="M14 30 Q26 16 42 24 Q52 28 42 36 Q26 44 14 30 Z" fill="url(#fishBody)" />
      <Path d="M28 20 Q32 14 36 22 Z" fill={color} opacity={0.7} />
      <Path d="M26 38 Q30 44 34 37 Z" fill={color} opacity={0.7} />
      <Path d="M20 26 Q26 30 20 34" stroke="#FFFFFF" strokeWidth={1.4} fill="none" opacity={0.5} />
      <Circle cx={44} cy={29} r={2} fill="#1E1810" />
      <Circle cx={44.6} cy={28.4} r={0.6} fill="#FFF" />
    </Svg>
  );
}

/** Flat irregular stepping stones laid diagonally, as if crossing water. */
export function SteppingStonesShape({ color, size }: DecorationShapeProps) {
  const stones = [
    { x: 12, y: 44, rx: 8, ry: 5 },
    { x: 26, y: 36, rx: 7, ry: 4.5 },
    { x: 40, y: 28, rx: 7.5, ry: 5 },
    { x: 52, y: 20, rx: 6, ry: 4 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {stones.map((s, i) => (
        <Ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} fill={color} opacity={0.9 - i * 0.05} />
      ))}
    </Svg>
  );
}
