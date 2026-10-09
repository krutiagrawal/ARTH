import { BadRequestError } from '../utils/errors';
import { GROVE_WORDS } from '../data/games/groveWords';
import { GuessGame, HEAVY_XP, maxXpOf } from './types';
import { cycleIndex } from './util';

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 5;

type LetterState = 'correct' | 'present' | 'absent';
type WordGuessEntry = { word: string };

function dailyWord(date: Date): string {
  return GROVE_WORDS[cycleIndex('grove_word', GROVE_WORDS.length, date)];
}

function wordFeedback(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(guess.length).fill('absent');
  const remaining: Record<string, number> = {};
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) result[i] = 'correct';
    else remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue;
    if ((remaining[guess[i]] ?? 0) > 0) {
      result[i] = 'present';
      remaining[guess[i]] -= 1;
    }
  }
  return result;
}

export const groveWord: GuessGame = {
  kind: 'guess',
  meta: {
    key: 'grove_word',
    title: 'Grove Word',
    description: 'Guess the 5-letter nature word',
    icon: '🔤',
    category: 'word',
    xp: HEAVY_XP,
    maxXp: maxXpOf(HEAVY_XP),
  },
  maxAttempts: MAX_ATTEMPTS,

  state(date, play) {
    const answer = dailyWord(date);
    return {
      puzzle: { length: WORD_LENGTH },
      guesses: ((play?.guesses ?? []) as WordGuessEntry[]).map((g) => ({ word: g.word, letters: wordFeedback(g.word, answer) })),
      answer: play?.finished ? answer : null,
    };
  },

  guess(date, previous, input) {
    if (typeof input !== 'string') throw new BadRequestError(`Enter a ${WORD_LENGTH}-letter word`);
    const word = input.trim().toUpperCase();
    if (!new RegExp(`^[A-Z]{${WORD_LENGTH}}$`).test(word)) throw new BadRequestError(`Enter a ${WORD_LENGTH}-letter word`);
    if ((previous as WordGuessEntry[]).some((g) => g.word === word)) throw new BadRequestError('You already guessed that word');

    const solved = word === dailyWord(date);
    return {
      entry: { word } satisfies WordGuessEntry,
      outcome: solved ? 'won' : previous.length + 1 >= MAX_ATTEMPTS ? 'lost' : 'continue',
    };
  },
};
