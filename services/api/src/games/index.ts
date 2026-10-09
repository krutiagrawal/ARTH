import { GameKey } from '@arth/db';
import { GameDefinition } from './types';
import { guessTree } from './guessTree';
import { groveWord } from './groveWord';
import { ecoQuiz } from './ecoQuiz';
import { growOrder } from './growOrder';
import { trueOrMyth, co2Duel, shadowTree, wasteSort, missingLetters } from './quickChoices';
import { speciesScramble } from './speciesScramble';
import { spotDifference } from './spotDifference';
import { seedMemory } from './seedMemory';
import { ecoConnections } from './ecoConnections';
import { plantGrid } from './plantGrid';
import { dailyLesson } from './dailyLesson';

// The registry. To retire a game, delete its module and remove it here (and from the GameKey enum
// in a later migration if you want the row type gone). Order here is the order on the hub.
export const GAMES: Record<GameKey, GameDefinition> = {
  daily_lesson: dailyLesson,
  guess_tree: guessTree,
  grove_word: groveWord,
  species_scramble: speciesScramble,
  missing_letters: missingLetters,
  eco_quiz: ecoQuiz,
  true_or_myth: trueOrMyth,
  co2_duel: co2Duel,
  shadow_tree: shadowTree,
  waste_sort: wasteSort,
  grow_order: growOrder,
  eco_connections: ecoConnections,
  plant_grid: plantGrid,
  spot_difference: spotDifference,
  seed_memory: seedMemory,
};

export const GAME_KEYS = Object.keys(GAMES) as GameKey[];
