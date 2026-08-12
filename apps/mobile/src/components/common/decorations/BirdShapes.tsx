import React from 'react';
import Svg, { Path, Circle, Ellipse, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import type { DecorationShapeProps } from './CanopyShapes';

function shade(gradId: string, color: string) {
  return (
    <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
      <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.35} />
      <Stop offset="35%" stopColor={color} />
      <Stop offset="100%" stopColor={color} />
    </LinearGradient>
  );
}

/** A plump perched songbird (robin/generic) with a pale belly, folded wing and stubby beak. */
export function RobinShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{shade('robinG', color)}</Defs>
      <Ellipse cx={30} cy={36} rx={16} ry={15} fill="url(#robinG)" />
      <Ellipse cx={28} cy={40} rx={9} ry={9} fill="#F0E6D2" opacity={0.8} />
      <Circle cx={38} cy={22} r={9} fill={color} />
      <Path d="M46 21 L54 24 L46 26 Z" fill="#E7A33C" />
      <Circle cx={40} cy={20} r={1.8} fill="#2A2018" />
      <Circle cx={40.6} cy={19.4} r={0.6} fill="#FFF" />
      <Path d="M22 30 Q14 34 20 46 Q26 42 28 34 Z" fill={color} opacity={0.85} />
      <Path d="M14 40 Q8 42 6 48 L20 46 Z" fill={color} opacity={0.7} />
      <Path d="M30 50 L28 56 M34 50 L34 56" stroke="#C79A5B" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** A bluebird — sleeker body with a lifted tail and a small crest of feathers. */
export function BluebirdShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{shade('blueG', color)}</Defs>
      <Path d="M18 38 Q20 22 36 24 Q50 26 48 36 Q46 46 32 48 Q20 48 18 38 Z" fill="url(#blueG)" />
      <Ellipse cx={30} cy={42} rx={8} ry={6} fill="#F2EEDF" opacity={0.75} />
      <Circle cx={40} cy={26} r={7.5} fill={color} />
      <Path d="M47 25 L55 27 L47 29 Z" fill="#3A3020" />
      <Circle cx={42} cy={24} r={1.7} fill="#1E1810" />
      <Path d="M12 34 Q4 30 6 40 Q14 40 18 36 Z" fill={color} opacity={0.85} />
      <Path d="M34 22 Q37 16 40 22 Z" fill={color} />
      <Path d="M30 50 L28 56 M34 50 L34 56" stroke="#C79A5B" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** A cardinal — bold body with a pointed head crest and a dark face mask. */
export function CardinalShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{shade('cardG', color)}</Defs>
      <Ellipse cx={30} cy={36} rx={15} ry={14} fill="url(#cardG)" />
      <Circle cx={38} cy={22} r={9} fill={color} />
      <Path d="M40 12 Q44 10 42 18 Q39 15 36 16 Z" fill={color} />
      <Path d="M34 20 Q38 26 44 24 Q40 18 34 20 Z" fill="#3A1512" />
      <Path d="M46 21 L54 23 L46 26 Z" fill="#E7A33C" />
      <Circle cx={40} cy={20} r={1.7} fill="#1E1810" />
      <Path d="M18 32 Q10 36 16 46 Q24 42 26 34 Z" fill={color} opacity={0.85} />
      <Path d="M16 40 Q8 44 8 50 L22 46 Z" fill={color} opacity={0.7} />
    </Svg>
  );
}

/** An owl — upright, round-faced with large eyes and small ear tufts. */
export function OwlShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{shade('owlG', color)}</Defs>
      <Path d="M18 12 Q22 20 26 20 Z M42 12 Q38 20 34 20 Z" fill={color} />
      <Ellipse cx={30} cy={32} rx={17} ry={19} fill="url(#owlG)" />
      <Path d="M14 30 Q13 44 22 52 Q30 46 30 36 Z" fill={color} opacity={0.55} />
      <Path d="M46 30 Q47 44 38 52 Q30 46 30 36 Z" fill={color} opacity={0.4} />
      <Circle cx={23} cy={28} r={7} fill="#F5EEDC" />
      <Circle cx={37} cy={28} r={7} fill="#F5EEDC" />
      <Circle cx={23} cy={28} r={3.4} fill="#2A2018" />
      <Circle cx={37} cy={28} r={3.4} fill="#2A2018" />
      <Circle cx={24} cy={27} r={1} fill="#FFF" />
      <Circle cx={38} cy={27} r={1} fill="#FFF" />
      <Path d="M27 33 L30 38 L33 33 Z" fill="#E7A33C" />
      <Path d="M24 50 L22 56 M36 50 L38 56" stroke="#C79A5B" strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}

/** A hummingbird — tiny iridescent body, long thin beak and blurred hovering wing. */
export function HummingbirdShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{shade('hummG', color)}</Defs>
      <Ellipse cx={30} cy={34} rx={10} ry={7} fill="url(#hummG)" transform="rotate(-15 30 34)" />
      <Circle cx={38} cy={28} r={5.5} fill={color} />
      <Path d="M42 26 L58 20 L43 30 Z" fill="#3A3020" strokeLinecap="round" />
      <Circle cx={39} cy={27} r={1.4} fill="#1E1810" />
      <Path d="M24 32 Q8 20 10 34 Q20 36 26 34 Z" fill={color} opacity={0.4} />
      <Path d="M26 34 Q12 40 14 48 Q24 42 28 36 Z" fill={color} opacity={0.7} />
      <Path d="M22 38 L14 50 L26 42 Z" fill={color} opacity={0.85} />
    </Svg>
  );
}

/** A dove — smooth pale body, small rounded head and gently fanned tail. */
export function DoveShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{shade('doveG', color)}</Defs>
      <Path d="M14 40 Q16 26 34 26 Q50 28 46 38 Q42 44 30 46 Q18 46 14 40 Z" fill="url(#doveG)" />
      <Circle cx={40} cy={28} r={6.5} fill={color} />
      <Path d="M46 27 L52 28 L46 30 Z" fill="#D79A4C" />
      <Circle cx={42} cy={26} r={1.4} fill="#2A2018" />
      <Path d="M10 36 Q2 34 4 42 Q12 42 16 38 Z" fill={color} opacity={0.8} />
      <Path d="M14 42 Q22 30 24 40 Q20 44 14 42 Z" fill="#FFFFFF" opacity={0.25} />
    </Svg>
  );
}

/** A crane — tall wading bird with a long neck, long legs and a slender beak. */
export function CraneShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>{shade('craneG', color)}</Defs>
      <Path d="M22 30 Q18 28 20 20 Q22 12 26 12" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Ellipse cx={30} cy={34} rx={13} ry={9} fill="url(#craneG)" />
      <Path d="M40 40 Q46 34 44 30 Q40 34 36 36 Z" fill={color} opacity={0.7} />
      <Circle cx={27} cy={12} r={4} fill={color} />
      <Path d="M25 11 L15 10 L25 14 Z" fill="#E7A33C" />
      <Circle cx={27} cy={11} r={1.2} fill="#1E1810" />
      <Path d="M26 43 L24 56 M34 43 L36 56" stroke="#C9963F" strokeWidth={2} strokeLinecap="round" />
      <Path d="M24 56 L20 57 M36 56 L40 57" stroke="#C9963F" strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
