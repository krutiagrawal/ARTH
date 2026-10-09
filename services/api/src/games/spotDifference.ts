import { BadRequestError } from '../utils/errors';
import { HEAVY_XP, SubmitGame, maxXpOf, xpFor } from './types';
import { dayNumber, sameSet, seededShuffle } from './util';

const SIZE = 5;
const CELLS = SIZE * SIZE;
const DIFFERENCES = 3;
const POOL = ['🌲', '🌳', '🌴', '🌵', '🌿', '🍀', '🌻', '🌼', '🍄', '🦋', '🐝', '🐦', '🌸', '🍃'];

function dailyScene(date: Date) {
  const seed = `spot_difference:${dayNumber(date)}`;
  // Scene A: each cell drawn from the pool via a long shuffled stream.
  const stream = seededShuffle(Array.from({ length: CELLS * 3 }, (_, i) => POOL[i % POOL.length]), `${seed}:a`);
  const a = stream.slice(0, CELLS);
  // Pick which cells differ, then swap each for a different emoji.
  const cells = seededShuffle(Array.from({ length: CELLS }, (_, i) => i), `${seed}:cells`).slice(0, DIFFERENCES).sort((x, y) => x - y);
  const b = [...a];
  cells.forEach((cell, i) => {
    const replacements = seededShuffle(POOL.filter((e) => e !== a[cell]), `${seed}:r${i}`);
    b[cell] = replacements[0];
  });
  return { a, b, cells };
}

export const spotDifference: SubmitGame = {
  kind: 'submit',
  meta: {
    key: 'spot_difference',
    title: 'Spot the Difference',
    description: 'Find the 3 changes in the forest',
    icon: '🔍',
    category: 'puzzle',
    xp: HEAVY_XP,
    maxXp: maxXpOf(HEAVY_XP),
  },
  maxAttempts: 1,

  state(date, play) {
    const { a, b, cells } = dailyScene(date);
    const submitted = play?.finished ? (play.guesses[0] as { cells: number[] } | undefined) : undefined;
    return {
      puzzle: { size: SIZE, a, b, differences: DIFFERENCES },
      result: play?.finished ? { cells, chosen: submitted?.cells ?? [] } : null,
    };
  },

  submit(date, payload) {
    const chosen = payload.cells;
    if (!chosen || chosen.length !== DIFFERENCES) throw new BadRequestError(`Pick exactly ${DIFFERENCES} cells`);
    if (chosen.some((c) => !Number.isInteger(c) || c < 0 || c >= CELLS) || new Set(chosen).size !== DIFFERENCES) {
      throw new BadRequestError('Pick ' + DIFFERENCES + ' different cells');
    }
    const { cells } = dailyScene(date);
    const won = sameSet(chosen, cells);
    return { status: won ? 'won' : 'lost', xp: xpFor(HEAVY_XP, won), stored: { cells: chosen } };
  },
};
