import { Prisma, GameKey, GamePlay } from '@arth/db';
import { addXp } from './xp.service';
import { completeMissionByType } from './missions.service';
import { evaluateAchievements } from './achievement.service';
import { startOfUtcDay, recordActivityToday, isActiveDay, getStreakStatus } from './streak.service';
import { BadRequestError, ConflictError } from '../utils/errors';
import { GAMES, GAME_KEYS } from '../games';
import { GameCategory, GameDefinition, GuessInput, PlayView, SubmitPayload, xpFor } from '../games/types';

// The orchestration layer: status, state, and the shared payout path. Everything specific to one
// game (puzzle, validation, scoring) lives in its module under src/games/.

export { GAME_KEYS };

export interface GameSummary {
  key: GameKey;
  title: string;
  description: string;
  icon: string;
  category: GameCategory;
  status: 'not_started' | 'in_progress' | 'won' | 'lost' | 'completed';
  xpAwarded: number;
  maxXp: number;
}

export interface GameReward {
  xpAwarded: number;
  won: boolean;
  streakCurrent: number;
  streakMax: number;
  xp: number;
  level: number;
}

export interface GameStreak {
  current: number;
  max: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Per-game streaks, derived from finished plays rather than stored: the unique
 * (user, game, day) row already is the "played that day" record, so there is nothing to keep in
 * sync. Like the main streak, finishing a game counts whether it was won or lost. A streak that
 * was last extended yesterday is still alive — it only breaks once today ends unplayed.
 */
export function computeGameStreaks(
  plays: { gameKey: GameKey; playDate: Date }[],
  today: Date
): Map<GameKey, GameStreak> {
  const daysByGame = new Map<GameKey, number[]>();
  for (const p of plays) {
    const day = Math.round(startOfUtcDay(p.playDate).getTime() / DAY_MS);
    const days = daysByGame.get(p.gameKey);
    if (days) days.push(day);
    else daysByGame.set(p.gameKey, [day]);
  }

  const todayDay = Math.round(today.getTime() / DAY_MS);
  const result = new Map<GameKey, GameStreak>();
  for (const [key, days] of daysByGame) {
    const sorted = [...new Set(days)].sort((a, b) => a - b);
    let max = 0;
    let run = 0;
    for (let i = 0; i < sorted.length; i++) {
      run = i > 0 && sorted[i] === sorted[i - 1] + 1 ? run + 1 : 1;
      max = Math.max(max, run);
    }
    const last = sorted[sorted.length - 1];
    result.set(key, { current: last >= todayDay - 1 ? run : 0, max });
  }
  return result;
}

function summarize(def: GameDefinition, play: GamePlay | null | undefined): GameSummary {
  const { key, title, description, icon, category, maxXp } = def.meta;
  return {
    key,
    title,
    description,
    icon,
    category,
    maxXp,
    status: play ? play.status : 'not_started',
    xpAwarded: play?.xpAwarded ?? 0,
  };
}

function toView(play: GamePlay | null): PlayView | null {
  if (!play) return null;
  return {
    status: play.status,
    attempts: play.attempts,
    guesses: Array.isArray(play.guesses) ? (play.guesses as unknown[]) : [],
    finished: play.status !== 'in_progress',
  };
}

function definitionFor(key: GameKey): GameDefinition {
  return GAMES[key];
}

/** The detail payload for one game today. Answers are only included once the play is finished. */
function buildState(def: GameDefinition, play: GamePlay | null, date: Date, ctx?: unknown) {
  return {
    ...summarize(def, play),
    attempts: play?.attempts ?? 0,
    maxAttempts: def.maxAttempts,
    ...def.state(date, toView(play), ctx),
    ...(def.describe && ctx !== undefined ? { description: def.describe(ctx) ?? def.meta.description } : {}),
  };
}

// ---------------------------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------------------------

export async function getGamesStatus(tx: Prisma.TransactionClient, userId: string) {
  const today = startOfUtcDay(new Date());
  const [plays, finishedPlays, streakRow, user] = await Promise.all([
    tx.gamePlay.findMany({ where: { userId, playDate: today } }),
    tx.gamePlay.findMany({
      where: { userId, status: { not: 'in_progress' } },
      select: { gameKey: true, playDate: true },
    }),
    tx.streakHistory.findUnique({ where: { userId_activityDate: { userId, activityDate: today } } }),
    getStreakStatus(tx, userId),
  ]);
  const streaks = computeGameStreaks(finishedPlays, today);
  const games: (GameSummary & { streak: GameStreak })[] = [];
  for (const key of GAME_KEYS) {
    const def = definitionFor(key);
    const play = plays.find((p) => p.gameKey === key) ?? null;
    const summary = { ...summarize(def, play), streak: streaks.get(key) ?? { current: 0, max: 0 } };
    // DB-backed games (the daily lesson) can show today's content on their hub card.
    if (def.load && def.describe) {
      const description = def.describe(await def.load(tx, today, toView(play)));
      if (description) summary.description = description;
    }
    games.push(summary);
  }
  return {
    games,
    completedCount: games.filter((g) => g.status !== 'not_started' && g.status !== 'in_progress').length,
    streakActiveToday: !!streakRow && isActiveDay(streakRow),
    streakCurrent: user.streakCurrent,
  };
}

export async function getTodayGame(tx: Prisma.TransactionClient, userId: string, key: GameKey) {
  const today = startOfUtcDay(new Date());
  const play = await tx.gamePlay.findUnique({ where: { userId_gameKey_playDate: { userId, gameKey: key, playDate: today } } });
  const def = definitionFor(key);
  const ctx = def.load ? await def.load(tx, today, toView(play)) : undefined;
  return buildState(def, play, today, ctx);
}

// ---------------------------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------------------------

async function getOrCreatePlay(tx: Prisma.TransactionClient, userId: string, key: GameKey, today: Date) {
  return tx.gamePlay.upsert({
    where: { userId_gameKey_playDate: { userId, gameKey: key, playDate: today } },
    update: {},
    create: { userId, gameKey: key, playDate: today },
  });
}

/**
 * Closes out today's play and pays out. The `status: 'in_progress'` guard on the update is the
 * race-safe once-a-day gate — a concurrent double-submit finds count 0 and gets a 409, so XP and
 * the streak can never be awarded twice for the same game.
 */
async function finishGame(
  tx: Prisma.TransactionClient,
  userId: string,
  play: GamePlay,
  outcome: { status: 'won' | 'lost' | 'completed'; xp: number; attempts: number; guesses: unknown[] }
): Promise<GameReward> {
  const res = await tx.gamePlay.updateMany({
    where: { id: play.id, status: 'in_progress' },
    data: {
      status: outcome.status,
      attempts: outcome.attempts,
      guesses: outcome.guesses as Prisma.InputJsonValue,
      xpAwarded: outcome.xp,
      completedAt: new Date(),
    },
  });
  if (res.count === 0) throw new ConflictError('You already finished this game today');

  await addXp(tx, userId, outcome.xp, 'game_completed', 'game', play.gameKey);
  const user = await recordActivityToday(tx, userId, 'game');
  await evaluateAchievements(tx, userId);

  return {
    xpAwarded: outcome.xp,
    won: outcome.status === 'won',
    streakCurrent: user.streakCurrent,
    streakMax: user.streakMax,
    xp: user.xp,
    level: user.level,
  };
}

export async function submitGuess(tx: Prisma.TransactionClient, userId: string, key: GameKey, input: GuessInput) {
  const def = definitionFor(key);
  if (def.kind !== 'guess') throw new BadRequestError('This game does not take guesses');

  const today = startOfUtcDay(new Date());
  const play = await getOrCreatePlay(tx, userId, key, today);
  if (play.status !== 'in_progress') throw new ConflictError('You already finished this game today');

  const previous = Array.isArray(play.guesses) ? (play.guesses as unknown[]) : [];
  const { entry, outcome } = def.guess(today, previous, input);
  const guesses = [...previous, entry];

  if (outcome !== 'continue') {
    const won = outcome === 'won';
    const reward = await finishGame(tx, userId, play, {
      status: outcome,
      xp: xpFor(def.meta.xp, won),
      attempts: guesses.length,
      guesses,
    });
    const finished = await tx.gamePlay.findUniqueOrThrow({ where: { id: play.id } });
    return { game: buildState(def, finished, today), reward };
  }

  const updated = await tx.gamePlay.update({
    where: { id: play.id },
    data: { attempts: guesses.length, guesses: guesses as unknown as Prisma.InputJsonValue },
  });
  return { game: buildState(def, updated, today), reward: null as GameReward | null };
}

export async function submitAnswers(tx: Prisma.TransactionClient, userId: string, key: GameKey, payload: SubmitPayload) {
  const def = definitionFor(key);
  if (def.kind !== 'submit') throw new BadRequestError('This game takes guesses, not a submission');

  const today = startOfUtcDay(new Date());
  // Validate and score before touching the DB, so a bad payload never creates a play row.
  const ctx = def.load ? await def.load(tx, today, null) : undefined;
  const result = def.submit(today, payload, ctx);

  const play = await getOrCreatePlay(tx, userId, key, today);
  const reward = await finishGame(tx, userId, play, {
    status: result.status,
    xp: result.xp,
    attempts: 1,
    guesses: [result.stored],
  });
  if (key === 'daily_lesson') await completeMissionByType(tx, userId, 'learn');
  const finished = await tx.gamePlay.findUniqueOrThrow({ where: { id: play.id } });
  return { game: buildState(def, finished, today, ctx), reward };
}
