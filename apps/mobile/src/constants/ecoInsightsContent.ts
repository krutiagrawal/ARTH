export const ECO_HERO = {
  kicker: '🌍 WHY IT MATTERS',
  headline: 'Our Planet Is Changing — Fast.',
  body: 'Forests fall at the pace of a football field every few seconds. Every tree you plant is a small, real push back against that — and it adds up faster than you think.',
};

export interface EcoFact {
  icon: string;
  stat: string;
  headline: string;
  body: string;
  source: string;
}

// All figures below are drawn from primary sources (IPCC, FAO, WWF, NASA, USDA Forest Service,
// EPA, Forest Survey of India) and cross-checked against their original reports/press releases
// before being written up here — see each `source` line.
export const WHY_IT_MATTERS: EcoFact[] = [
  {
    icon: '🌡️',
    stat: '+1.09°C',
    headline: 'The planet has already blown past a safe threshold',
    body: 'Global average temperature has risen about 1.09°C above the 1850–1900 baseline, driving more intense heatwaves, droughts, and floods worldwide.',
    source: 'Source: IPCC Sixth Assessment Report (AR6)',
  },
  {
    icon: '🌳',
    stat: '10.9M hectares/yr',
    headline: 'A Portugal-sized forest falls every year',
    body: 'The world loses roughly 10.9 million hectares of forest a year to logging and land conversion — even after new growth is counted, forests still shrink by about 4.1 million hectares net, every single year.',
    source: 'Source: FAO Global Forest Resources Assessment 2025',
  },
  {
    icon: '🐾',
    stat: '-73%',
    headline: 'Wildlife populations have collapsed in 50 years',
    body: 'Monitored wildlife populations have fallen by an average of 73% since 1970 — freshwater species have been hit hardest, down 85% in the same period.',
    source: 'Source: WWF Living Planet Report 2024',
  },
  {
    icon: '🌬️',
    stat: 'up to 30%',
    headline: "Forests are the planet's biggest cleanup crew",
    body: "Forests and other land vegetation remove up to 30% of human CO₂ emissions every year through photosynthesis alone — but that only works for as long as they're still standing.",
    source: 'Source: NASA Earth Science',
  },
];

export const INDIA_FORESTS: EcoFact[] = [
  {
    icon: '🇮🇳',
    stat: '24.62%',
    headline: "Under a quarter of India is under forest and tree cover",
    body: "India's total forest and tree cover is 80.9 million hectares — 24.62% of the country's geographical area, still short of the national target of 33%.",
    source: 'Source: India State of Forest Report 2021, Forest Survey of India',
  },
  {
    icon: '🌲',
    stat: '21.72%',
    headline: 'Actual forest cover is smaller than the headline number',
    body: "Forest cover alone — not counting scattered trees outside forest areas — spans 7,13,789 sq km, or 21.72% of India's land area.",
    source: 'Source: India State of Forest Report 2021, Forest Survey of India',
  },
  {
    icon: '📈',
    stat: '+2,261 sq km',
    headline: 'Progress is real, but still slow',
    body: "Total forest and tree cover grew by 2,261 sq km between the 2019 and 2021 assessments — a step forward, but a small fraction of the ground needed to close the gap to 33%.",
    source: 'Source: India State of Forest Report 2021, PIB',
  },
];

export const ONE_TREE_POWER: EcoFact[] = [
  {
    icon: '🌳',
    stat: '~60kg',
    headline: 'One urban tree offsets about 60kg of CO₂ a year',
    body: "On average, a single urban tree absorbs around 60kg of CO₂ annually. Multiply that by every tree ARTH's community has planted, and it stops looking small.",
    source: 'Source: US EPA Greenhouse Gas Equivalencies Calculator',
  },
  {
    icon: '🫁',
    stat: '4 people/day',
    headline: 'One large tree can supply oxygen for up to 4 people a day',
    body: 'A mature tree produces enough oxygen in a year to meet the daily needs of about four people — every single day of that year.',
    source: 'Source: USDA Forest Service',
  },
  {
    icon: '🌡️',
    stat: 'up to -1.5°C',
    headline: 'Trees cool the streets they grow on',
    body: 'Raising tree canopy cover by 30% in a neighborhood can lower local air temperature by up to 1.5°C. City-wide, existing tree cover already cuts the urban heat-island effect roughly in half.',
    source: 'Source: Nature Communications, global city study',
  },
];

interface PlantingStep {
  icon: string;
  title: string;
  body: string;
}

export const HOW_PLANTING_HELPS: PlantingStep[] = [
  {
    icon: '📍',
    title: 'Choose & verify a spot',
    body: 'Pick a native, region-appropriate species for a location that actually gives it a chance to thrive — not just anywhere.',
  },
  {
    icon: '🌱',
    title: 'Plant with GPS-verified proof',
    body: 'Your planting is logged with real coordinates, so it counts as genuine, trackable impact — not just a number.',
  },
  {
    icon: '📈',
    title: 'Track growth & CO₂ absorbed',
    body: "Watch your tree's progress and its estimated CO₂ absorption add up over time, right on your profile.",
  },
  {
    icon: '🤝',
    title: 'Ripple it outward',
    body: 'Every planting shows up in your friends’ activity feed — one tree often becomes the reason someone else plants one too.',
  },
];

export const ECO_CTA = {
  headline: 'Your Next Tree Starts Now',
  body: "Climate change isn't someone else's job — it's everyone's, starting with the next square foot of ground you plant on.",
  buttonLabel: 'Plant a Tree 🌱',
};
