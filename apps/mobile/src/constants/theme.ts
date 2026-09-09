import { COLORS } from './colors';
import { msRound } from '../utils/responsive';

// Scaled once at module load from fixed base values — every screen importing SPACING/RADIUS
// automatically gets a layout that breathes correctly across phone widths. See utils/responsive.ts.
export const SPACING = {
  xs: msRound(4),
  sm: msRound(8),
  md: msRound(16),
  lg: msRound(24),
  xl: msRound(32),
  xxl: msRound(48),
  xxxl: msRound(64),
};

export const RADIUS = {
  sm: msRound(8),
  md: msRound(16),
  lg: msRound(24),
  xl: msRound(32),
  xxl: msRound(40),
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.shadowEarth,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: COLORS.shadowEarth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  lg: {
    shadowColor: COLORS.shadowEarth,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  sage: {
    shadowColor: COLORS.shadowSage,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  golden: {
    shadowColor: COLORS.shadowWarm,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const ANIMATION = {
  fast: 200,
  normal: 350,
  slow: 500,
  verySlow: 800,
  spring: { damping: 15, stiffness: 120, mass: 1 },
  springBouncy: { damping: 10, stiffness: 150, mass: 0.8 },
  springGentle: { damping: 20, stiffness: 80, mass: 1.2 },
};

export const GLASS_STYLE = {
  backgroundColor: 'rgba(255, 255, 255, 0.18)',
  borderColor: 'rgba(255, 255, 255, 0.3)',
  borderWidth: 1,
  borderRadius: RADIUS.lg,
  ...SHADOWS.md,
};

export const GLASS_DARK_STYLE = {
  backgroundColor: 'rgba(13, 35, 24, 0.6)',
  borderColor: 'rgba(135, 168, 120, 0.2)',
  borderWidth: 1,
  borderRadius: RADIUS.lg,
};
