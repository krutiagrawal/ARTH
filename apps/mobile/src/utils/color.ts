/** '#RRGGBB' -> 'rgba(r,g,b,alpha)'. Used to turn a theme's opaque hex tokens (e.g.
 * `theme.cardBackground`) into a translucent overlay color for glassmorphism (BlurView + tinted
 * overlay) without hardcoding a fixed white/black tint. */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Perceived brightness of a '#RRGGBB' color, 0 (black) to 1 (white). WCAG relative luminance,
 * so the sRGB channels are linearised first — a plain (r+g+b)/3 average badly misjudges greens
 * and blues, which is exactly the range the time-of-day themes live in. */
export function relativeLuminance(hex: string): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const r = channel(parseInt(hex.slice(1, 3), 16));
  const g = channel(parseInt(hex.slice(3, 5), 16));
  const b = channel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two '#RRGGBB' colors, 1 (identical) to 21 (black on white).
 * Used to decide whether a period's `accentColor` is still legible against the surface it lands
 * on: Night's accent (#5B60C6) sits on a deep indigo seam (#2A306B) and all but disappears, so
 * callers fall back to the seam's own text color rather than rendering a label nobody can read. */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Blends two '#RRGGBB' colors, `t` 0 → all `hex`, 1 → all `toward`. Kept in sRGB space (no
 * linearisation) because this is a decorative sheen, not a contrast calculation. */
export function mixHex(hex: string, toward: string, t: number): string {
  const ch = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
  const blend = (i: number) => Math.round(ch(hex, i) + (ch(toward, i) - ch(hex, i)) * t);
  const hx = (v: number) => v.toString(16).padStart(2, '0');
  return `#${hx(blend(1))}${hx(blend(3))}${hx(blend(5))}`;
}
