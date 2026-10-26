// Small in-process LRU + TTL cache for per-nursery aggregates (dashboard, impact, stats, reports).
// Per-instance only: with several API instances each keeps its own copy, which is still correct
// because every entry expires on a short TTL and writes invalidate by key prefix. A shared cache
// (Redis) is the upgrade path if instances need to agree instantly.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const MAX_ENTRIES = 2000;
const store = new Map<string, Entry<unknown>>();
// Concurrent callers for the same cold key share one computation instead of stampeding the DB.
const inflight = new Map<string, Promise<unknown>>();

function touch<T>(key: string, entry: Entry<T>) {
  store.delete(key);
  store.set(key, entry);
  if (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
}

export async function cached<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) {
    touch(key, hit);
    return hit.value;
  }
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const run = compute()
    .then((value) => {
      touch(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, run);
  return run;
}

/** Drops every entry whose key starts with `prefix` (e.g. `nursery:<id>:`). */
export function invalidatePrefix(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export const nurseryKey = (nurseryId: string, name: string, params = '') => `nursery:${nurseryId}:${name}:${params}`;
export const nurseryPrefix = (nurseryId: string) => `nursery:${nurseryId}:`;
