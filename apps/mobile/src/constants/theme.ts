import { COLORS } from './colors';

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const RADIUS = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
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
