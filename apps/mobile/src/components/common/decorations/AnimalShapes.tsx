import React from 'react';
import Svg, { Path, Circle, Ellipse, Rect, Defs, LinearGradient, RadialGradient, Stop, G } from 'react-native-svg';
import type { DecorationShapeProps } from './CanopyShapes';

function vshade(id: string, color: string) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.3} />
      <Stop offset="40%" stopColor={color} />
      <Stop offset="100%" stopColor={color} />
    </LinearGradient>
  );
}

/** A sitting fox — pointed ears, bushy tail with a pale tip, white cheek/chest. */
export function FoxShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{vshade('foxG', color)}</Defs>
      <Path d="M40 44 Q56 40 52 24 Q46 30 42 38 Z" fill={color} />
      <Path d="M50 24 Q56 24 52 30 Z" fill="#F3ECDD" />
      <Path d="M20 48 Q16 30 30 28 Q44 30 40 48 Z" fill="url(#foxG)" />
      <Path d="M26 46 Q30 52 34 46 Z" fill="#F3ECDD" />
      <Path d="M22 24 L18 12 L30 20 Z" fill={color} />
      <Path d="M38 24 L42 12 L30 20 Z" fill={color} />
      <Path d="M23 16 L21 22 M37 16 L39 22" stroke="#5A2E14" strokeWidth={0} />
      <Path d="M22 26 Q30 22 38 26 Q34 36 30 36 Q26 36 22 26 Z" fill="#F3ECDD" />
      <Path d="M30 32 L27 28 L33 28 Z" fill={color} />
      <Circle cx={26} cy={26} r={1.6} fill="#2A1A10" />
      <Circle cx={34} cy={26} r={1.6} fill="#2A1A10" />
      <Circle cx={30} cy={33} r={1.6} fill="#2A1A10" />
    </Svg>
  );
}

/** A rabbit — upright with tall ears, round body and a fluffy cotton tail. */
export function RabbitShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{vshade('rabG', color)}</Defs>
      <Ellipse cx={30} cy={40} rx={13} ry={15} fill="url(#rabG)" />
      <Circle cx={44} cy={44} r={5} fill="#F5F0E4" />
      <Ellipse cx={24} cy={20} rx={4} ry={12} fill={color} transform="rotate(-12 24 20)" />
      <Ellipse cx={34} cy={20} rx={4} ry={12} fill={color} transform="rotate(10 34 20)" />
      <Ellipse cx={24} cy={20} rx={1.8} ry={8} fill="#F3C9CE" transform="rotate(-12 24 20)" />
      <Ellipse cx={34} cy={20} rx={1.8} ry={8} fill="#F3C9CE" transform="rotate(10 34 20)" />
      <Circle cx={26} cy={36} r={1.6} fill="#2A1A10" />
      <Circle cx={34} cy={36} r={1.6} fill="#2A1A10" />
      <Path d="M28 40 L32 40 L30 43 Z" fill="#E39AA0" />
    </Svg>
  );
}

/** A young deer — slender body on thin legs with a raised head and short antlers. */
export function DeerShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{vshade('deerG', color)}</Defs>
      <Ellipse cx={28} cy={30} rx={15} ry={9} fill="url(#deerG)" />
      <Path d="M40 26 Q46 18 42 12 Q40 18 38 22 Z" fill={color} />
      <Circle cx={44} cy={16} r={4.5} fill={color} />
      <Path d="M47 12 L50 6 M45 11 L44 5 M42 12 L40 7" stroke="#7A5230" strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={45.5} cy={15} r={1.3} fill="#2A1A10" />
      <Path d="M47 18 L51 19 L47 20 Z" fill="#3A2A1E" />
      <Path d="M20 38 L18 52 M28 38 L28 52 M36 36 L38 50 M24 38 L23 51" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <Ellipse cx={22} cy={28} rx={7} ry={5} fill="#FFFFFF" opacity={0.18} />
      <Circle cx={20} cy={30} r={1.6} fill="#F2ECDC" />
      <Circle cx={26} cy={32} r={1.4} fill="#F2ECDC" />
    </Svg>
  );
}

/** A hedgehog — spiky quill dome over a small round face. */
export function HedgehogShape({ color, size }: DecorationShapeProps) {
  const spikes = [];
  for (let i = 0; i < 11; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    spikes.push({ x1: 30 + Math.cos(a) * 15, y1: 38 + Math.sin(a) * 15, x2: 30 + Math.cos(a) * 22, y2: 38 + Math.sin(a) * 22 });
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{vshade('hogG', color)}</Defs>
      <G stroke={color} strokeWidth={2.4} strokeLinecap="round">
        {spikes.map((s, i) => (
          <Path key={i} d={`M${s.x1} ${s.y1} L${s.x2} ${s.y2}`} />
        ))}
      </G>
      <Path d="M12 38 Q12 22 30 22 Q48 22 48 38 Z" fill="url(#hogG)" />
      <Path d="M10 40 Q18 48 30 46 Q26 38 18 38 Z" fill="#E8D8C0" />
      <Circle cx={14} cy={40} r={2} fill="#2A1A10" />
      <Circle cx={20} cy={38} r={1.5} fill="#2A1A10" />
    </Svg>
  );
}

/** A squirrel — crouched body with a big curling tail and a held acorn. */
export function SquirrelShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{vshade('sqG', color)}</Defs>
      <Path d="M42 50 Q58 44 50 22 Q40 24 40 40 Q40 48 42 50 Z" fill={color} />
      <Path d="M46 44 Q52 38 48 28 Q44 34 44 42 Z" fill="#FFFFFF" opacity={0.2} />
      <Ellipse cx={30} cy={40} rx={12} ry={13} fill="url(#sqG)" />
      <Circle cx={22} cy={24} r={7} fill={color} />
      <Path d="M18 18 Q16 12 22 16 Z M26 18 Q28 12 24 16 Z" fill={color} />
      <Circle cx={20} cy={23} r={1.5} fill="#2A1A10" />
      <Path d="M15 26 L11 27 L15 28 Z" fill="#2A1A10" />
      <Path d="M28 40 L34 46 L28 48 Z" fill="#8A6A3A" />
      <Circle cx={30} cy={44} r={2} fill="#B98A4A" />
    </Svg>
  );
}

/** A turtle — domed patterned shell over a small head and stubby legs. */
export function TurtleShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="shellG" cx="45%" cy="35%" r="65%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.35} />
          <Stop offset="100%" stopColor={color} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={30} cy={40} rx={22} ry={7} fill="#6BA36B" opacity={0.5} />
      <Circle cx={48} cy={34} r={5.5} fill="#7CB47C" />
      <Circle cx={49} cy={33} r={1.3} fill="#1E1810" />
      <Path d="M12 38 L9 44 M22 40 L20 46 M38 40 L40 46 M46 38 L49 44" stroke="#6BA36B" strokeWidth={3} strokeLinecap="round" />
      <Path d="M12 38 Q14 20 30 20 Q46 20 48 38 Z" fill="url(#shellG)" />
      <Path d="M30 20 L30 38 M18 26 L24 34 M42 26 L36 34 M14 34 L46 34" stroke="#3E5E3E" strokeWidth={1.2} opacity={0.5} fill="none" />
    </Svg>
  );
}

/** A butterfly — four patterned wings around a slender body with antennae. */
export function ButterflyShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{vshade('flyG', color)}</Defs>
      <Path d="M30 30 Q10 12 12 30 Q14 40 30 32 Z" fill="url(#flyG)" />
      <Path d="M30 30 Q50 12 48 30 Q46 40 30 32 Z" fill="url(#flyG)" />
      <Path d="M30 32 Q14 34 16 46 Q26 46 30 34 Z" fill={color} opacity={0.85} />
      <Path d="M30 32 Q46 34 44 46 Q34 46 30 34 Z" fill={color} opacity={0.85} />
      <Circle cx={20} cy={26} r={3} fill="#FFFFFF" opacity={0.6} />
      <Circle cx={40} cy={26} r={3} fill="#FFFFFF" opacity={0.6} />
      <Circle cx={22} cy={40} r={2} fill="#FFFFFF" opacity={0.5} />
      <Circle cx={38} cy={40} r={2} fill="#FFFFFF" opacity={0.5} />
      <Rect x={28.5} y={26} width={3} height={18} rx={1.5} fill="#3A2A1E" />
      <Path d="M29 26 Q24 18 22 16 M31 26 Q36 18 38 16" stroke="#3A2A1E" strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

/** A bee — striped fuzzy body, translucent wings and a small stinger. */
export function BeeShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{vshade('beeG', color)}</Defs>
      <Ellipse cx={24} cy={22} rx={11} ry={8} fill="#DCE8F2" opacity={0.75} transform="rotate(-20 24 22)" />
      <Ellipse cx={36} cy={22} rx={11} ry={8} fill="#DCE8F2" opacity={0.75} transform="rotate(20 36 22)" />
      <Ellipse cx={30} cy={36} rx={15} ry={12} fill="url(#beeG)" />
      <Path d="M25 26 Q30 24 35 26 M21 34 Q30 32 39 34 M23 42 Q30 40 37 42" stroke="#2A2012" strokeWidth={3} fill="none" strokeLinecap="round" />
      <Path d="M44 40 L50 44 L44 44 Z" fill="#2A2012" />
      <Circle cx={16} cy={32} r={1.6} fill="#2A2012" />
    </Svg>
  );
}

/** A ladybug — red-domed shell with black spots and a small head. */
export function LadybugShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="lbG" cx="40%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.4} />
          <Stop offset="100%" stopColor={color} />
        </RadialGradient>
      </Defs>
      <Path d="M14 44 Q8 30 18 22 M46 44 Q52 30 42 22" stroke="#2A2012" strokeWidth={2} strokeLinecap="round" fill="none" />
      <Circle cx={30} cy={34} r={17} fill="url(#lbG)" />
      <Path d="M30 17 L30 51" stroke="#2A1010" strokeWidth={2} />
      <Path d="M13 30 Q22 22 30 22 Q38 22 47 30 Q40 18 30 18 Q20 18 13 30 Z" fill="#2A1010" />
      <Circle cx={22} cy={30} r={2.6} fill="#2A1010" />
      <Circle cx={38} cy={30} r={2.6} fill="#2A1010" />
      <Circle cx={24} cy={42} r={2.6} fill="#2A1010" />
      <Circle cx={36} cy={42} r={2.6} fill="#2A1010" />
      <Circle cx={26} cy={20} r={2} fill="#F5EEDC" />
      <Circle cx={34} cy={20} r={2} fill="#F5EEDC" />
    </Svg>
  );
}

/** A snail — coiled spiral shell on a soft body with eye stalks. */
export function SnailShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="snailG" cx="45%" cy="40%" r="65%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.4} />
          <Stop offset="100%" stopColor={color} />
        </RadialGradient>
      </Defs>
      <Path d="M8 44 Q8 38 16 38 L44 38 Q52 38 50 44 Z" fill="#E7C79A" />
      <Path d="M44 42 Q58 38 50 26 Q40 20 46 34" stroke="#C9A15E" strokeWidth={2} fill="none" opacity={0.5} />
      <Circle cx={26} cy={28} r={16} fill="url(#snailG)" />
      <Path
        d="M26 28 m0 -11 a11 11 0 1 1 -0.1 0 M26 28 m0 -7 a7 7 0 1 0 0.1 0 M26 28 m0 -3.5 a3.5 3.5 0 1 1 -0.1 0"
        stroke="#8A5A2E"
        strokeWidth={1.6}
        fill="none"
        opacity={0.6}
      />
      <Path d="M12 40 Q6 30 10 24 M16 40 Q12 30 16 22" stroke="#E7C79A" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Circle cx={10} cy={23} r={1.6} fill="#2A2012" />
      <Circle cx={16} cy={21} r={1.6} fill="#2A2012" />
    </Svg>
  );
}
