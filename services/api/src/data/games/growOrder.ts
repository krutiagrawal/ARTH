// Sequences for "Grow Order". `steps` are listed in the CORRECT order; the server shuffles them
// per day and only reveals the correct order after the play is submitted.
export interface GrowSequence {
  id: string;
  title: string;
  prompt: string;
  steps: string[];
}

export const GROW_SEQUENCES: GrowSequence[] = [
  {
    id: 'tree_life',
    title: 'Life of a tree',
    prompt: 'Put the stages of a tree\'s life in order.',
    steps: ['Seed', 'Germination', 'Seedling', 'Sapling', 'Mature tree'],
  },
  {
    id: 'plant_sapling',
    title: 'Planting a sapling',
    prompt: 'Put the steps of planting a sapling in order.',
    steps: ['Dig a pit', 'Place the sapling', 'Fill with soil', 'Water it well', 'Add mulch'],
  },
  {
    id: 'compost',
    title: 'Making compost',
    prompt: 'Put the steps of making compost in order.',
    steps: ['Collect kitchen scraps', 'Mix in dry leaves', 'Turn the pile', 'Let it break down', 'Use it on plants'],
  },
  {
    id: 'forest_water',
    title: 'Water through a forest',
    prompt: 'Follow the water: put these steps in order.',
    steps: ['Roots absorb water', 'Water rises up the trunk', 'Leaves release vapour', 'Clouds form', 'Rain falls'],
  },
  {
    id: 'photosynthesis',
    title: 'Photosynthesis',
    prompt: 'Put the steps of photosynthesis in order.',
    steps: ['Sunlight hits the leaf', 'Chlorophyll captures light', 'Water and CO₂ combine', 'Sugar is made', 'Oxygen is released'],
  },
  {
    id: 'seed_dispersal',
    title: 'Seed journey',
    prompt: 'Put the journey of a seed in order.',
    steps: ['Fruit ripens', 'A bird eats the fruit', 'Seeds are dropped far away', 'Seed germinates', 'A new seedling grows'],
  },
];
