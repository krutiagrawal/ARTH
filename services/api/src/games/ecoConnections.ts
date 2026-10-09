import { BadRequestError } from '../utils/errors';
import { CONNECTIONS_PUZZLES } from '../data/games/connections';
import { GuessGame, HEAVY_XP, maxXpOf } from './types';
import { cycleIndex, dayNumber, sameSet, seededShuffle } from './util';

const MAX_MISTAKES = 4;
const GROUP_SIZE = 4;

type Entry = { words: string[]; result: 'correct' | 'one_away' | 'wrong'; group?: number };

function dailyPuzzle(date: Date) {
  return CONNECTIONS_PUZZLES[cycleIndex('eco_connections', CONNECTIONS_PUZZLES.length, date)];
}

function groupOf(puzzle: ReturnType<typeof dailyPuzzle>, idx: number) {
  const g = puzzle.groups[idx];
  return { category: g.category, words: [...g.words], level: idx };
}

export const ecoConnections: GuessGame = {
  kind: 'guess',
  meta: {
    key: 'eco_connections',
    title: 'Eco Connections',
    description: 'Group 16 words into 4 hidden categories',
    icon: '🔗',
    category: 'puzzle',
    xp: HEAVY_XP,
    maxXp: maxXpOf(HEAVY_XP),
  },
  // For this game the limit is mistakes, not total guesses.
  maxAttempts: MAX_MISTAKES,

  state(date, play) {
    const puzzle = dailyPuzzle(date);
    const entries = (play?.guesses ?? []) as Entry[];
    const solved = entries.filter((e) => e.result === 'correct' && e.group !== undefined).map((e) => groupOf(puzzle, e.group!));
    const allWords = puzzle.groups.flatMap((g) => [...g.words]);
    return {
      puzzle: {
        words: seededShuffle(allWords, `eco_connections:${dayNumber(date)}`),
        groupSize: GROUP_SIZE,
        maxMistakes: MAX_MISTAKES,
      },
      guesses: entries.map((e) => ({ words: e.words, result: e.result })),
      solved,
      mistakes: entries.filter((e) => e.result !== 'correct').length,
      answer: play?.finished ? puzzle.groups.map((_, i) => groupOf(puzzle, i)) : null,
    };
  },

  guess(date, previous, input) {
    if (!Array.isArray(input) || input.length !== GROUP_SIZE) throw new BadRequestError(`Pick ${GROUP_SIZE} words`);
    const words = input.map((w) => String(w).trim().toUpperCase());
    const puzzle = dailyPuzzle(date);
    const all = new Set(puzzle.groups.flatMap((g) => [...g.words]));
    if (words.some((w) => !all.has(w)) || new Set(words).size !== GROUP_SIZE) throw new BadRequestError('Pick 4 different words from the board');

    const entries = previous as Entry[];
    const solvedWords = new Set(
      entries.filter((e) => e.result === 'correct').flatMap((e) => e.words),
    );
    if (words.some((w) => solvedWords.has(w))) throw new BadRequestError('Those words are already grouped');
    if (entries.some((e) => sameSet(e.words, words))) throw new BadRequestError('You already tried that group');

    let best = 0;
    let bestGroup = -1;
    puzzle.groups.forEach((g, i) => {
      const overlap = words.filter((w) => (g.words as readonly string[]).includes(w)).length;
      if (overlap > best) {
        best = overlap;
        bestGroup = i;
      }
    });
    const result: Entry['result'] = best === GROUP_SIZE ? 'correct' : best === GROUP_SIZE - 1 ? 'one_away' : 'wrong';
    const entry: Entry = result === 'correct' ? { words, result, group: bestGroup } : { words, result };

    const all2 = [...entries, entry];
    const solvedCount = all2.filter((e) => e.result === 'correct').length;
    const mistakes = all2.length - solvedCount;
    return {
      entry,
      outcome: solvedCount === puzzle.groups.length ? 'won' : mistakes >= MAX_MISTAKES ? 'lost' : 'continue',
    };
  },
};
