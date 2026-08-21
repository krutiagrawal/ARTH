export const COLORS = {
  // Primary greens
  sage: '#87A878',
  sageLight: '#A8C499',
  sageDark: '#5E8550',
  forest: '#2D5A27',
  forestDeep: '#1A3A16',
  mint: '#C8E6C0',
  mintLight: '#E8F5E1',

  // Earthy beiges/browns
  beige: '#F5EDD6',
  beigeLight: '#FAF5E8',
  cream: '#FFF8ED',
  sand: '#E8D5B0',
  earth: '#8B6B47',
  earthDark: '#5C3D1E',
  warmBrown: '#A0724A',
  bark: '#6B4423',

  // Accent/warm
  golden: '#D4A853',
  amber: '#E8B84B',
  amberLight: '#F5D070',
  peach: '#F0C090',
  coral: '#E8896A',
  sunrise: '#FFB347',

  // Sky/water
  skyDay: '#B8D9F0',
  skyDawn: '#F4A460',
  skyNight: '#2C3E6B',

  // Dark/night
  nightSky: '#1A2744',
  nightForest: '#0D2318',
  nightDeep: '#080F1E',

  // UI
  white: '#FFFFFF',
  offWhite: '#F8F5F0',
  glass: 'rgba(255, 255, 255, 0.15)',
  glassDark: 'rgba(0, 0, 0, 0.15)',
  glassSage: 'rgba(135, 168, 120, 0.2)',
  glassSageSubtle: 'rgba(135, 168, 120, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.4)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',

  // Text
  textPrimary: '#2D2A25',
  textSecondary: '#6B5E4A',
  textMuted: '#9E8E78',
  textLight: '#C4B49A',
  textWhite: '#FFFFFF',

  // Streaks / gamification
  streakFire: '#FF6B35',
  streakGold: '#FFD700',
  streakGoldDark: '#CC9900',
  xpBlue: '#4A90D9',
  xpBlueDark: '#2E6BAF',

  // Achievement
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',

  // Danger / destructive (in-family warm red, not a generic Material red)
  danger: '#C24A3B',
  dangerDark: '#8E3229',
  dangerLight: '#E8A99C',

  // Shadows
  shadowSage: 'rgba(94, 133, 80, 0.3)',
  shadowEarth: 'rgba(91, 61, 30, 0.2)',
  shadowWarm: 'rgba(212, 168, 83, 0.3)',
};

// Semantic text-on-surface tokens. Prefer these over reaching for `COLORS.white`/`textPrimary`
// directly next to a background color pick — several screens picked the wrong one because a raw
// palette gives no signal about which surface a color is meant to sit on (e.g. text styles named
// "...Dark" ended up meaning "dark text" in one file and "text for a dark surface" in another,
// and the latter sometimes landed on a light background by mistake). Pick the surface this text
// actually sits on, not the aesthetic you're going for.
export const ON_LIGHT_SURFACE = {
  primary: COLORS.textPrimary,
  secondary: COLORS.textSecondary,
  muted: COLORS.textMuted,
};

export const ON_DARK_SURFACE = {
  primary: COLORS.textWhite,
  secondary: 'rgba(255, 255, 255, 0.7)',
  muted: 'rgba(255, 255, 255, 0.5)',
};

export const GRADIENTS = {
  sageToForest: ['#A8C499', '#2D5A27'],
  creamToSand: ['#FFF8ED', '#E8D5B0'],
  sunriseSky: ['#FFB347', '#F4A460', '#B8D9F0'],
  forestDepth: ['#1A3A16', '#2D5A27', '#5E8550'],
  warmEarth: ['#F5EDD6', '#E8D5B0', '#A0724A'],
  nightSky: ['#080F1E', '#1A2744', '#2C3E6B'],
  goldenHour: ['#E8B84B', '#D4A853', '#A0724A'],
  mintFresh: ['#E8F5E1', '#C8E6C0', '#87A878'],
  peachDawn: ['#FFF8ED', '#F0C090', '#E8896A'],
  deepForest: ['#0D2318', '#1A3A16', '#2D5A27'],
};
