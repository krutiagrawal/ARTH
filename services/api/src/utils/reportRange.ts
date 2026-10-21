import { BadRequestError } from './errors';

const DAY_MS = 86_400_000;

export type Granularity = 'day' | 'week' | 'month';

export interface ReportRange {
  /** Inclusive start (00:00:00.000 of the From day). */
  from: Date;
  /** Inclusive end (23:59:59.999 of the To day, or now when To is today/unset). */
  to: Date;
  /** The equal-length window immediately before this one, for "vs previous period" deltas; null for All time. */
  previous: { from: Date; to: Date } | null;
  granularity: Granularity;
  allTime: boolean;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/**
 * Turns the `from`/`to` query params into a report window. Both are optional: no `from` means
 * "All time" (counted from `earliest`), no `to` means up to now. Day boundaries use the server's
 * local day, the same convention as the rest of the API.
 */
export function resolveReportRange(from: Date | undefined, to: Date | undefined, earliest: Date): ReportRange {
  const end = endOfDay(to ?? new Date());
  const allTime = !from;
  const start = startOfDay(from ?? earliest);
  if (start.getTime() > end.getTime()) throw new BadRequestError('The start date must be on or before the end date');

  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / DAY_MS));
  const granularity: Granularity = days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';

  let previous: ReportRange['previous'] = null;
  if (!allTime) {
    const span = end.getTime() - start.getTime() + 1;
    previous = { from: new Date(start.getTime() - span), to: new Date(start.getTime() - 1) };
  }
  return { from: start, to: end, previous, granularity, allTime };
}

/** First instant of the bucket a date falls into (weeks start on Monday). */
function bucketStart(d: Date, g: Granularity): Date {
  const x = startOfDay(d);
  if (g === 'week') {
    const dow = x.getDay(); // 0 = Sun
    x.setDate(x.getDate() - (dow === 0 ? 6 : dow - 1));
  } else if (g === 'month') {
    x.setDate(1);
  }
  return x;
}

function nextBucket(d: Date, g: Granularity): Date {
  const x = new Date(d);
  if (g === 'day') x.setDate(x.getDate() + 1);
  else if (g === 'week') x.setDate(x.getDate() + 7);
  else x.setMonth(x.getMonth() + 1);
  return x;
}

export interface SeriesPoint {
  /** ISO timestamp of the bucket's first day. */
  start: string;
  count: number;
  value: number;
}

/**
 * Buckets rows by date into a gap-filled series across the whole window (empty days/weeks/months
 * are zero, not missing). `value` sums `weight` per row (e.g. rupees); `count` counts rows.
 */
export function bucketize<T>(rows: T[], range: ReportRange, at: (row: T) => Date, weight?: (row: T) => number): SeriesPoint[] {
  const points = new Map<number, SeriesPoint>();
  for (let cur = bucketStart(range.from, range.granularity); cur.getTime() <= range.to.getTime(); cur = nextBucket(cur, range.granularity)) {
    points.set(cur.getTime(), { start: cur.toISOString(), count: 0, value: 0 });
  }
  for (const row of rows) {
    const key = bucketStart(at(row), range.granularity).getTime();
    const p = points.get(key);
    if (!p) continue;
    p.count += 1;
    p.value += weight ? weight(row) : 1;
  }
  return Array.from(points.values());
}
