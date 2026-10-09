import { GameKey } from '@arth/db';

export type GameCategory = 'word' | 'quick' | 'puzzle';
export type FinishStatus = 'won' | 'lost' | 'completed';

/** Finishing always pays `base`; a win adds `winBonus`; choices games may also pay per right answer. */
export interface XpConfig {
  base: number;
  winBonus: number;
  perCorrect?: number;
}

export interface GameMeta {
  key: GameKey;
  title: string;
  description: string;
  icon: string;
  category: GameCategory;
  xp: XpConfig;
  /** Highest XP one play can pay, shown on the hub. */
  maxXp: number;
}

/** What a game module is told about the user's play so far (never the DB row itself). */
export interface PlayView {
  status: 'in_progress' | 'won' | 'lost' | 'completed';
  attempts: number;
  guesses: unknown[];
  finished: boolean;
}

export type SubmitPayload = {
  answers?: number[];
  order?: string[];
  words?: string[];
  cells?: number[];
  moves?: number;
  seconds?: number;
};

export type GuessInput = string | (string | number)[];

interface GameBase {
  meta: GameMeta;
  /** Shown as "N attempts" in the UI (mistakes for Connections, 1 for single-submit games). */
  maxAttempts: number;
  /** The game-specific part of the state payload. Answers only once `play.finished`. */
  state(date: Date, play: PlayView | null): Record<string, unknown>;
}

/** Sequential guesses with feedback; ends on a solve or when the game says it is lost. */
export interface GuessGame extends GameBase {
  kind: 'guess';
  guess(
    date: Date,
    previous: unknown[],
    input: GuessInput
  ): { entry: unknown; outcome: 'continue' | 'won' | 'lost' };
}

/** One submission ends the play. */
export interface SubmitGame extends GameBase {
  kind: 'submit';
  submit(date: Date, payload: SubmitPayload): { status: FinishStatus; xp: number; stored: unknown };
}

export type GameDefinition = GuessGame | SubmitGame;

export function xpFor(xp: XpConfig, won: boolean, correct = 0): number {
  return xp.base + (won ? xp.winBonus : 0) + (xp.perCorrect ?? 0) * correct;
}

export function maxXpOf(xp: XpConfig, rounds = 0): number {
  return xp.base + xp.winBonus + (xp.perCorrect ?? 0) * rounds;
}

export const HEAVY_XP: XpConfig = { base: 10, winBonus: 10 };
export const QUICK_XP: XpConfig = { base: 5, winBonus: 5 };
