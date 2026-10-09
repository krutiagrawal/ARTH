import { BadRequestError } from '../utils/errors';
import { SCRAMBLE_WORDS } from '../data/games/scramble';
import { QUICK_XP, SubmitGame, maxXpOf, xpFor } from './types';
import { dailyGroup, dayNumber, seededShuffle } from './util';

const WORDS_PER_DAY = 3;

function dailyWords(date: Date) {
  return dailyGroup('species_scramble', SCRAMBLE_WORDS, WORDS_PER_DAY, date).map((w, i) => {
    let letters = seededShuffle(w.word.split(''), `species_scramble:${dayNumber(date)}:${i}`);
    // Never hand out the unscrambled word (possible for short words).
    for (let n = 1; letters.join('') === w.word && n <= w.word.length; n++) {
      letters = [...letters.slice(n), ...letters.slice(0, n)];
    }
    return { ...w, scrambled: letters.join('') };
  });
}

export const speciesScramble: SubmitGame = {
  kind: 'submit',
  meta: {
    key: 'species_scramble',
    title: 'Species Scramble',
    description: 'Unscramble 3 plant names',
    icon: '🔀',
    category: 'word',
    xp: QUICK_XP,
    maxXp: maxXpOf(QUICK_XP),
  },
  maxAttempts: 1,

  state(date, play) {
    const words = dailyWords(date);
    const submitted = play?.finished ? (play.guesses[0] as { words: string[] } | undefined) : undefined;
    return {
      puzzle: { words: words.map((w) => ({ scrambled: w.scrambled, hint: w.hint, length: w.word.length })) },
      result: submitted
        ? {
            correctCount: words.filter((w, i) => submitted.words[i] === w.word).length,
            total: words.length,
            review: words.map((w, i) => ({ answer: w.word, given: submitted.words[i] ?? '' })),
          }
        : null,
    };
  },

  submit(date, payload) {
    const words = dailyWords(date);
    const given = payload.words;
    if (!given || given.length !== words.length) throw new BadRequestError(`Answer all ${words.length} words`);
    const cleaned = given.map((g) => String(g).trim().toUpperCase());
    if (cleaned.some((g) => !/^[A-Z]{2,12}$/.test(g))) throw new BadRequestError('Answers must be letters only');

    const won = cleaned.every((g, i) => g === words[i].word);
    return { status: won ? 'won' : 'lost', xp: xpFor(QUICK_XP, won), stored: { words: cleaned } };
  },
};
