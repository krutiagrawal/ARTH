/** '#RRGGBB' -> 'rgba(r,g,b,alpha)'. Used to turn a theme's opaque hex tokens (e.g.
 * `theme.cardBackground`) into a translucent overlay color for glassmorphism (BlurView + tinted
 * overlay) without hardcoding a fixed white/black tint. */
export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
