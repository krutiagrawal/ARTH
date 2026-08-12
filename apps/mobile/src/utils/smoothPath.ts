export interface Point {
  x: number;
  y: number;
}

/**
 * Converts a raw list of touch-sampled points into a smooth SVG path `d` string using quadratic
 * bezier midpoint smoothing: each consecutive pair's midpoint becomes a curve anchor, and the
 * actual sampled point becomes the control point. This is the standard, dependency-free technique
 * for turning jittery finger input into a naturally flowing curve (used by most freehand/signature
 * drawing implementations). Used both for the live draw preview and the final placed shape, so they
 * render identically.
 */
export function pointsToSmoothPathD(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    d += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

/** Bounding box of a set of points, in the same units as the input. */
export function pointsBoundingBox(points: Point[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Straight-line distance between two points. */
export function pointDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
