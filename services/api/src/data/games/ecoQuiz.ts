// Question bank for "Eco Quiz". `answer` is the index into `options`; it never leaves the server
// until the day's quiz has been submitted.
export interface QuizQuestion {
  q: string;
  options: [string, string, string, string];
  answer: number;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  { q: 'Which gas do trees absorb from the air for photosynthesis?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'], answer: 1 },
  { q: 'Which part of a tree takes up water from the soil?', options: ['Leaves', 'Bark', 'Roots', 'Flowers'], answer: 2 },
  { q: 'Which tree is held sacred in India and linked to the Buddha\'s enlightenment?', options: ['Peepal', 'Eucalyptus', 'Jacaranda', 'Silver Oak'], answer: 0 },
  { q: 'Which Indian tree is often called the "village pharmacy"?', options: ['Teak', 'Neem', 'Pine', 'Gulmohar'], answer: 1 },
  { q: 'Which fruit is known as the "king of fruits" in India?', options: ['Guava', 'Jamun', 'Orange', 'Mango'], answer: 3 },
  { q: 'What is it called when plants release water vapour through their leaves?', options: ['Transpiration', 'Germination', 'Erosion', 'Pollination'], answer: 0 },
  { q: 'Mangroves mainly grow in which kind of place?', options: ['Deserts', 'Snowy mountains', 'Coastal tidal areas', 'Dry grasslands'], answer: 2 },
  { q: 'Which fast-growing plant is a type of grass, not a true tree?', options: ['Bamboo', 'Banyan', 'Mango', 'Neem'], answer: 0 },
  { q: 'What is a small group of trees growing together called?', options: ['Herd', 'Grove', 'Swarm', 'Colony'], answer: 1 },
  { q: 'What does mulch around a sapling mainly help with?', options: ['Attracting insects', 'Making it grow taller overnight', 'Keeping soil moist and cool', 'Changing leaf colour'], answer: 2 },
  { q: 'What is the best way to water a young sapling?', options: ['Deeply, but less often', 'A splash every hour', 'Only when it rains', 'Never in summer'], answer: 0 },
  { q: 'What is the leafy "roof" of a forest called?', options: ['Understory', 'Canopy', 'Forest floor', 'Taproot'], answer: 1 },
  { q: 'Which pigment makes leaves green?', options: ['Melanin', 'Carotene', 'Chlorophyll', 'Keratin'], answer: 2 },
  { q: 'Which animals commonly help spread tree seeds?', options: ['Birds', 'Fish only', 'Rocks', 'Clouds'], answer: 0 },
  { q: 'Decomposed leaves and plant matter turn into rich dark soil matter called what?', options: ['Gravel', 'Humus', 'Clay', 'Sand'], answer: 1 },
  { q: 'Which season is best for planting saplings in most of India?', options: ['Peak summer', 'Winter nights', 'Monsoon', 'Dry spring'], answer: 2 },
  { q: 'Which of these trees is native to India?', options: ['Neem', 'Blue Gum', 'Jacaranda', 'Silver Oak'], answer: 0 },
  { q: 'Which tree is famous for its aerial prop roots that grow down like new trunks?', options: ['Coconut', 'Pine', 'Banyan', 'Teak'], answer: 2 },
  { q: 'What can the rings inside a tree trunk tell you?', options: ['Its height in metres', "The tree's age", 'The soil colour', 'Its fruit flavour'], answer: 1 },
  { q: 'How do trees help cool a city?', options: ['They make wind stop', 'They absorb sound only', 'Shade and releasing water vapour', 'They reflect all sunlight'], answer: 2 },
];

export const QUIZ_QUESTIONS_PER_DAY = 5;
