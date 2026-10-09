import { BadRequestError } from '../utils/errors';
import { GuessGame, HEAVY_XP, maxXpOf } from './types';
import { dayNumber, seededShuffle } from './util';

const SIZE = 4;
const CELLS = SIZE * SIZE;
const GIVENS = 7;
const MAX_ATTEMPTS = 3;
const SYMBOL_POOL = ['🌳', '🌴', '🌵', '🌺', '🌻', '🍀', '🌿', '🪴'];

type Entry = { grid: number[]; conflicts: number[] };

/** A seeded 4×4 Latin square (every symbol once per row and column) plus a set of prefilled cells. */
function dailyPuzzle(date: Date) {
  const seed = `plant_grid:${dayNumber(date)}`;
  const idx = [0, 1, 2, 3];
  const rows = seededShuffle(idx, `${seed}:rows`);
  const cols = seededShuffle(idx, `${seed}:cols`);
  const syms = seededShuffle(idx, `${seed}:syms`);
  // Permuting the rows, columns and symbols of a cyclic square keeps it a valid Latin square.
  const solution: number[] = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) solution.push(syms[(rows[r] + cols[c]) % SIZE]);

  const givenCells = new Set(seededShuffle(Array.from({ length: CELLS }, (_, i) => i), `${seed}:givens`).slice(0, GIVENS));
  const givens: (number | null)[] = solution.map((s, i) => (givenCells.has(i) ? s : null));
  const symbols = seededShuffle(SYMBOL_POOL, `${seed}:symbols`).slice(0, SIZE);
  return { solution, givens, symbols };
}

/** Cells whose symbol repeats elsewhere in their row or column. */
function findConflicts(grid: number[]): number[] {
  const bad = new Set<number>();
  for (let i = 0; i < SIZE; i++) {
    for (const line of [
      Array.from({ length: SIZE }, (_, j) => i * SIZE + j), // row i
      Array.from({ length: SIZE }, (_, j) => j * SIZE + i), // column i
    ]) {
      const seen = new Map<number, number>();
      for (const cell of line) {
        const prev = seen.get(grid[cell]);
        if (prev !== undefined) {
          bad.add(prev);
          bad.add(cell);
        } else {
          seen.set(grid[cell], cell);
        }
      }
    }
  }
  return [...bad].sort((a, b) => a - b);
}

export const plantGrid: GuessGame = {
  kind: 'guess',
  meta: {
    key: 'plant_grid',
    title: 'Plant Grid',
    description: 'One of each plant in every row and column',
    icon: '🟩',
    category: 'puzzle',
    xp: HEAVY_XP,
    maxXp: maxXpOf(HEAVY_XP),
  },
  maxAttempts: MAX_ATTEMPTS,

  state(date, play) {
    const { solution, givens, symbols } = dailyPuzzle(date);
    return {
      puzzle: { size: SIZE, symbols, givens },
      guesses: (play?.guesses ?? []) as Entry[],
      answer: play?.finished ? solution : null,
    };
  },

  guess(date, previous, input) {
    if (!Array.isArray(input) || input.length !== CELLS) throw new BadRequestError('Fill every square');
    const grid = input.map((v) => Number(v));
    if (grid.some((v) => !Number.isInteger(v) || v < 0 || v >= SIZE)) throw new BadRequestError('Fill every square');

    const { givens } = dailyPuzzle(date);
    if (givens.some((g, i) => g !== null && g !== grid[i])) throw new BadRequestError('The starting plants cannot be changed');

    const conflicts = findConflicts(grid);
    const solved = conflicts.length === 0;
    return {
      entry: { grid, conflicts } satisfies Entry,
      outcome: solved ? 'won' : previous.length + 1 >= MAX_ATTEMPTS ? 'lost' : 'continue',
    };
  },
};
