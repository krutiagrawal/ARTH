/**
 * Type system. Two families:
 *   - Bricolage Grotesque for display/headline text — screen titles, section headings.
 *   - Figtree for everything else, including every numeral.
 *
 * Figtree is applied by `<Text>`/`<TextInput>` from src/components/common/AppText, which every
 * screen imports in place of the react-native originals; it maps each `fontWeight` onto the
 * matching named face, so ordinary text needs no `fontFamily` of its own. Bricolage is opt-in via
 * the `TEXT.title` / `TEXT.heading` roles below (or `fontFamily: FONTS.display`).
 *
 * Screens should use the semantic `TEXT` roles at the bottom of this file rather than ad-hoc
 * sizes and weights, so the same kind of content looks the same everywhere.
 *
 * IMPORTANT: a named face already encodes its weight. Never pair `fontFamily: FONTS.*Bold` with a
 * `fontWeight` — Android picks one and ignores the other, which reads as the wrong weight rather
 * than as an error. Use the face alone.
 *
 * Display roles keep a ~1.3x line box for tall ascenders/descenders; keep any new display role in
 * that band.
 */

export const FONTS = {
  // Display — Bricolage Grotesque
  display: 'BricolageGrotesque_600SemiBold',
  displayBold: 'BricolageGrotesque_700Bold',
  displayHeavy: 'BricolageGrotesque_800ExtraBold',
  displayMedium: 'BricolageGrotesque_500Medium',
  // Body — Figtree
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemiBold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
  bodyExtraBold: 'Figtree_800ExtraBold',
  mono: 'monospace',
};

/** Weight → Figtree face, used by AppText's `<Text>`/`<TextInput>`. */
export const BODY_FACE_BY_WEIGHT: Record<string, string> = {
  '100': 'Figtree_300Light',
  '200': 'Figtree_300Light',
  '300': 'Figtree_300Light',
  '400': FONTS.body,
  '500': FONTS.bodyMedium,
  '600': FONTS.bodySemiBold,
  '700': FONTS.bodyBold,
  '800': FONTS.bodyExtraBold,
  '900': 'Figtree_900Black',
  normal: FONTS.body,
  bold: FONTS.bodyBold,
};

export const TYPOGRAPHY = {
  // Display / Hero — Bricolage Grotesque. The jump from `displayXL` down to `h2` is intentionally steep;
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

  // Headings — h1/h2 are Bricolage Grotesque, h3/h4 drop to the sans so dense UI stays quiet.
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
  /** Small all-caps kicker that sits directly above a Bricolage heading. Stays in the sans on purpose
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
  // Numerals stay in the sans throughout — Bricolage is reserved for headings, and mixing a rounded
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

/**
 * Semantic text roles — the ONLY styles screens should reach for. Each role fixes the face
 * (display vs body), size, weight and line height, so the same kind of content looks the same on
 * every screen, and changing a font later means editing only FONTS above.
 * Spread one into a style and add only layout/colour: `{ ...TEXT.heading, color }`.
 *
 *   title       Screen title / page hero heading            display, 28
 *   heading     Section header, card title                  display, 20
 *   subheading  Row title, list-item name, sub-section      body semibold, 16
 *   body        Paragraphs, descriptions                    body regular, 15
 *   bodySmall   Secondary descriptions, metadata            body regular, 13
 *   caption     Timestamps, helper text, fine print         body regular, 12
 *   label       ALL-CAPS kicker above a heading, tags       body bold, 11, tracked
 *   button      Text inside buttons and tappable chips      body semibold, 15
 *   stat        Big numeric figures (counts, scores, %)     body extrabold, 28
 *   statSmall   Inline numeric figures in cards             body bold, 20
 *
 * Display roles keep a ~1.3x line box (see the Bricolage note above) — keep any new display role in
 * that band. Glyph/emoji text (←, ×, 🌱) is not typography and should keep its own plain style.
 */
export const TEXT = {
  title: { fontFamily: FONTS.displayBold, fontSize: 28, lineHeight: 37, letterSpacing: -0.2 },
  heading: { fontFamily: FONTS.display, fontSize: 20, lineHeight: 27 },
  subheading: { fontFamily: FONTS.bodySemiBold, fontSize: 16, lineHeight: 23 },
  body: { fontFamily: FONTS.body, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 19 },
  caption: { fontFamily: FONTS.body, fontSize: 12, lineHeight: 17, letterSpacing: 0.1 },
  label: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },
  button: { fontFamily: FONTS.bodySemiBold, fontSize: 15, lineHeight: 20 },
  stat: { fontFamily: FONTS.bodyExtraBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  statSmall: { fontFamily: FONTS.bodyBold, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
} as const;

export type TextRole = keyof typeof TEXT;
