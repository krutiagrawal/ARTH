import React from 'react';
import Svg, { Ellipse, Circle, Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { DecorationShapeProps } from './CanopyShapes';

function SimpleFlower({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <>
      {petals.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const px = x + Math.cos(rad) * r * 0.75;
        const py = y + Math.sin(rad) * r * 0.75;
        return <Circle key={i} cx={px} cy={py} r={r * 0.55} fill={color} opacity={0.92} />;
      })}
      <Circle cx={x} cy={y} r={r * 0.45} fill="#E8C23A" />
    </>
  );
}

/** A small cluster of simple 6-petal flowers at varying sizes, on thin stems. */
export function FlowerClusterShape({ color, size }: DecorationShapeProps) {
  const flowers = [
    { x: 20, y: 26, r: 6 },
    { x: 36, y: 20, r: 7 },
    { x: 44, y: 32, r: 5 },
    { x: 26, y: 38, r: 5.5 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {flowers.map((f, i) => (
        <Path key={`stem-${i}`} d={`M${f.x} ${f.y + f.r} L${f.x} 54`} stroke="#5C8A5C" strokeWidth={1.6} fill="none" />
      ))}
      {flowers.map((f, i) => (
        <SimpleFlower key={i} x={f.x} y={f.y} r={f.r} color={color} />
      ))}
    </Svg>
  );
}

/** Tall swaying grass blades, wider and taller than the understory grass tuft. */
export function TallGrassShape({ color, size }: DecorationShapeProps) {
  const blades = [-22, -13, -4, 4, 13, 22];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {blades.map((offset, i) => (
        <Path
          key={i}
          d={`M30 56 Q${30 + offset * 0.8} ${30} ${30 + offset * 1.3} ${8 + Math.abs(offset) * 0.5}`}
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
          fill="none"
          opacity={0.85 + (i % 2) * 0.1}
        />
      ))}
    </Svg>
  );
}

/** A soft glowing swarm of fireflies — small circles with radial-gradient glow halos. */
export function FireflySwarmShape({ color, size }: DecorationShapeProps) {
  const flies = [
    { x: 16, y: 32 }, { x: 30, y: 18 }, { x: 44, y: 30 },
    { x: 24, y: 44 }, { x: 40, y: 46 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Defs>
        <RadialGradient id="fireflyGlow" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {flies.map((f, i) => (
        <React.Fragment key={i}>
          <Circle cx={f.x} cy={f.y} r={7} fill="url(#fireflyGlow)" />
          <Circle cx={f.x} cy={f.y} r={1.6} fill="#FFFFFF" />
        </React.Fragment>
      ))}
    </Svg>
  );
}

/** A small patch of three-leaf clovers with tiny white flower accents. */
export function CloverPatchShape({ color, size }: DecorationShapeProps) {
  function Clover({ x, y, s }: { x: number; y: number; s: number }) {
    return (
      <>
        <Circle cx={x - s} cy={y} r={s} fill={color} opacity={0.9} />
        <Circle cx={x + s} cy={y} r={s} fill={color} opacity={0.9} />
        <Circle cx={x} cy={y - s} r={s} fill={color} />
      </>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Clover x={18} y={40} s={6} />
      <Clover x={34} y={44} s={7} />
      <Clover x={44} y={32} s={5} />
      <Circle cx={26} cy={34} r={1.6} fill="#FFFFFF" opacity={0.85} />
      <Circle cx={40} cy={42} r={1.4} fill="#FFFFFF" opacity={0.8} />
    </Svg>
  );
}
