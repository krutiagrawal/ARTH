/** Levenshtein edit distance — single-row DP, O(n*m) time and O(min(n,m)) space. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= b.length; j++) {
      currRow[j] =
        a[i - 1] === b[j - 1]
          ? prevRow[j - 1]
          : 1 + Math.min(prevRow[j - 1], prevRow[j], currRow[j - 1]);
    }
    prevRow = currRow;
  }
  return prevRow[b.length];
}

/** 1 = identical, 0 = completely different — normalized so short and long names are comparable. */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length, 1);
  return 1 - levenshtein(a, b) / maxLen;
}

const FUZZY_THRESHOLD = 0.5;

/**
 * Ranks a catalog of named items against a free-text query, catching both partial typing
 * ("ros" -> "Rose") and typos/misspellings ("roze" -> "Rose", "gulmohr" -> "Gulmohar") — the
 * latter is what a plain substring filter misses, which is what leads someone to add a
 * near-duplicate catalog entry instead of finding the one that already exists.
 */
export function fuzzyMatch<T>(query: string, items: T[], getName: (item: T) => string, limit = 8): T[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  return items
    .map((item) => {
      const name = getName(item).toLowerCase();
      const isSubstring = name.includes(q) || q.includes(name);
      const score = isSubstring ? 1 : similarity(q, name);
      return { item, score };
    })
    .filter((x) => x.score >= FUZZY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}
