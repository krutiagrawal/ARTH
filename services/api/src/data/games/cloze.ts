// "Missing Letters" (fill the blank). Each round shows the sentence with ____ and a 6-word bank:
// the answer plus 5 distractors drawn from DISTRACTORS.
export interface ClozeSentence {
  text: string; // contains "____"
  answer: string;
  explanation: string;
}

export const CLOZE_SENTENCES: ClozeSentence[] = [
  { text: 'Trees take in carbon dioxide and release ____.', answer: 'oxygen', explanation: 'Photosynthesis releases oxygen as a by-product.' },
  { text: 'The leafy top layer of a forest is called the ____.', answer: 'canopy', explanation: 'The canopy is the "roof" of the forest.' },
  { text: 'A ____ is a young tree that has recently been planted.', answer: 'sapling', explanation: 'Saplings are young, slim trees.' },
  { text: 'A layer of mulch keeps the soil ____.', answer: 'moist', explanation: 'Mulch slows evaporation.' },
  { text: 'Plants make food from sunlight in a process called ____.', answer: 'photosynthesis', explanation: 'Photosynthesis turns light, water and CO₂ into sugar.' },
  { text: 'Mangroves grow in coastal ____ areas.', answer: 'tidal', explanation: 'Mangroves live where the tide floods the shore.' },
  { text: 'Rotted plant and food waste turns into nutrient-rich ____.', answer: 'compost', explanation: 'Compost feeds the soil.' },
  { text: 'Roots hold soil together and help prevent ____.', answer: 'erosion', explanation: 'Root networks bind soil.' },
  { text: 'Leaves lose water vapour through tiny pores called ____.', answer: 'stomata', explanation: 'Stomata also let leaves take in CO₂.' },
  { text: 'Most saplings in India are planted during the ____.', answer: 'monsoon', explanation: 'Rain keeps young plants watered.' },
  { text: 'Birds and animals help forests spread by carrying ____.', answer: 'seeds', explanation: 'Seed dispersal helps new trees grow far from the parent.' },
  { text: 'The green pigment in leaves is called ____.', answer: 'chlorophyll', explanation: 'Chlorophyll captures sunlight.' },
  { text: 'Counting a tree trunk\'s ____ can show how old it is.', answer: 'rings', explanation: 'Most trees add one ring a year.' },
  { text: 'Growing trees helps fight climate change by storing ____.', answer: 'carbon', explanation: 'Trees lock carbon into wood and roots.' },
  { text: 'A banyan grows hanging ____ roots that become new trunks.', answer: 'aerial', explanation: 'Aerial roots reach the ground and thicken.' },
  { text: 'Bamboo is a fast-growing type of ____.', answer: 'grass', explanation: 'Bamboo belongs to the grass family.' },
  { text: 'Forests shelter thousands of different ____, which is what we call biodiversity.', answer: 'species', explanation: 'Biodiversity means the variety of living species.' },
  { text: 'Trees give ____ that keeps streets and homes cooler.', answer: 'shade', explanation: 'Shade lowers surface and air temperature.' },
];

export const DISTRACTORS: string[] = [
  'nitrogen', 'helium', 'desert', 'plastic', 'concrete', 'winter', 'fossil', 'metal', 'noise', 'rocks',
  'sand', 'glass', 'smoke', 'steel', 'dust', 'ice', 'cement', 'gravel', 'neon', 'tar',
];
