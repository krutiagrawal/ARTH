import { choicesGame } from './choicesEngine';
import { HEAVY_XP, maxXpOf } from './types';
import { dailyGroup } from './util';
import { QUIZ_QUESTIONS, QUIZ_QUESTIONS_PER_DAY } from '../data/games/ecoQuiz';

// Always completes (no win/lose); pays the base plus 2 XP per right answer.
const xp = { base: HEAVY_XP.base, winBonus: 0, perCorrect: 2 };

export const ecoQuiz = choicesGame({
  meta: {
    key: 'eco_quiz',
    title: 'Eco Quiz',
    description: '5 quick questions about trees and nature',
    icon: '🧠',
    category: 'quick',
    xp,
    maxXp: maxXpOf(xp, QUIZ_QUESTIONS_PER_DAY),
  },
  rounds: (date) =>
    dailyGroup('eco_quiz', QUIZ_QUESTIONS, QUIZ_QUESTIONS_PER_DAY, date).map((q) => ({
      prompt: q.q,
      options: [...q.options],
      answer: q.answer,
    })),
});
