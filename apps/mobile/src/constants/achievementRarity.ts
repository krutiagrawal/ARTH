import { COLORS } from './colors';

// Split out of AchievementGrid.tsx so AchievementShareCard (which AchievementGrid renders inside
// its share modal) doesn't have to import AchievementGrid back just for this lookup table — that
// was a require cycle.
export const RARITY_COLORS: Record<string, [string, string]> = {
  common: [COLORS.sage, COLORS.sageDark],
  rare: [COLORS.xpBlue, COLORS.xpBlueDark],
  epic: [COLORS.coral, '#C0392B'],
  legendary: [COLORS.golden, COLORS.earth],
};
