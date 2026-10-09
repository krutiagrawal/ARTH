import { apiFetch } from './client';

export type GameKey =
  | 'guess_tree'
  | 'grove_word'
  | 'eco_quiz'
  | 'grow_order'
  | 'species_scramble'
  | 'eco_connections'
  | 'missing_letters'
  | 'seed_memory'
  | 'waste_sort'
  | 'true_or_myth'
  | 'shadow_tree'
  | 'spot_difference'
  | 'co2_duel'
  | 'plant_grid';
export type GameCategory = 'word' | 'quick' | 'puzzle';
/** Games that share the generic "one option per round" screen. */
export type RoundsGameKey = 'eco_quiz' | 'true_or_myth' | 'co2_duel' | 'shadow_tree' | 'waste_sort' | 'missing_letters';
export type GameStatus = 'not_started' | 'in_progress' | 'won' | 'lost' | 'completed';

export interface ApiGameSummary {
  key: GameKey;
  title: string;
  description: string;
  icon: string;
  category: GameCategory;
  status: GameStatus;
  xpAwarded: number;
  maxXp: number;
}

export interface ApiGamesStatus {
  games: ApiGameSummary[];
  completedCount: number;
  streakActiveToday: boolean;
  streakCurrent: number;
}

export interface ApiGameReward {
  xpAwarded: number;
  won: boolean;
  streakCurrent: number;
  streakMax: number;
  xp: number;
  level: number;
}

export type TreeMatch = 'match' | 'miss';
export type TreeDirection = 'match' | 'higher' | 'lower';
export type LetterState = 'correct' | 'present' | 'absent';

export interface TreeTraits {
  kind: 'broadleaf' | 'conifer' | 'palm' | 'bamboo' | 'shrub';
  heightM: number;
  heightBand: 'small' | 'medium' | 'tall';
  bearsFruit: boolean;
  showyFlowers: boolean;
  nativeToIndia: boolean;
  co2KgPerYear: number;
}

export interface TreeGuess {
  key: string;
  name: string;
  emoji: string;
  traits: TreeTraits;
  feedback: {
    kind: TreeMatch;
    height: TreeDirection;
    bearsFruit: TreeMatch;
    showyFlowers: TreeMatch;
    nativeToIndia: TreeMatch;
    co2: TreeDirection;
  };
}

interface GameBase extends ApiGameSummary {
  attempts: number;
  maxAttempts: number;
}

export interface GuessTreeState extends GameBase {
  key: 'guess_tree';
  puzzle: { choices: { key: string; name: string; emoji: string }[] };
  guesses: TreeGuess[];
  answer: { key: string; name: string; emoji: string; traits: TreeTraits } | null;
}

export interface GroveWordState extends GameBase {
  key: 'grove_word';
  puzzle: { length: number };
  guesses: { word: string; letters: LetterState[] }[];
  answer: string | null;
}

export interface RoundsGameState extends GameBase {
  key: RoundsGameKey;
  puzzle: {
    rounds: { prompt: string; options: string[]; visual: { emoji: string; silhouette?: boolean } | null }[];
  };
  result: {
    correctCount: number;
    total: number;
    review: { correct: number; chosen: number; explanation: string | null }[];
  } | null;
}

export interface SpeciesScrambleState extends GameBase {
  key: 'species_scramble';
  puzzle: { words: { scrambled: string; hint: string; length: number }[] };
  result: { correctCount: number; total: number; review: { answer: string; given: string }[] } | null;
}

export interface ConnectionGroup {
  category: string;
  words: string[];
  /** 0 = easiest .. 3 = hardest; used for the reveal color. */
  level: number;
}

export interface EcoConnectionsState extends GameBase {
  key: 'eco_connections';
  puzzle: { words: string[]; groupSize: number; maxMistakes: number };
  guesses: { words: string[]; result: 'correct' | 'one_away' | 'wrong' }[];
  solved: ConnectionGroup[];
  mistakes: number;
  answer: ConnectionGroup[] | null;
}

export interface SeedMemoryState extends GameBase {
  key: 'seed_memory';
  puzzle: { cards: string[]; pairs: number; par: number };
  result: { moves: number; seconds: number; par: number } | null;
}

export interface SpotDifferenceState extends GameBase {
  key: 'spot_difference';
  puzzle: { size: number; a: string[]; b: string[]; differences: number };
  result: { cells: number[]; chosen: number[] } | null;
}

export interface PlantGridState extends GameBase {
  key: 'plant_grid';
  puzzle: { size: number; symbols: string[]; givens: (number | null)[] };
  guesses: { grid: number[]; conflicts: number[] }[];
  answer: number[] | null;
}

export interface GrowOrderState extends GameBase {
  key: 'grow_order';
  puzzle: { title: string; prompt: string; steps: string[] };
  result: { correctOrder: string[]; chosenOrder: string[] } | null;
}

export type ApiGameState =
  | GuessTreeState
  | GroveWordState
  | RoundsGameState
  | GrowOrderState
  | SpeciesScrambleState
  | EcoConnectionsState
  | SeedMemoryState
  | SpotDifferenceState
  | PlantGridState;

export type GuessInput = string | (string | number)[];
export interface SubmitPayload {
  answers?: number[];
  order?: string[];
  words?: string[];
  cells?: number[];
  moves?: number;
  seconds?: number;
}

export interface GamePlayResponse<S extends ApiGameState = ApiGameState> {
  game: S;
  reward: ApiGameReward | null;
}

export async function fetchGamesStatus(): Promise<ApiGamesStatus> {
  return apiFetch<ApiGamesStatus>('/api/games');
}

export async function fetchTodayGame<S extends ApiGameState>(key: S['key']): Promise<S> {
  return apiFetch<S>(`/api/games/${key}/today`);
}

export async function submitGameGuess<S extends ApiGameState>(key: S['key'], guess: GuessInput): Promise<GamePlayResponse<S>> {
  return apiFetch<GamePlayResponse<S>>(`/api/games/${key}/guess`, { method: 'POST', body: { guess } });
}

export async function submitGame<S extends ApiGameState>(
  key: S['key'],
  payload: SubmitPayload,
): Promise<GamePlayResponse<S>> {
  return apiFetch<GamePlayResponse<S>>(`/api/games/${key}/submit`, { method: 'POST', body: payload });
}
