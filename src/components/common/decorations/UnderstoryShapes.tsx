import React from 'react';
import Svg, { Ellipse, Circle, Path, Rect } from 'react-native-svg';
import type { DecorationShapeProps } from './CanopyShapes';

/** A symmetric fern frond — central stem with paired leaflets fanning outward. */
export function FernShape({ color, size }: DecorationShapeProps) {
  const pairs = [12, 20, 28, 36];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Path d="M30 56 Q29 34 30 10" stroke="#4A6B3A" strokeWidth={2} fill="none" />
      {pairs.map((y, i) => {
        const w = 16 - i * 2;
        return (
          <React.Fragment key={i}>
            <Ellipse cx={30 - w} cy={16 + y * 0.75} rx={w} ry={4} fill={color} opacity={0.9} transform={`rotate(-25 ${30 - w} ${16 + y * 0.75})`} />
            <Ellipse cx={30 + w} cy={16 + y * 0.75} rx={w} ry={4} fill={color} opacity={0.9} transform={`rotate(25 ${30 + w} ${16 + y * 0.75})`} />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

/** A rounded bushy shrub mass from overlapping puffs. */
export function ShrubShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Ellipse cx={30} cy={50} rx={20} ry={4} fill="#000000" opacity={0.08} />
      <Circle cx={19} cy={38} r={12} fill={color} opacity={0.92} />
      <Circle cx={41} cy={38} r={13} fill={color} />
      <Circle cx={30} cy={30} r={14} fill={color} opacity={0.96} />
      <Circle cx={26} cy={26} r={4} fill="#FFFFFF" opacity={0.15} />
    </Svg>
  );
}

/** Shrub mass plus small round berry accents scattered on top. */
export function BerryBushShape({ color, size }: DecorationShapeProps) {
  const berries = [[22, 30], [36, 26], [30, 40], [42, 36], [18, 40]];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Ellipse cx={30} cy={50} rx={20} ry={4} fill="#000000" opacity={0.08} />
      <Circle cx={19} cy={38} r={12} fill={color} opacity={0.92} />
      <Circle cx={41} cy={38} r={13} fill={color} />
      <Circle cx={30} cy={30} r={14} fill={color} opacity={0.96} />
      {berries.map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={2.4} fill="#C0392B" />
      ))}
    </Svg>
  );
}

/** A fan of curved grass/reed blades rising from a single base point. */
export function GrassTuftShape({ color, size }: DecorationShapeProps) {
  const blades = [-24, -14, -5, 5, 14, 24];
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      {blades.map((offset, i) => (
        <Path
          key={i}
          d={`M30 56 Q${30 + offset * 0.6} ${34 - Math.abs(offset) * 0.3} ${30 + offset} ${14 + Math.abs(offset) * 0.4}`}
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}

/** A horizontal fallen log with a mossy, bumpy top texture. */
export function MossLogShape({ color, size }: DecorationShapeProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Rect x={6} y={38} width={48} height={14} rx={7} fill="#7A5A3A" />
      <Ellipse cx={9} cy={45} rx={4} ry={7} fill="#5C4028" />
      <Ellipse cx={51} cy={45} rx={4} ry={7} fill="#5C4028" />
      {[12, 20, 28, 36, 44].map((x, i) => (
        <Ellipse key={i} cx={x} cy={36} rx={5} ry={4} fill={color} opacity={0.9} />
      ))}
    </Svg>
  );
}
