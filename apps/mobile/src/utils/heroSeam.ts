import { COLORS, ON_DARK_SURFACE } from '../constants/colors';
import { hexToRgba, relativeLuminance } from './color';
import type { TimeTheme } from '../hooks/useTimeTheme';

/**
 * The page background directly beneath the hero illustration. Normally just `theme.cardBackground`
 * (matches the other cards), but several periods' real illustrations end on ground that isn't the
 * near-white card tone — a plain seam there reads as a blank gap, so those get their own value.
 *
 * Shared by the user Home screen and the NGO dashboard, which render the same hero block.
 */
export function getHeroSeamColor(theme: TimeTheme): string {
  // afternoon.png ends on green grass, not white.
  if (theme.period === 'afternoon') return '#E3F4E8';
  // Night's cardTint went light (periwinkle cards, dark text) to match its reference mockup, but
  // the night.png illustration's ground/lake stays a deep indigo — the page background behind the
  // hero must follow the illustration, not the (now much lighter) card color, or the seam breaks.
  if (theme.period === 'night') return '#2A306B';
  // Same class of mismatch as Afternoon/Night: dawn.png's ground is a saturated purple-mauve, not
  // the near-white cardBackground — reuse the theme's own mid-hill tone instead of a new hex.
  if (theme.period === 'dawn') return '#D9B8E8';
  // morning.png's ground is bright green meadow vs. a pure-white cardBackground — Morning already
  // has a ready pale-green token for this (cardBackgroundAlt), so reuse it instead of a new hex.
  if (theme.period === 'morning') return theme.cardBackgroundAlt;
  return theme.cardBackground;
}

/**
 * Text colours for headings and body copy that sit directly on the seam background — i.e. on the
 * page itself rather than on a card.
 *
 * Do **not** reach for `theme.textOnSky` here. That token is for text overlaid on the *sky
 * illustration*, which is saturated at every period, so it's white for Golden Hour, Sunset, Night
 * and Late Night. The seam below the hero is a completely different surface: at Golden Hour it's
 * a pale peach (#FFF3EA), and white-on-peach is invisible. That mismatch is what left the NGO
 * dashboard's section headings unreadable in the warm periods.
 *
 * On a light seam the period's own `textPrimaryOnCard` is used, so headings pick up the scenery's
 * hue — dark maroon at Golden Hour, dark pink at Sunset, dark green at Morning — rather than a
 * flat neutral black. The luminance checks are what keep Night honest: its seam is a deep indigo
 * while its `textPrimaryOnCard` is a dark navy meant for pale lavender cards, so that period
 * (alone among the light-card periods) has to flip to white.
 */
export function getHeroSeamTextColors(theme: TimeTheme): { primary: string; secondary: string } {
  const seam = getHeroSeamColor(theme);

  if (relativeLuminance(seam) < 0.4) {
    return { primary: ON_DARK_SURFACE.primary, secondary: ON_DARK_SURFACE.secondary };
  }

  const tinted = theme.textPrimaryOnCard;
  const primary = relativeLuminance(tinted) < 0.35 ? tinted : COLORS.textPrimary;
  return { primary, secondary: hexToRgba(primary, 0.72) };
}
