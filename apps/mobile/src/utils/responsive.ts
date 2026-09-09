import { Dimensions } from 'react-native';

/**
 * Every screen in this app was styled with fixed dp numbers (SPACING, RADIUS, TYPOGRAPHY, and
 * countless one-off `fontSize`/`padding`/`width` values) tuned by eye against a phone in the
 * ~430-450dp-wide class (a OnePlus-11R-class device). A Pixel 6 (~411dp) renders those same fixed
 * numbers with proportionally less breathing room — same padding, same font size, narrower canvas
 * — which is what reads as "congested." A tablet has the opposite problem: linearly scaling every
 * value up to fill a ~800-1000dp canvas would blow fonts and paddings up to absurd sizes instead
 * of just giving the layout more room.
 *
 * `ms()` (moderate scale) is the standard fix for the phone-to-phone case: nudge a value toward
 * its "true" proportional size for the current screen, by a fraction (`factor`) rather than
 * fully — so a narrower phone gets slightly tighter spacing/text and a wider one gets slightly
 * more, without every value swinging wildly. The scaling *input* width is clamped well below
 * tablet range (`MAX_SCALE_WIDTH`), so this never runs away on a tablet — tablets are handled
 * separately by capping content width (`CONTENT_MAX_WIDTH`) rather than by scaling values up.
 */

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/** The dp-width this app's fixed values were effectively tuned against. */
const BASE_WIDTH = 440;

/** Cap the width used for the scale *calculation* — past this, rely on layout (column counts,
 * max-width containers) instead of linearly scaled fonts/spacing. */
const MAX_SCALE_WIDTH = 500;

const scaleInputWidth = Math.min(SCREEN_WIDTH, MAX_SCALE_WIDTH);
const rawScale = scaleInputWidth / BASE_WIDTH;

/** Android's own "smallest width >= 600dp" heuristic for tablet-class devices. */
export const IS_TABLET = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT) >= 600;

/** Comfortable max width for phone-tuned layouts once they'd otherwise stretch across a tablet. */
export const CONTENT_MAX_WIDTH = 480;

export const SCREEN = { width: SCREEN_WIDTH, height: SCREEN_HEIGHT };

/**
 * A screen's actual *visible* width once AppNavigator's tablet card cap is accounted for.
 * `Dimensions.get('window').width` reports the full device width regardless of that cap, so any
 * component computing a size off raw window width (a grid tile, a full-bleed image, a carousel
 * page) must use this instead on a tablet, or it'll size itself for a canvas wider than the card
 * it's actually confined to.
 */
export const EFFECTIVE_WIDTH = IS_TABLET ? Math.min(SCREEN_WIDTH, CONTENT_MAX_WIDTH) : SCREEN_WIDTH;

/** Moderate-scales `size` toward its proportional value for this screen width. `factor` is how
 * much of the full correction to apply (0 = unchanged, 1 = fully proportional). */
export function ms(size: number, factor = 0.35): number {
  return size + (size * rawScale - size) * factor;
}

export function msRound(size: number, factor = 0.35): number {
  return Math.round(ms(size, factor));
}
