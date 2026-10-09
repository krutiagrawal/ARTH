import { BadRequestError } from '../utils/errors';
import { GROW_SEQUENCES } from '../data/games/growOrder';
import { HEAVY_XP, SubmitGame, maxXpOf, xpFor } from './types';
import { cycleIndex, dayNumber, sameSet, seededShuffle } from './util';

function dailySequence(date: Date) {
  const seq = GROW_SEQUENCES[cycleIndex('grow_order', GROW_SEQUENCES.length, date)];
  let shuffled = seededShuffle(seq.steps, `grow_order:${seq.id}:${dayNumber(date)}`);
  // Never hand out the already-solved order.
  if (shuffled.every((step, i) => step === seq.steps[i])) shuffled = [...shuffled.slice(1), shuffled[0]];
  return { seq, shuffled };
}

export const growOrder: SubmitGame = {
  kind: 'submit',
  meta: {
    key: 'grow_order',
    title: 'Grow Order',
    description: 'Put the steps in the right order',
    icon: '🪴',
    category: 'puzzle',
    xp: HEAVY_XP,
    maxXp: maxXpOf(HEAVY_XP),
  },
  maxAttempts: 1,

  state(date, play) {
    const { seq, shuffled } = dailySequence(date);
    const submitted = play?.finished ? (play.guesses[0] as { order: string[] } | undefined) : undefined;
    return {
      puzzle: { title: seq.title, prompt: seq.prompt, steps: shuffled },
      result: play?.finished ? { correctOrder: seq.steps, chosenOrder: submitted?.order ?? [] } : null,
    };
  },

  submit(date, payload) {
    const { seq } = dailySequence(date);
    const order = payload.order;
    if (!order || order.length !== seq.steps.length || !sameSet(order, seq.steps)) {
      throw new BadRequestError('Order every step exactly once');
    }
    const won = order.every((step, i) => step === seq.steps[i]);
    return { status: won ? 'won' : 'lost', xp: xpFor(HEAVY_XP, won), stored: { order } };
  },
};
