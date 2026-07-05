import type { ComponentType } from 'react';
import type { DecorationShapeProps } from '../components/common/decorations/CanopyShapes';
import { ClusterCanopyShape, DrapeCanopyShape, BambooCanopyShape } from '../components/common/decorations/CanopyShapes';
import { FernShape, ShrubShape, BerryBushShape, GrassTuftShape, MossLogShape } from '../components/common/decorations/UnderstoryShapes';
import {
  MushroomCapShape,
  ShelfFungiShape,
  PuffballShape,
  LeafPileShape,
  PebbleClusterShape,
} from '../components/common/decorations/ForestFloorShapes';
import { RockStackShape } from '../components/common/decorations/ForestFloorShapes';
import { PondRoundShape, StreamCurveShape, LilyPadShape, ReedClusterShape, SteppingStonesShape, FishShape } from '../components/common/decorations/WaterShapes';
import { FlowerClusterShape, TallGrassShape, FireflySwarmShape, CloverPatchShape } from '../components/common/decorations/MeadowShapes';
import { StarShape, ConstellationShape, CloudShape, ShootingStarShape } from '../components/common/decorations/SkyShapes';
import { RobinShape, BluebirdShape, CardinalShape, OwlShape, HummingbirdShape, DoveShape, CraneShape } from '../components/common/decorations/BirdShapes';
import {
  FoxShape,
  RabbitShape,
  DeerShape,
  HedgehogShape,
  SquirrelShape,
  TurtleShape,
  ButterflyShape,
  BeeShape,
  LadybugShape,
  SnailShape,
} from '../components/common/decorations/AnimalShapes';
import { AppleShape, CherriesShape, PearShape, CitrusShape, GrapesShape, BerryClusterShape, PeachShape } from '../components/common/decorations/FruitShapes';

export type EcosystemZoneKey =
  | 'canopy'
  | 'understory'
  | 'forest_floor'
  | 'water'
  | 'meadow'
  | 'sky'
  | 'birds'
  | 'animals'
  | 'fruits';

export const ECOSYSTEM_ZONES: { key: EcosystemZoneKey; name: string; icon: string }[] = [
  { key: 'canopy', name: 'Canopy', icon: '🌳' },
  { key: 'understory', name: 'Understory', icon: '🌿' },
  { key: 'forest_floor', name: 'Forest Floor', icon: '🍄' },
  { key: 'water', name: 'Water', icon: '💧' },
  { key: 'meadow', name: 'Meadow', icon: '🌸' },
  { key: 'sky', name: 'Sky', icon: '⭐' },
  { key: 'birds', name: 'Birds', icon: '🐦' },
  { key: 'animals', name: 'Animals', icon: '🦊' },
  { key: 'fruits', name: 'Fruits', icon: '🍎' },
];

/** Maps each catalog `variant` key (from the backend `DecorationType` row) to the small SVG
 * component that renders it. The DB only stores which variant + colorway a decoration uses —
 * the actual illustrated shape lives in versioned frontend code, not the database. */
export const DECORATION_COMPONENTS: Record<string, ComponentType<DecorationShapeProps>> = {
  'cluster-canopy': ClusterCanopyShape,
  'drape-canopy': DrapeCanopyShape,
  'bamboo-canopy': BambooCanopyShape,
  fern: FernShape,
  shrub: ShrubShape,
  'berry-bush': BerryBushShape,
  'grass-tuft': GrassTuftShape,
  'moss-log': MossLogShape,
  'mushroom-cap': MushroomCapShape,
  'shelf-fungi': ShelfFungiShape,
  puffball: PuffballShape,
  'leaf-pile': LeafPileShape,
  'pebble-cluster': PebbleClusterShape,
  'pond-round': PondRoundShape,
  'stream-curve': StreamCurveShape,
  'lily-pad': LilyPadShape,
  'reed-cluster': ReedClusterShape,
  'stepping-stones': SteppingStonesShape,
  'flower-cluster': FlowerClusterShape,
  'tall-grass': TallGrassShape,
  'firefly-swarm': FireflySwarmShape,
  'clover-patch': CloverPatchShape,
  // Forest floor additions
  'rock-stack': RockStackShape,
  // Water additions
  fish: FishShape,
  // Sky & celestial — no Sun/Moon here: the Skia-rendered landscape already shows a sun/moon
  // automatically based on time of day (see ForestCanvas), a separate placeable one is redundant.
  star: StarShape,
  constellation: ConstellationShape,
  cloud: CloudShape,
  'shooting-star': ShootingStarShape,
  // Birds
  'bird-robin': RobinShape,
  'bird-bluebird': BluebirdShape,
  'bird-cardinal': CardinalShape,
  'bird-owl': OwlShape,
  'bird-hummingbird': HummingbirdShape,
  'bird-dove': DoveShape,
  'bird-crane': CraneShape,
  // Land animals
  'animal-fox': FoxShape,
  'animal-rabbit': RabbitShape,
  'animal-deer': DeerShape,
  'animal-hedgehog': HedgehogShape,
  'animal-squirrel': SquirrelShape,
  'animal-turtle': TurtleShape,
  'animal-butterfly': ButterflyShape,
  'animal-bee': BeeShape,
  'animal-ladybug': LadybugShape,
  'animal-snail': SnailShape,
  // Fruits
  'fruit-apple': AppleShape,
  'fruit-cherries': CherriesShape,
  'fruit-pear': PearShape,
  'fruit-citrus': CitrusShape,
  'fruit-grapes': GrapesShape,
  'fruit-berries': BerryClusterShape,
  'fruit-peach': PeachShape,
};

// Decorations are placed freely anywhere on the forest canvas (no per-zone spatial bands) — zones
// only categorise the catalog in the picker. Position/size/rotation are stored per placement and
// clamped to the screen bounds by the drag overlay, not to a zone region.

/** Catalog `variant`s that are "draw it yourself" tools rather than instant-placement icons.
 * Tapping one of these in the picker hands off to a freehand drawing gesture instead of creating a
 * placement immediately — see `DecorationPickerSheet`'s `onDraw` prop and `ForestScreen`'s draw mode. */
export const DRAW_TOOL_VARIANTS = new Set<string>(['hand-drawn-river', 'hand-drawn-stream']);

/** Stroke width (in the shape's own local SVG units) for each hand-drawn water variant, so a drawn
 * river reads as broader/deeper than a drawn stream — matches the pre-made river-bend/stream-curve
 * icons' relative proportions. */
export const HAND_DRAWN_STROKE_WIDTH: Record<string, number> = {
  'hand-drawn-river': 16,
  'hand-drawn-stream': 9,
};
