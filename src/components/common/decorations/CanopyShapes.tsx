import React from 'react';
import Svg, { Ellipse, Circle, Path, Rect } from 'react-native-svg';

export interface DecorationShapeProps {
  color: string;
  size: number;
}

/** A puffy overlapping-canopy cluster on a short trunk stub — the general-purpose "extra tree
 * accent" shape, reused across most Canopy catalog options via color variation. */
export function ClusterCanopyShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Rect x={27} y={42} width={6} height={14} rx={2} fill="#6B4A2E" />
      <Ellipse cx={22} cy={30} rx={14} ry={13} fill={color} opacity={0.92} />
      <Ellipse cx={38} cy={28} rx={15} ry={14} fill={color} />
      <Ellipse cx={30} cy={18} rx={13} ry={12} fill={color} opacity={0.96} />
      <Ellipse cx={26} cy={22} rx={5} ry={4} fill="#FFFFFF" opacity={0.15} />
    </Svg>
  );
}

/** Drooping vine/willow style canopy — a canopy mass up top with several curved hanging tendrils. */
export function DrapeCanopyShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Ellipse cx={30} cy={16} rx={20} ry={11} fill={color} />
      <Path d="M14 20 Q12 34 10 48" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.85} />
      <Path d="M22 24 Q21 38 19 54" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.85} />
      <Path d="M30 25 Q30 40 30 56" stroke={color} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      <Path d="M38 24 Q39 38 41 54" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.85} />
      <Path d="M46 20 Q48 34 50 48" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.85} />
    </Svg>
  );
}

/** A cluster of jointed bamboo stalks with small leaf tufts. */
export function BambooCanopyShape({ color, size }: DecorationShapeProps) {
  const stalkX = [18, 27, 36, 45];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {stalkX.map((x, i) => (
        <React.Fragment key={i}>
          <Rect x={x - 2} y={14 + (i % 2) * 4} width={4} height={44 - (i % 2) * 4} rx={2} fill="#3E7A3E" opacity={0.9} />
          <Rect x={x - 2.6} y={26} width={5.2} height={2} fill="#2C5C2C" />
          <Rect x={x - 2.6} y={38} width={5.2} height={2} fill="#2C5C2C" />
        </React.Fragment>
      ))}
      {stalkX.map((x, i) => (
        <Ellipse key={`leaf-${i}`} cx={x + (i % 2 === 0 ? 6 : -6)} cy={16 + (i % 2) * 4} rx={9} ry={5} fill={color} />
      ))}
    </Svg>
  );
}
