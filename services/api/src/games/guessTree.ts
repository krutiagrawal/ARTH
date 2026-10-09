import { BadRequestError } from '../utils/errors';
import { GAME_TREES, GameTree, heightBand } from '../data/games/gameTrees';
import { GuessGame, HEAVY_XP, maxXpOf } from './types';
import { cycleIndex } from './util';

const MAX_ATTEMPTS = 6;

type Match = 'match' | 'miss';
type Direction = 'match' | 'higher' | 'lower'; // "higher" = the answer is higher than your guess
type TreeGuessEntry = { key: string; feedback: ReturnType<typeof treeFeedback> };

function dailyTree(date: Date): GameTree {
  return GAME_TREES[cycleIndex('guess_tree', GAME_TREES.length, date)];
}

function findTree(key: string): GameTree | undefined {
  return GAME_TREES.find((t) => t.key === key);
}

function direction(guess: number, answer: number): Direction {
  if (guess === answer) return 'match';
  return answer > guess ? 'higher' : 'lower';
}

function traits(t: GameTree) {
  return {
    kind: t.kind,
    heightM: t.heightM,
    heightBand: heightBand(t.heightM),
    bearsFruit: t.bearsFruit,
    showyFlowers: t.showyFlowers,
    nativeToIndia: t.nativeToIndia,
    co2KgPerYear: t.co2KgPerYear,
  };
}

function treeFeedback(guess: GameTree, answer: GameTree) {
  const bandRank = { small: 0, medium: 1, tall: 2 } as const;
  return {
    kind: (guess.kind === answer.kind ? 'match' : 'miss') as Match,
    height: direction(bandRank[heightBand(guess.heightM)], bandRank[heightBand(answer.heightM)]),
    bearsFruit: (guess.bearsFruit === answer.bearsFruit ? 'match' : 'miss') as Match,
    showyFlowers: (guess.showyFlowers === answer.showyFlowers ? 'match' : 'miss') as Match,
    nativeToIndia: (guess.nativeToIndia === answer.nativeToIndia ? 'match' : 'miss') as Match,
    co2: direction(guess.co2KgPerYear, answer.co2KgPerYear),
  };
}

export const guessTree: GuessGame = {
  kind: 'guess',
  meta: {
    key: 'guess_tree',
    title: 'Guess the Tree',
    description: "Find today's tree in 6 tries",
    icon: '🌳',
    category: 'word',
    xp: HEAVY_XP,
    maxXp: maxXpOf(HEAVY_XP),
  },
  maxAttempts: MAX_ATTEMPTS,

  state(date, play) {
    const answer = dailyTree(date);
    const guesses = ((play?.guesses ?? []) as TreeGuessEntry[]).flatMap((g) => {
      const tree = findTree(g.key);
      return tree ? [{ key: tree.key, name: tree.name, emoji: tree.emoji, traits: traits(tree), feedback: g.feedback }] : [];
    });
    return {
      puzzle: {
        choices: [...GAME_TREES].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ key: t.key, name: t.name, emoji: t.emoji })),
      },
      guesses,
      answer: play?.finished ? { key: answer.key, name: answer.name, emoji: answer.emoji, traits: traits(answer) } : null,
    };
  },

  guess(date, previous, input) {
    if (typeof input !== 'string') throw new BadRequestError('Unknown tree');
    const guess = findTree(input);
    if (!guess) throw new BadRequestError('Unknown tree');
    if ((previous as TreeGuessEntry[]).some((g) => g.key === guess.key)) throw new BadRequestError('You already guessed that tree');

    const answer = dailyTree(date);
    const solved = guess.key === answer.key;
    return {
      entry: { key: guess.key, feedback: treeFeedback(guess, answer) } satisfies TreeGuessEntry,
      outcome: solved ? 'won' : previous.length + 1 >= MAX_ATTEMPTS ? 'lost' : 'continue',
    };
  },
};
