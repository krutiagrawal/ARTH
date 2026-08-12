import React from 'react';
import Svg, { Path, Circle, Ellipse, Line, Defs, RadialGradient, LinearGradient, Stop, G } from 'react-native-svg';
import type { DecorationShapeProps } from './CanopyShapes';

const STAR_PATH =
  'M30 8 L35.3 22.7 L50.9 23.2 L38.6 32.8 L42.9 47.8 L30 39 L17.1 47.8 L21.4 32.8 L9.1 23.2 L24.7 22.7 Z';

/** A glowing five-point star with a soft radial halo and bright core. */
export function StarShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="starGlow" cx="50%" cy="45%" r="55%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.5} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="starBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor={color} />
        </LinearGradient>
      </Defs>
      <Circle cx={30} cy={28} r={26} fill="url(#starGlow)" />
      <Path d={STAR_PATH} fill="url(#starBody)" stroke={color} strokeWidth={1} strokeLinejoin="round" />
      <Path d="M30 14 L33 24 L27 24 Z" fill="#FFFFFF" opacity={0.5} />
    </Svg>
  );
}

/** A small constellation: dots joined by faint lines, with the brighter stars glowing. */
export function ConstellationShape({ color, size }: DecorationShapeProps) {
  const pts = [
    { x: 10, y: 44, r: 2.4 },
    { x: 22, y: 30, r: 3.2 },
    { x: 34, y: 38, r: 2.2 },
    { x: 44, y: 20, r: 3.4 },
    { x: 52, y: 34, r: 2 },
    { x: 30, y: 14, r: 2.6 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="constStar" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor={color} />
        </RadialGradient>
      </Defs>
      <G stroke={color} strokeWidth={1} opacity={0.55} strokeLinecap="round">
        <Line x1={10} y1={44} x2={22} y2={30} />
        <Line x1={22} y1={30} x2={34} y2={38} />
        <Line x1={34} y1={38} x2={44} y2={20} />
        <Line x1={44} y1={20} x2={52} y2={34} />
        <Line x1={22} y1={30} x2={30} y2={14} />
      </G>
      {pts.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={p.r} fill="url(#constStar)" />
      ))}
    </Svg>
  );
}

/** A soft puffy cloud with layered lobes and a light underside shadow. */
export function CloudShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <LinearGradient id="cloudBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor={color} />
        </LinearGradient>
      </Defs>
      <G fill="url(#cloudBody)">
        <Ellipse cx={22} cy={34} rx={13} ry={11} />
        <Ellipse cx={36} cy={30} rx={15} ry={13} />
        <Ellipse cx={44} cy={36} rx={11} ry={9} />
        <Ellipse cx={30} cy={40} rx={20} ry={8} />
      </G>
      <Ellipse cx={30} cy={44} rx={18} ry={4} fill={color} opacity={0.25} />
    </Svg>
  );
}

/** A shooting star: a glowing head with a fading tapered tail. */
export function ShootingStarShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <LinearGradient id="tail" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity={0} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.9} />
        </LinearGradient>
        <RadialGradient id="head" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="100%" stopColor={color} />
        </RadialGradient>
      </Defs>
      <Path d="M8 12 L40 40 L34 46 Z" fill="url(#tail)" />
      <Path d="M14 8 L42 38 L38 44 Z" fill="url(#tail)" opacity={0.6} />
      <Circle cx={42} cy={42} r={6} fill="url(#head)" />
      <Circle cx={40} cy={40} r={2} fill="#FFFFFF" />
    </Svg>
  );
}
