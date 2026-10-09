// "Shadow Tree": only emojis that stand for exactly one plant, since most tree species share 🌳.
export interface ShadowPlant {
  emoji: string;
  name: string;
  note: string;
}

export const SHADOW_PLANTS: ShadowPlant[] = [
  { emoji: '🥭', name: 'Mango', note: 'Mango trees can live for over a hundred years.' },
  { emoji: '🥥', name: 'Coconut palm', note: 'Coconut palms grow best near coasts.' },
  { emoji: '🍊', name: 'Orange tree', note: 'Orange trees are evergreen citrus trees.' },
  { emoji: '🎋', name: 'Bamboo', note: 'Bamboo is a very fast-growing grass.' },
  { emoji: '🌵', name: 'Cactus', note: 'Cacti store water in their stems.' },
  { emoji: '🍌', name: 'Banana plant', note: 'The "trunk" of a banana plant is made of tightly packed leaf bases.' },
  { emoji: '🍍', name: 'Pineapple', note: 'Pineapples grow from a low plant, not on a tree.' },
  { emoji: '🍎', name: 'Apple tree', note: 'Apple trees need a cool winter to fruit well.' },
  { emoji: '🍋', name: 'Lemon tree', note: 'Lemon trees are evergreen citrus trees.' },
  { emoji: '🍇', name: 'Grapevine', note: 'Grapes grow on climbing vines.' },
  { emoji: '🌽', name: 'Maize (corn)', note: 'Maize is a tall cereal grass.' },
  { emoji: '🌾', name: 'Rice', note: 'Rice is grown in flooded fields called paddies.' },
  { emoji: '🌴', name: 'Palm tree', note: 'Palms have a single trunk and a crown of large leaves.' },
  { emoji: '🌻', name: 'Sunflower', note: 'Young sunflowers turn to follow the sun.' },
  { emoji: '🥑', name: 'Avocado tree', note: 'Avocado trees are tall evergreens.' },
  { emoji: '🍑', name: 'Peach tree', note: 'Peach trees blossom before their leaves appear.' },
  { emoji: '🍐', name: 'Pear tree', note: 'Pear trees can live for decades.' },
  { emoji: '🫒', name: 'Olive tree', note: 'Olive trees can live for hundreds of years.' },
  { emoji: '🌶️', name: 'Chilli plant', note: 'Chilli is a small shrubby plant.' },
  { emoji: '🥜', name: 'Peanut plant', note: 'Peanuts ripen underground.' },
];
