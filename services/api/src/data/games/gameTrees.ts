// Trait table for "Guess the Tree". Lives in code rather than the DB: the botanical columns on
// TreeSpecies are not seeded (null for most rows), and game answers must stay server-side anyway.
// Keys match TreeSpecies.key in packages/db/prisma/seed.ts.

export type TreeKind = 'broadleaf' | 'conifer' | 'palm' | 'bamboo' | 'shrub';

export interface GameTree {
  key: string;
  name: string;
  emoji: string;
  kind: TreeKind;
  heightM: number;
  bearsFruit: boolean;
  showyFlowers: boolean;
  nativeToIndia: boolean;
  co2KgPerYear: number;
}

export const GAME_TREES: GameTree[] = [
  { key: 'mangrove', name: 'Mangrove', emoji: '🌳', kind: 'broadleaf', heightM: 15, bearsFruit: false, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 8.0 },
  { key: 'teak', name: 'Teak', emoji: '🌲', kind: 'broadleaf', heightM: 30, bearsFruit: false, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 6.0 },
  { key: 'bamboo', name: 'Bamboo', emoji: '🎋', kind: 'bamboo', heightM: 20, bearsFruit: false, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 4.0 },
  { key: 'khejri', name: 'Khejri', emoji: '🌵', kind: 'broadleaf', heightM: 10, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 3.2 },
  { key: 'sandalwood', name: 'Sandalwood', emoji: '🪵', kind: 'broadleaf', heightM: 12, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 2.0 },
  { key: 'pine', name: 'Pine', emoji: '🌲', kind: 'conifer', heightM: 35, bearsFruit: false, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 1.8 },
  { key: 'blue_gum', name: 'Blue Gum', emoji: '🌿', kind: 'broadleaf', heightM: 40, bearsFruit: false, showyFlowers: false, nativeToIndia: false, co2KgPerYear: 1.0 },
  { key: 'orange_tree', name: 'Orange Tree', emoji: '🍊', kind: 'broadleaf', heightM: 6, bearsFruit: true, showyFlowers: false, nativeToIndia: false, co2KgPerYear: 2.8 },
  { key: 'neem', name: 'Neem', emoji: '🌳', kind: 'broadleaf', heightM: 15, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 4.5 },
  { key: 'banyan', name: 'Banyan', emoji: '🌳', kind: 'broadleaf', heightM: 25, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 7.5 },
  { key: 'peepal', name: 'Peepal', emoji: '🌳', kind: 'broadleaf', heightM: 25, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 5.0 },
  { key: 'gulmohar', name: 'Gulmohar', emoji: '🌺', kind: 'broadleaf', heightM: 12, bearsFruit: false, showyFlowers: true, nativeToIndia: false, co2KgPerYear: 3.0 },
  { key: 'amla', name: 'Amla', emoji: '🌿', kind: 'broadleaf', heightM: 8, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 2.0 },
  { key: 'jamun', name: 'Jamun', emoji: '🫐', kind: 'broadleaf', heightM: 20, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 3.0 },
  { key: 'mango', name: 'Mango Tree', emoji: '🥭', kind: 'broadleaf', heightM: 20, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 4.2 },
  { key: 'guava', name: 'Guava', emoji: '🌳', kind: 'broadleaf', heightM: 6, bearsFruit: true, showyFlowers: false, nativeToIndia: false, co2KgPerYear: 2.0 },
  { key: 'moringa', name: 'Moringa', emoji: '🌿', kind: 'broadleaf', heightM: 8, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 2.2 },
  { key: 'karanj', name: 'Karanj', emoji: '🌳', kind: 'broadleaf', heightM: 15, bearsFruit: false, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 3.5 },
  { key: 'arjuna', name: 'Arjuna', emoji: '🌳', kind: 'broadleaf', heightM: 25, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 4.2 },
  { key: 'jacaranda', name: 'Jacaranda', emoji: '🌸', kind: 'broadleaf', heightM: 15, bearsFruit: false, showyFlowers: true, nativeToIndia: false, co2KgPerYear: 3.0 },
  { key: 'champa', name: 'Champa', emoji: '🌺', kind: 'broadleaf', heightM: 6, bearsFruit: false, showyFlowers: true, nativeToIndia: false, co2KgPerYear: 1.8 },
  { key: 'curry_leaf', name: 'Curry Leaf', emoji: '🌿', kind: 'shrub', heightM: 5, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 0.8 },
  { key: 'coconut', name: 'Coconut Palm', emoji: '🥥', kind: 'palm', heightM: 25, bearsFruit: true, showyFlowers: false, nativeToIndia: true, co2KgPerYear: 3.0 },
  { key: 'bougainvillea', name: 'Bougainvillea', emoji: '🌺', kind: 'shrub', heightM: 5, bearsFruit: false, showyFlowers: true, nativeToIndia: false, co2KgPerYear: 1.2 },
  { key: 'silver_oak', name: 'Silver Oak', emoji: '🌲', kind: 'broadleaf', heightM: 30, bearsFruit: false, showyFlowers: true, nativeToIndia: false, co2KgPerYear: 3.8 },
  { key: 'rain_tree', name: 'Rain Tree', emoji: '🌳', kind: 'broadleaf', heightM: 25, bearsFruit: false, showyFlowers: true, nativeToIndia: false, co2KgPerYear: 6.5 },
  { key: 'kadamba', name: 'Kadamba', emoji: '🌳', kind: 'broadleaf', heightM: 25, bearsFruit: true, showyFlowers: true, nativeToIndia: true, co2KgPerYear: 3.2 },
  { key: 'subabul', name: 'Subabul', emoji: '🌿', kind: 'broadleaf', heightM: 10, bearsFruit: false, showyFlowers: false, nativeToIndia: false, co2KgPerYear: 2.0 },
];

export type HeightBand = 'small' | 'medium' | 'tall';

export function heightBand(heightM: number): HeightBand {
  if (heightM < 10) return 'small';
  if (heightM <= 20) return 'medium';
  return 'tall';
}
