import { GAME_TREES, GameTree } from '../data/games/gameTrees';
import { MYTH_FACTS } from '../data/games/mythFacts';
import { WASTE_BINS, WASTE_ITEMS } from '../data/games/waste';
import { SHADOW_PLANTS } from '../data/games/shadowPlants';
import { CLOZE_SENTENCES, DISTRACTORS } from '../data/games/cloze';
import { choicesGame, Round } from './choicesEngine';
import { QUICK_XP, maxXpOf } from './types';
import { dailyGroup, dayNumber, hashString, seededShuffle } from './util';

// The six "pick one option per round" games other than Eco Quiz. Each only describes its rounds;
// scoring, validation and payout are the shared choices engine.

// ---------------------------------------------------------------------------------------------
// True or Myth
// ---------------------------------------------------------------------------------------------

export const trueOrMyth = choicesGame({
  meta: {
    key: 'true_or_myth',
    title: 'True or Myth',
    description: 'Fact or myth? 6 quick statements',
    icon: '🧐',
    category: 'quick',
    xp: QUICK_XP,
    maxXp: maxXpOf(QUICK_XP),
  },
  winAt: 5,
  rounds: (date): Round[] =>
    dailyGroup('true_or_myth', MYTH_FACTS, 6, date).map((f) => ({
      prompt: f.statement,
      options: ['True', 'Myth'],
      answer: f.isTrue ? 0 : 1,
      explanation: f.explanation,
    })),
});

// ---------------------------------------------------------------------------------------------
// CO₂ Duel
// ---------------------------------------------------------------------------------------------

const MIN_CO2_GAP = 0.5;

function duelPairs(date: Date): [GameTree, GameTree][] {
  const pool = seededShuffle(GAME_TREES, `co2_duel:${dayNumber(date)}`);
  const pairs: [GameTree, GameTree][] = [];
  const used = new Set<string>();
  for (const a of pool) {
    if (pairs.length === 5) break;
    if (used.has(a.key)) continue;
    const b = pool.find((t) => !used.has(t.key) && t.key !== a.key && Math.abs(t.co2KgPerYear - a.co2KgPerYear) >= MIN_CO2_GAP);
    if (!b) continue;
    used.add(a.key);
    used.add(b.key);
    pairs.push([a, b]);
  }
  return pairs;
}

export const co2Duel = choicesGame({
  meta: {
    key: 'co2_duel',
    title: 'CO₂ Duel',
    description: 'Which tree absorbs more CO₂ a year?',
    icon: '⚖️',
    category: 'quick',
    xp: QUICK_XP,
    maxXp: maxXpOf(QUICK_XP),
  },
  winAt: 4,
  rounds: (date): Round[] =>
    duelPairs(date).map(([a, b], i) => {
      // Flip which side is listed first, deterministically, so the answer isn't always the same slot.
      const flip = hashString(`co2_duel:${dayNumber(date)}:${i}`) % 2 === 1;
      const [first, second] = flip ? [b, a] : [a, b];
      const answer = first.co2KgPerYear > second.co2KgPerYear ? 0 : 1;
      return {
        prompt: 'Which tree absorbs more CO₂ per year?',
        options: [`${first.emoji} ${first.name}`, `${second.emoji} ${second.name}`],
        answer,
        explanation: `${first.name}: about ${first.co2KgPerYear} kg a year. ${second.name}: about ${second.co2KgPerYear} kg (ARTH estimates).`,
      };
    }),
});

// ---------------------------------------------------------------------------------------------
// Shadow Tree
// ---------------------------------------------------------------------------------------------

export const shadowTree = choicesGame({
  meta: {
    key: 'shadow_tree',
    title: 'Shadow Tree',
    description: 'Name the plant from its shadow',
    icon: '🌑',
    category: 'quick',
    xp: QUICK_XP,
    maxXp: maxXpOf(QUICK_XP),
  },
  winAt: 4,
  rounds: (date): Round[] =>
    dailyGroup('shadow_tree', SHADOW_PLANTS, 5, date).map((plant, i) => {
      const distractors = seededShuffle(
        SHADOW_PLANTS.filter((p) => p.name !== plant.name),
        `shadow_tree:${dayNumber(date)}:${i}`,
      ).slice(0, 3);
      const options = seededShuffle([plant, ...distractors], `shadow_tree:opts:${dayNumber(date)}:${i}`);
      return {
        prompt: 'Which plant casts this shadow?',
        options: options.map((p) => p.name),
        answer: options.findIndex((p) => p.name === plant.name),
        explanation: `${plant.emoji} ${plant.name}. ${plant.note}`,
        visual: { emoji: plant.emoji, silhouette: true },
      };
    }),
});

// ---------------------------------------------------------------------------------------------
// Sort the Waste
// ---------------------------------------------------------------------------------------------

export const wasteSort = choicesGame({
  meta: {
    key: 'waste_sort',
    title: 'Sort the Waste',
    description: 'Wet, dry or hazardous? Sort 8 items',
    icon: '♻️',
    category: 'quick',
    xp: QUICK_XP,
    maxXp: maxXpOf(QUICK_XP),
  },
  winAt: 7,
  rounds: (date): Round[] =>
    dailyGroup('waste_sort', WASTE_ITEMS, 8, date).map((item) => ({
      prompt: `${item.emoji} ${item.name}`,
      options: [...WASTE_BINS],
      answer: item.bin,
      explanation: item.note,
    })),
});

// ---------------------------------------------------------------------------------------------
// Missing Letters
// ---------------------------------------------------------------------------------------------

export const missingLetters = choicesGame({
  meta: {
    key: 'missing_letters',
    title: 'Missing Words',
    description: 'Fill the blank in 3 eco facts',
    icon: '✏️',
    category: 'word',
    xp: QUICK_XP,
    maxXp: maxXpOf(QUICK_XP),
  },
  winAt: 3,
  rounds: (date): Round[] =>
    dailyGroup('missing_letters', CLOZE_SENTENCES, 3, date).map((s, i) => {
      const distractors = seededShuffle(DISTRACTORS, `missing_letters:${dayNumber(date)}:${i}`).slice(0, 5);
      const options = seededShuffle([s.answer, ...distractors], `missing_letters:opts:${dayNumber(date)}:${i}`);
      return {
        prompt: s.text,
        options,
        answer: options.indexOf(s.answer),
        explanation: s.explanation,
      };
    }),
});
