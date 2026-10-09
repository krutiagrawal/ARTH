import { BadRequestError } from '../utils/errors';
import { QUICK_XP, SubmitGame, maxXpOf, xpFor } from './types';
import { dayNumber, seededShuffle } from './util';

const PAIRS = 6;
/** Moves (two flipped cards = one move) at or under this count as a win. */
const PAR_MOVES = 14;
const POOL = ['🥭', '🥥', '🍊', '🎋', '🌵', '🍌', '🍍', '🍎', '🌻', '🌴'];

function dailyCards(date: Date): string[] {
  const picks = seededShuffle(POOL, `seed_memory:pool:${dayNumber(date)}`).slice(0, PAIRS);
  return seededShuffle([...picks, ...picks], `seed_memory:cards:${dayNumber(date)}`);
}

/**
 * The cards are played entirely on the device, so the server can only check that the reported
 * result is physically plausible (not a perfect, instant run). That's why this game pays the small
 * quick-game XP only.
 */
export const seedMemory: SubmitGame = {
  kind: 'submit',
  meta: {
    key: 'seed_memory',
    title: 'Seed Memory',
    description: `Match all ${PAIRS} pairs in ${PAR_MOVES} moves or fewer`,
    icon: '🧩',
    category: 'puzzle',
    xp: QUICK_XP,
    maxXp: maxXpOf(QUICK_XP),
  },
  maxAttempts: 1,

  state(date, play) {
    const submitted = play?.finished ? (play.guesses[0] as { moves: number; seconds: number } | undefined) : undefined;
    return {
      puzzle: { cards: dailyCards(date), pairs: PAIRS, par: PAR_MOVES },
      result: submitted ? { moves: submitted.moves, seconds: submitted.seconds, par: PAR_MOVES } : null,
    };
  },

  submit(_date, payload) {
    const { moves, seconds } = payload;
    if (!Number.isInteger(moves) || !Number.isInteger(seconds)) throw new BadRequestError('Invalid result');
    // Fewest possible moves is one per pair; and each move needs a moment to flip two cards.
    if (moves! < PAIRS || moves! > 200) throw new BadRequestError('Invalid result');
    if (seconds! < 4 || seconds! < moves! * 0.6 || seconds! > 6 * 3600) throw new BadRequestError('Invalid result');

    const won = moves! <= PAR_MOVES;
    return { status: won ? 'won' : 'completed', xp: xpFor(QUICK_XP, won), stored: { moves, seconds } };
  },
};
