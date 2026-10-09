// "Eco Connections": each puzzle is 4 groups of 4 words. No word may appear in two groups of the
// same puzzle, and no word should plausibly fit another group in its puzzle.
export interface ConnectionGroup {
  category: string;
  words: [string, string, string, string];
}

const G = {
  fruitTrees: { category: 'Fruit trees', words: ['MANGO', 'GUAVA', 'JAMUN', 'AMLA'] },
  fruitTrees2: { category: 'Fruit trees', words: ['LEMON', 'PAPAYA', 'GUAVA', 'MANGO'] },
  treeParts: { category: 'Parts of a tree', words: ['ROOT', 'TRUNK', 'BARK', 'BRANCH'] },
  treeParts2: { category: 'Parts of a tree', words: ['TWIG', 'CANOPY', 'ROOT', 'BARK'] },
  wildlife: { category: 'Forest wildlife', words: ['TIGER', 'LANGUR', 'HORNBILL', 'PEACOCK'] },
  wildlife2: { category: 'Forest wildlife', words: ['ELEPHANT', 'LEOPARD', 'TIGER', 'PEACOCK'] },
  compost: { category: 'Compost-friendly', words: ['PEELS', 'EGGSHELLS', 'SCRAPS', 'MANURE'] },
  compost2: { category: 'Compost-friendly', words: ['PEELS', 'SAWDUST', 'MANURE', 'SCRAPS'] },
  habitats: { category: 'Habitats', words: ['MANGROVE', 'WETLAND', 'GRASSLAND', 'RAINFOREST'] },
  habitats2: { category: 'Habitats', words: ['DESERT', 'TUNDRA', 'WETLAND', 'MANGROVE'] },
  water: { category: 'Water bodies', words: ['RIVER', 'POND', 'LAKE', 'STREAM'] },
  energy: { category: 'Renewable energy', words: ['SOLAR', 'WIND', 'HYDRO', 'BIOMASS'] },
  energy2: { category: 'Renewable energy', words: ['SOLAR', 'WIND', 'TIDAL', 'GEOTHERMAL'] },
  recycle: { category: 'Recyclables', words: ['GLASS', 'PAPER', 'ALUMINIUM', 'CARDBOARD'] },
  recycle2: { category: 'Recyclables', words: ['STEEL', 'GLASS', 'PAPER', 'CARDBOARD'] },
  seasons: { category: 'Seasons', words: ['MONSOON', 'SUMMER', 'WINTER', 'AUTUMN'] },
  tools: { category: 'Garden tools', words: ['SPADE', 'TROWEL', 'RAKE', 'SHEARS'] },
  tools2: { category: 'Garden tools', words: ['HOE', 'RAKE', 'SPADE', 'TROWEL'] },
  pollinators: { category: 'Pollinators', words: ['BEE', 'BUTTERFLY', 'MOTH', 'SUNBIRD'] },
  flowers: { category: 'Garden flowers', words: ['LOTUS', 'JASMINE', 'MARIGOLD', 'HIBISCUS'] },
  flowers2: { category: 'Garden flowers', words: ['ROSE', 'LOTUS', 'MARIGOLD', 'JASMINE'] },
  growth: { category: 'Growth stages', words: ['SEED', 'SPROUT', 'SAPLING', 'TREE'] },
} satisfies Record<string, ConnectionGroup>;

export interface ConnectionsPuzzle {
  id: string;
  /** Ordered easiest to hardest, which the client uses for the reveal color. */
  groups: [ConnectionGroup, ConnectionGroup, ConnectionGroup, ConnectionGroup];
}

export const CONNECTIONS_PUZZLES: ConnectionsPuzzle[] = [
  { id: 'p1', groups: [G.fruitTrees, G.treeParts, G.wildlife, G.compost] },
  { id: 'p2', groups: [G.habitats, G.water, G.energy, G.recycle] },
  { id: 'p3', groups: [G.seasons, G.tools, G.pollinators, G.flowers] },
  { id: 'p4', groups: [G.fruitTrees2, G.growth, G.energy2, G.wildlife2] },
  { id: 'p5', groups: [G.treeParts2, G.habitats2, G.tools2, G.pollinators] },
  { id: 'p6', groups: [G.recycle2, G.seasons, G.flowers2, G.compost2] },
];
