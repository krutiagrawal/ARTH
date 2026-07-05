// Mirrors backend/prisma/seed.ts `forest_level_tiers` — presentation-only display labels for a user's numeric level.
const FOREST_LEVEL_TIERS: { minLevel: number; name: string }[] = [
  { minLevel: 1, name: 'Sprout' },
  { minLevel: 2, name: 'Sapling' },
  { minLevel: 3, name: 'Young Tree' },
  { minLevel: 4, name: 'Growing Grove' },
  { minLevel: 5, name: 'Established Grove' },
  { minLevel: 6, name: 'Flourishing Forest' },
  { minLevel: 7, name: 'Thriving Woodland' },
  { minLevel: 8, name: 'Ancient Grove' },
  { minLevel: 9, name: 'Elder Forest' },
  { minLevel: 10, name: 'Legendary Grove' },
  { minLevel: 11, name: 'Mythic Canopy' },
];

const XP_PER_LEVEL = 500;

export function getForestLevelLabel(level: number): string {
  let label = FOREST_LEVEL_TIERS[0].name;
  for (const tier of FOREST_LEVEL_TIERS) {
    if (level >= tier.minLevel) label = tier.name;
  }
  return label;
}

export function getXpProgress(xp: number, level: number): { current: number; needed: number; progress: number } {
  const currentLevelFloor = (level - 1) * XP_PER_LEVEL;
  const current = xp - currentLevelFloor;
  return { current, needed: XP_PER_LEVEL, progress: Math.min(1, current / XP_PER_LEVEL) };
}
