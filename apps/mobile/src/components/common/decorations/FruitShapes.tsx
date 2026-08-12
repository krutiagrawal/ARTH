import React from 'react';
import Svg, { Path, Circle, Ellipse, Defs, RadialGradient, LinearGradient, Stop, G } from 'react-native-svg';
import type { DecorationShapeProps } from './CanopyShapes';

function glossy(id: string, color: string) {
  return (
    <RadialGradient id={id} cx="38%" cy="32%" r="70%">
      <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.55} />
      <Stop offset="55%" stopColor={color} />
      <Stop offset="100%" stopColor={color} />
    </RadialGradient>
  );
}

/** A glossy apple with a leaf and stem. */
export function AppleShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{glossy('appleG', color)}</Defs>
      <Path d="M30 16 Q26 8 34 8" stroke="#6B4A2E" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Path d="M32 14 Q42 8 44 18 Q36 20 32 14 Z" fill="#5FA05F" />
      <Path d="M30 18 Q18 16 16 32 Q14 48 30 50 Q46 48 44 32 Q42 16 30 18 Z" fill="url(#appleG)" />
      <Path d="M30 18 Q28 26 30 50" stroke={color} strokeWidth={1} opacity={0.3} fill="none" />
    </Svg>
  );
}

/** A pair of cherries on paired stems with a leaf. */
export function CherriesShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        {glossy('cherA', color)}
        {glossy('cherB', color)}
      </Defs>
      <Path d="M30 14 Q24 30 20 38 M30 14 Q38 28 42 36" stroke="#6B4A2E" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <Path d="M30 14 Q40 8 46 14 Q38 18 30 14 Z" fill="#5FA05F" />
      <Circle cx={20} cy={42} r={9} fill="url(#cherA)" />
      <Circle cx={41} cy={40} r={9} fill="url(#cherB)" />
      <Circle cx={17} cy={39} r={2.4} fill="#FFFFFF" opacity={0.6} />
      <Circle cx={38} cy={37} r={2.4} fill="#FFFFFF" opacity={0.6} />
    </Svg>
  );
}

/** A pear with a soft blush highlight and a small leaf. */
export function PearShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="pearG" cx="40%" cy="55%" r="65%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
          <Stop offset="60%" stopColor={color} />
          <Stop offset="100%" stopColor={color} />
        </RadialGradient>
      </Defs>
      <Path d="M30 12 L30 20" stroke="#6B4A2E" strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M30 14 Q40 10 44 16 Q37 20 30 16 Z" fill="#5FA05F" />
      <Path d="M30 18 Q24 20 26 30 Q18 36 20 44 Q22 52 30 52 Q38 52 40 44 Q42 36 34 30 Q36 20 30 18 Z" fill="url(#pearG)" />
    </Svg>
  );
}

/** A citrus (orange/lemon) with a cutaway wedge showing segments. */
export function CitrusShape({ color, size }: DecorationShapeProps) {
  const seg = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
    seg.push(`M40 34 L${40 + Math.cos(a) * 13} ${34 + Math.sin(a) * 13}`);
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{glossy('citG', color)}</Defs>
      <Circle cx={26} cy={30} r={17} fill="url(#citG)" />
      <Path d="M26 13 Q24 9 28 9" stroke="#5FA05F" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Circle cx={40} cy={34} r={15} fill={color} />
      <Circle cx={40} cy={34} r={13} fill="#FFF6E0" />
      <G stroke={color} strokeWidth={1.4} opacity={0.85}>
        {seg.map((d, i) => (
          <Path key={i} d={d} />
        ))}
      </G>
      <Circle cx={40} cy={34} r={4} fill={color} opacity={0.4} />
    </Svg>
  );
}

/** A bunch of grapes — clustered berries with a leaf and stem. */
export function GrapesShape({ color, size }: DecorationShapeProps) {
  const grapes = [
    { x: 30, y: 26 }, { x: 24, y: 32 }, { x: 36, y: 32 },
    { x: 30, y: 38 }, { x: 20, y: 40 }, { x: 40, y: 40 },
    { x: 26, y: 45 }, { x: 34, y: 45 }, { x: 30, y: 50 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{glossy('grapeG', color)}</Defs>
      <Path d="M30 22 L30 14" stroke="#6B4A2E" strokeWidth={2} strokeLinecap="round" />
      <Path d="M30 16 Q42 8 48 16 Q40 22 30 16 Z" fill="#5FA05F" />
      {grapes.map((g, i) => (
        <Circle key={i} cx={g.x} cy={g.y} r={5.5} fill="url(#grapeG)" />
      ))}
    </Svg>
  );
}

/** A small cluster of berries (blue/rasp) with tiny seed dots and a leaf. */
export function BerryClusterShape({ color, size }: DecorationShapeProps) {
  const berries = [
    { x: 22, y: 36, r: 8 },
    { x: 38, y: 34, r: 9 },
    { x: 31, y: 46, r: 7 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{glossy('berryG', color)}</Defs>
      <Path d="M30 26 Q22 18 16 20 Q22 26 30 28 Z" fill="#5FA05F" />
      <Path d="M30 26 Q38 18 44 20 Q38 26 30 28 Z" fill="#5FA05F" />
      {berries.map((b, i) => (
        <React.Fragment key={i}>
          <Circle cx={b.x} cy={b.y} r={b.r} fill="url(#berryG)" />
          <Circle cx={b.x - 2} cy={b.y - 2} r={1} fill="#FFFFFF" opacity={0.5} />
          <Circle cx={b.x + 2} cy={b.y + 1} r={1} fill="#FFFFFF" opacity={0.3} />
        </React.Fragment>
      ))}
    </Svg>
  );
}

/** A peach with a soft blush gradient, cleft and a leaf. */
export function PeachShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="peachG" cx="38%" cy="35%" r="70%">
          <Stop offset="0%" stopColor="#FFF3E0" />
          <Stop offset="55%" stopColor={color} />
          <Stop offset="100%" stopColor={color} />
        </RadialGradient>
      </Defs>
      <Path d="M32 16 Q40 10 46 16 Q39 20 32 18 Z" fill="#5FA05F" />
      <Path d="M30 16 Q30 12 33 14" stroke="#6B4A2E" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Circle cx={30} cy={36} r={18} fill="url(#peachG)" />
      <Path d="M30 20 Q26 30 30 52" stroke={color} strokeWidth={1.4} opacity={0.4} fill="none" />
    </Svg>
  );
}
