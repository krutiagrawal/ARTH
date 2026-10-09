import { GameKey } from '@arth/db';
import { startOfUtcDay } from '../services/streak.service';

// Deterministic helpers: the same UTC date always yields the same puzzle for every user.

export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = mulberry32(hashString(seed));
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function dayNumber(date: Date): number {
  return Math.floor(startOfUtcDay(date).getTime() / 86_400_000);
}

/** Walks a whole bank one item per day (offset per game) before repeating anything. */
export function cycleIndex(game: GameKey, length: number, date: Date): number {
  return (dayNumber(date) + (hashString(game) % length)) % length;
}

/**
 * Takes `perDay` items a day from a bank. The bank is cut into groups of `perDay`; one group is
 * served a day, and the bank is reshuffled into new groups after each full pass so combinations
 * change. Needs at least `perDay` items; leftover items past the last full group are unused until
 * a reshuffle brings them in.
 */
export function dailyGroup<T>(game: GameKey, bank: readonly T[], perDay: number, date: Date): T[] {
  const groups = Math.max(1, Math.floor(bank.length / perDay));
  const day = dayNumber(date);
  const order = seededShuffle(bank, `${game}:${Math.floor(day / groups)}`);
  const start = (day % groups) * perDay;
  return order.slice(start, start + perDay);
}

export function sameSet(a: readonly (string | number)[], b: readonly (string | number)[]): boolean {
  return a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
}
