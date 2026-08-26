/**
 * Type system. Two families, deliberately far apart so headings read as "designed" rather than
 * as bigger body text:
 *   - Baloo 2 (rounded display) for display/headline text — screen titles, section headings.
 *   - Nunito Sans for everything else, including every numeral.
 *
 * Nunito Sans is applied by `<Text>`/`<TextInput>` from src/components/common/AppText, which every
 * screen imports in place of the react-native originals; it maps each `fontWeight` onto the
 * matching named face, so ordinary text needs no `fontFamily` of its own. Baloo 2 is opt-in: set
 * `fontFamily: FONTS.display` on the styles that should carry it, or spread one of the display
 * TYPOGRAPHY entries below.
 *
 * IMPORTANT: a named face already encodes its weight. Never pair `fontFamily: FONTS.*Bold` with a
 * `fontWeight` — Android picks one and ignores the other, which reads as the wrong weight rather
 * than as an error. Use the face alone.
 *
 * IMPORTANT: Baloo 2 needs a taller line box than a normal sans. It carries a large x-height and
 * long descenders (the family also covers Devanagari), and Android clips them outright when
 * `lineHeight` drops much below ~1.3x the font size — a silent, device-specific bug that looks
 * like a cropped 'g'. Every display entry here sits at 1.30–1.36x for that reason; keep any new
 * one in that band. Baloo is also already tightly fitted, so the aggressive negative tracking the
 * previous serif wanted (-1 at 42px) collides here — the values below are much gentler.
 */

export const FONTS = {
  // Display — Baloo 2
  display: 'Baloo2_600SemiBold',
  displayBold: 'Baloo2_700Bold',
  displayHeavy: 'Baloo2_800ExtraBold',
  displayMedium: 'Baloo2_500Medium',
  // Body — Nunito Sans
  body: 'NunitoSans_400Regular',
  bodyMedium: 'NunitoSans_500Medium',
  bodySemiBold: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
  bodyExtraBold: 'NunitoSans_800ExtraBold',
  mono: 'monospace',
};

/** Weight → Nunito Sans face, used by AppText's `<Text>`/`<TextInput>`. */
export const BODY_FACE_BY_WEIGHT: Record<string, string> = {
  '100': 'NunitoSans_200ExtraLight',
  '200': 'NunitoSans_200ExtraLight',
  '300': 'NunitoSans_300Light',
  '400': FONTS.body,
  '500': FONTS.bodyMedium,
  '600': FONTS.bodySemiBold,
  '700': FONTS.bodyBold,
  '800': FONTS.bodyExtraBold,
  '900': 'NunitoSans_900Black',
  normal: FONTS.body,
  bold: FONTS.bodyBold,
};

export const TYPOGRAPHY = {
  // Display / Hero — Baloo 2. The jump from `displayXL` down to `h2` is intentionally steep;
  // a wide gap between the display and body scales is what carries the "two font" feel.
  displayXL: {
    fontSize: 52,
    fontFamily: FONTS.displayHeavy,
    lineHeight: 68,
    letterSpacing: -0.8,
  },
  hero: {
    fontSize: 42,
    fontFamily: FONTS.displayBold,
    lineHeight: 56,
    letterSpacing: -0.6,
  },
  display1: {
    fontSize: 34,
    fontFamily: FONTS.displayBold,
    lineHeight: 45,
    letterSpacing: -0.4,
  },
  display2: {
    fontSize: 27,
    fontFamily: FONTS.display,
    lineHeight: 36,
    letterSpacing: -0.2,
  },

  // Headings — h1/h2 are Baloo, h3/h4 drop to the sans so dense UI stays quiet.
  h1: {
    fontSize: 23,
    fontFamily: FONTS.display,
    lineHeight: 31,
    letterSpacing: -0.1,
  },
  h2: {
    fontSize: 19,
    fontFamily: FONTS.display,
    lineHeight: 26,
    letterSpacing: 0,
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
  /** Small all-caps kicker that sits directly above a Baloo heading. Stays in the sans on purpose
   * — the contrast between a wide-tracked sans kicker and a tight rounded display line is what
   * makes the pairing look deliberate. Mirrors the web site's `.eyebrow`. */
  kicker: {
    fontSize: 11,
    fontFamily: FONTS.bodyBold,
    lineHeight: 15,
    letterSpacing: 1.6,
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
  // Numerals stay in the sans throughout — Baloo is reserved for headings, and mixing a rounded
  // display figure into a row of sans ones (StatDisplay's sizes sit side by side) reads as a
  // mistake. This is also what keeps the admin console looking like a console.
  numberTiny: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.4,
  },
  tag: {
    fontSize: 11,
    fontWeight: '700' as const,
    lineHeight: 16,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
};
