import { BadRequestError } from '../utils/errors';
import { GameMeta, SubmitGame, xpFor } from './types';

export interface Round {
  prompt: string;
  options: string[];
  /** Index into `options`. Never sent to the client until the play is finished. */
  answer: number;
  explanation?: string;
  /** An emoji to display above the prompt; `silhouette` darkens it (Shadow Tree). */
  visual?: { emoji: string; silhouette?: boolean };
}

interface ChoicesConfig {
  meta: GameMeta;
  rounds(date: Date): Round[];
  /**
   * Correct answers needed to count as a win. When omitted the play always ends `completed` and
   * pays `perCorrect` XP per right answer instead (Eco Quiz).
   */
  winAt?: number;
}

/**
 * A multiple-choice-per-round game: the server picks the rounds, the client sends one option
 * index per round, and the server scores it. Quiz, True or Myth, CO₂ Duel, Shadow Tree, Sort the
 * Waste and Missing Letters all run on this.
 */
export function choicesGame({ meta, rounds, winAt }: ChoicesConfig): SubmitGame {
  return {
    kind: 'submit',
    meta,
    maxAttempts: 1,

    state(date, play) {
      const all = rounds(date);
      const submitted = play?.finished ? (play.guesses[0] as { answers: number[] } | undefined) : undefined;
      return {
        puzzle: { rounds: all.map((r) => ({ prompt: r.prompt, options: r.options, visual: r.visual ?? null })) },
        result: submitted
          ? {
              correctCount: submitted.answers.filter((a, i) => a === all[i].answer).length,
              total: all.length,
              review: all.map((r, i) => ({
                correct: r.answer,
                chosen: submitted.answers[i] ?? -1,
                explanation: r.explanation ?? null,
              })),
            }
          : null,
      };
    },

    submit(date, payload) {
      const all = rounds(date);
      const answers = payload.answers;
      if (!answers || answers.length !== all.length) throw new BadRequestError(`Answer all ${all.length} questions`);
      if (answers.some((a, i) => !Number.isInteger(a) || a < 0 || a >= all[i].options.length)) {
        throw new BadRequestError('Invalid answer');
      }
      const correct = answers.filter((a, i) => a === all[i].answer).length;

      if (winAt === undefined) {
        return { status: 'completed', xp: xpFor(meta.xp, false, correct), stored: { answers } };
      }
      const won = correct >= winAt;
      return { status: won ? 'won' : 'lost', xp: xpFor(meta.xp, won), stored: { answers } };
    },
  };
}
