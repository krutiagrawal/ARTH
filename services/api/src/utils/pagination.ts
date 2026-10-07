/**
 * Shared cursor pagination for list endpoints. Fetches take+1 rows so `hasMore` is known without
 * a COUNT query; the cursor is the last returned row's id (callers must order by a stable key
 * ending in id, e.g. `[{ createdAt: 'desc' }, { id: 'desc' }]`).
 */
export interface CursorQuery {
  cursor?: string;
  take?: number | string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export function parseTake(raw: number | string | undefined, def = 20, max = 50): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(Math.floor(n), max);
}

/** Page size plus the Prisma args to spread into findMany (`take`+1, and cursor/skip when resuming). */
export function cursorArgs(q: CursorQuery, def = 20, max = 50) {
  const take = parseTake(q.take, def, max);
  return {
    take,
    args: {
      take: take + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    },
  };
}

export function toCursorPage<T extends { id: string }, U = T>(
  rows: T[],
  take: number,
  map?: (row: T) => U,
): CursorPage<U> {
  const hasMore = rows.length > take;
  const page = hasMore ? rows.slice(0, take) : rows;
  return {
    items: page.map((r) => (map ? map(r) : (r as unknown as U))),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}
