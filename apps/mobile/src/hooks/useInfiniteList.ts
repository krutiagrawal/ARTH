import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/**
 * How many pages an infinite list keeps in memory (and re-requests when it goes stale). Old pages
 * beyond this are dropped, so a list of thousands never holds - or refetches - all of it at once.
 */
export const MAX_CACHED_PAGES = 30;

/** Lists change slowly; serve them from cache this long before quietly refreshing in the background. */
export const LIST_STALE_MS = 2 * 60_000;

/** Cursor envelope returned by every paginated list endpoint (see services/api utils/pagination.ts). */
export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/** Appends `?cursor=&take=` (plus any extra params) to a list path. */
export function pagedPath(path: string, cursor?: string, extra: Record<string, string | undefined> = {}, take = 20): string {
  const q = new URLSearchParams({ take: String(take) });
  if (cursor) q.set('cursor', cursor);
  for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v);
  return `${path}?${q.toString()}`;
}

/** useInfiniteQuery options for the `Page<T>` envelope. */
export function pageParams<T>() {
  return {
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<T>) => last.nextCursor ?? undefined,
    // Bound memory/refetch cost on very long lists: only the newest pages stay cached.
    maxPages: MAX_CACHED_PAGES,
  };
}

export function flattenPages<T>(data: { pages: Page<T>[] } | undefined): T[] {
  return data ? data.pages.flatMap((p) => p.items) : [];
}

/** Spread onto a ScrollView to load the next page when the user nears the bottom. */
export function infiniteScrollProps(q: { hasNextPage?: boolean; isFetchingNextPage: boolean; fetchNextPage: () => unknown }) {
  return {
    scrollEventThrottle: 200,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      if (q.hasNextPage && !q.isFetchingNextPage && layoutMeasurement.height + contentOffset.y >= contentSize.height - 400) {
        q.fetchNextPage();
      }
    },
  };
}

/**
 * useInfiniteQuery options for endpoints that page by `page` + `take` and report a `total`.
 * `getItems` picks the row array out of each response so we can tell when everything is loaded.
 */
export function totalPageParams<R extends { total: number }>(getItems: (r: R) => unknown[]) {
  return {
    initialPageParam: 1,
    // Works from the page number rather than from how many pages are held: once `maxPages` drops the
    // oldest pages, `all.length` stops growing, so counting pages (or loaded rows) would ask for the
    // same page again forever and never reach the end of a long list.
    getNextPageParam: (last: R, all: R[], lastPageParam: number) => {
      const lastLen = getItems(last).length;
      if (lastLen === 0) return undefined;
      const pageSize = all.length > 1 ? getItems(all[0]).length : lastLen;
      return (lastPageParam - 1) * pageSize + lastLen < last.total ? lastPageParam + 1 : undefined;
    },
    maxPages: MAX_CACHED_PAGES,
  };
}

/** Flattens pages from `totalPageParams`. Rows are de-duplicated by id: offset paging can repeat a row when new ones arrive mid-scroll. */
export function flattenTotalPages<R, T extends { id: string }>(data: { pages: R[] } | undefined, getItems: (r: R) => T[]): T[] {
  if (!data) return [];
  const seen = new Set<string>();
  return data.pages.flatMap(getItems).filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)));
}

/**
 * `select` for a `totalPageParams` query whose consumers want one merged response: metadata
 * (total, counts, ...) comes from the newest page and `key`'s rows from all loaded pages, de-duplicated.
 */
export function mergePages<R extends { total: number }, K extends keyof R>(key: K) {
  return (data: { pages: R[] }): R => {
    const seen = new Set<string>();
    const rows = data.pages
      .flatMap((p) => p[key] as unknown as { id?: string; followId?: string }[])
      .filter((r) => {
        const id = (r.followId ?? r.id) as string;
        return seen.has(id) ? false : (seen.add(id), true);
      });
    return { ...data.pages[data.pages.length - 1], [key]: rows } as R;
  };
}

/** Options for a `{ total, [key]: rows[] }` endpoint paged by `page` + `take`; consumers keep the merged single-response shape. */
export function totalInfinite<R extends { total: number }, K extends keyof R>(key: K) {
  return {
    ...totalPageParams<R>((p) => p[key] as unknown as unknown[]),
    select: mergePages<R, K>(key),
  };
}

/** `select` that flattens `Page<T>` pages into one array, so screens keep reading `data` as T[]. */
export function flatItems<T>(data: { pages: Page<T>[] }): T[] {
  return data.pages.flatMap((p) => p.items);
}

/** Options for list endpoints that return a bare array paged by `page` + `take` (no total): a short page is the last one. */
export function arrayPageParams<T>(take: number) {
  return {
    initialPageParam: 1,
    getNextPageParam: (last: T[], _all: T[][], lastPageParam: number) => (last.length === take ? lastPageParam + 1 : undefined),
    maxPages: MAX_CACHED_PAGES,
  };
}

/** `select` flattening `arrayPageParams` pages. */
export function flatArrays<T>(data: { pages: T[][] }): T[] {
  return data.pages.flat();
}
