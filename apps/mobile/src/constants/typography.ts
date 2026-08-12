import { Platform } from 'react-native';

const isIOS = Platform.OS === 'ios';

export const FONTS = {
  display: isIOS ? 'Georgia' : 'serif',
  body: isIOS ? 'System' : 'Roboto',
  mono: isIOS ? 'Courier' : 'monospace',
};

export const TYPOGRAPHY = {
  // Display / Hero
  hero: {
    fontSize: 42,
    fontWeight: '800' as const,
    fontFamily: FONTS.display,
    lineHeight: 50,
    letterSpacing: -1,
  },
  display1: {
    fontSize: 36,
    fontWeight: '700' as const,
    fontFamily: FONTS.display,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  display2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },

  // Headings
  h1: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
    letterSpacing: -0.1,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  h4: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },

  // Body
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 26,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 23,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 20,
  },

  // Special
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  number: {
    fontSize: 48,
    fontWeight: '800' as const,
    lineHeight: 56,
    letterSpacing: -2,
  },
  numberSmall: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -1,
  },
  tag: {
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
};
