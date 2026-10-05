// Short, species-specific care advice for the planting success card. Matched by keyword against
// the species' common name; anything unrecognised falls back to generic advice.

const GENERIC_TIP = 'Water it regularly for the first year, mulch around the base and log health check-ins to track its growth.';

const SPECIES_TIPS: { keywords: string[]; tip: string }[] = [
  { keywords: ['neem'], tip: 'Neem is hardy and drought-tolerant — water deeply once a week while young, then let rain do most of the work.' },
  { keywords: ['banyan'], tip: 'Banyans need lots of room to spread. Keep the base clear of walls and drains, and water well through the first dry seasons.' },
  { keywords: ['peepal', 'pipal', 'bodhi'], tip: 'Peepal grows fast but has aggressive roots — keep it away from buildings and water it regularly for the first two years.' },
  { keywords: ['mango'], tip: 'Mango saplings love sun. Water every few days at first, protect from strong wind, and skip heavy watering once established.' },
  { keywords: ['gulmohar', 'gulmohur'], tip: 'Gulmohar thrives in full sun with deep, infrequent watering. Prune lightly after flowering to keep a strong shape.' },
  { keywords: ['jamun'], tip: 'Jamun likes moist soil in its early years. Water deeply twice a week and mulch to hold in moisture.' },
  { keywords: ['guava'], tip: 'Guava needs full sun and regular watering while young. Feed with compost before the monsoon for better fruiting.' },
  { keywords: ['banana', 'plantain'], tip: 'Bananas are thirsty and hungry — keep the soil moist, mulch heavily and shelter the leaves from strong wind.' },
  { keywords: ['coconut'], tip: 'Coconut palms need plenty of water and sun while young. Keep the crown clear of debris and water deeply every few days.' },
  { keywords: ['teak'], tip: 'Teak wants full sun and well-drained soil. Keep weeds away from the base and water weekly in the dry season.' },
  { keywords: ['bamboo'], tip: 'Bamboo is a heavy drinker while establishing — keep soil consistently moist and mulch to keep the roots cool.' },
  { keywords: ['tamarind'], tip: 'Tamarind is slow to start but very tough. Water regularly for the first year, then it will largely look after itself.' },
  { keywords: ['arjun', 'arjuna'], tip: 'Arjuna prefers moist soil near water. Keep it well watered through summer and protect young stems from grazing.' },
  { keywords: ['ashoka', 'ashok'], tip: 'Ashoka likes partial shade and rich, moist soil. Mulch the base and water often during hot, dry spells.' },
  { keywords: ['sandalwood'], tip: 'Sandalwood is a semi-parasite and grows best near a companion plant. Water lightly and never let the soil get waterlogged.' },
  { keywords: ['oak'], tip: 'Oaks are slow but long-lived. Keep the soil moist, protect from grazing and avoid disturbing the roots.' },
  { keywords: ['pine', 'cedar', 'deodar'], tip: 'Conifers prefer cool, well-drained soil. Water steadily in dry spells and keep the base free of competing weeds.' },
  { keywords: ['rose'], tip: 'Roses love sun and airy spacing. Water at the base, not the leaves, and prune dead stems to encourage new growth.' },
  { keywords: ['tulsi', 'basil'], tip: 'Tulsi loves sun and regular, light watering. Pinch off flower spikes to keep it bushy and productive.' },
];

export function getSpeciesCareTip(speciesName?: string | null): string {
  const name = (speciesName || '').toLowerCase();
  if (!name) return GENERIC_TIP;
  const match = SPECIES_TIPS.find((entry) => entry.keywords.some((k) => name.includes(k)));
  return match ? match.tip : GENERIC_TIP;
}
