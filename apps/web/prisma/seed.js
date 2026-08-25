const { PrismaClient } = require('@plant/db')

const prisma = new PrismaClient()

// Image URLs previously indexed via lib/data.js `IMAGES.<category>[n]`. Denormalized
// here into a direct `imageUrl` string per row instead of shipping index arrays to Postgres.
const IMAGES = {
  forests: [
    'https://images.pexels.com/photos/880675/pexels-photo-880675.jpeg',
    'https://images.pexels.com/photos/29054973/pexels-photo-29054973.jpeg',
    'https://images.pexels.com/photos/8513289/pexels-photo-8513289.jpeg',
    'https://images.pexels.com/photos/4279380/pexels-photo-4279380.jpeg',
    'https://images.pexels.com/photos/27815694/pexels-photo-27815694.jpeg',
    'https://images.pexels.com/photos/37735974/pexels-photo-37735974.jpeg',
  ],
  legacy: [
    'https://images.pexels.com/photos/33723074/pexels-photo-33723074.jpeg',
    'https://images.pexels.com/photos/34166902/pexels-photo-34166902.jpeg',
    'https://images.pexels.com/photos/34552300/pexels-photo-34552300.jpeg',
    'https://images.pexels.com/photos/38714805/pexels-photo-38714805.jpeg',
  ],
  blogs: [
    'https://images.pexels.com/photos/5285554/pexels-photo-5285554.jpeg',
    'https://images.pexels.com/photos/34730467/pexels-photo-34730467.jpeg',
    'https://images.pexels.com/photos/29849379/pexels-photo-29849379.jpeg',
    'https://images.pexels.com/photos/8134646/pexels-photo-8134646.jpeg',
  ],
}

const STATS = [
  { label: 'Trees Planted', value: 1284730, suffix: '' },
  { label: 'Volunteers', value: 84210, suffix: '' },
  { label: 'NGOs', value: 612, suffix: '' },
  { label: 'Cities', value: 214, suffix: '' },
  { label: 'Species', value: 3480, suffix: '' },
  { label: 'CSR Partners', value: 148, suffix: '' },
  { label: 'Nurseries', value: 372, suffix: '' },
  { label: 'Communities', value: 1290, suffix: '' },
]

const FORESTS = [
  { id: 'aravali-grove', name: 'Aravali Grove', location: 'Rajasthan, India', trees: 42180, volunteers: 812, species: 74, established: '2019', img: 0, story: 'A restoration effort in the arid Aravali range, transforming rocky soil into a thriving native forest of dhok, ronjh and neem.' },
  { id: 'whispering-ghats', name: 'Whispering Ghats', location: 'Kerala, India', trees: 68240, volunteers: 1420, species: 212, established: '2017', img: 1, story: 'A canopy of endemic species in the Western Ghats — one of the world\'s eight hottest biodiversity hotspots.' },
  { id: 'himalayan-cradle', name: 'Himalayan Cradle', location: 'Uttarakhand, India', trees: 29870, volunteers: 640, species: 88, established: '2020', img: 2, story: 'Oak and rhododendron forests at 2,200m — home to musk deer, monal pheasants and a hundred quiet streams.' },
  { id: 'mangrove-mile', name: 'Mangrove Mile', location: 'Sundarbans, India', trees: 51200, volunteers: 980, species: 46, established: '2018', img: 3, story: 'A coastal buffer of Sundari trees restoring the tidal edge and sheltering nesting spoonbills.' },
  { id: 'red-earth-woods', name: 'Red Earth Woods', location: 'Bandhavgarh, India', trees: 33940, volunteers: 512, species: 92, established: '2021', img: 4, story: 'Sal and mahua woodland regeneration adjoining a tiger reserve buffer zone.' },
  { id: 'monsoon-canopy', name: 'Monsoon Canopy', location: 'Meghalaya, India', trees: 47510, volunteers: 720, species: 168, established: '2016', img: 5, story: 'One of the wettest places on earth — a living cathedral of ferns, moss and living root bridges.' },
]

const LEGACY_TREES = [
  { id: 'grandfather-banyan', name: 'The Grandfather Banyan', species: 'Ficus benghalensis', owner: 'Ananya R.', years: 41, location: 'Karnataka, India', img: 0, quote: 'My father planted this tree the year I was born. It has outgrown all of us — kindly, patiently.' },
  { id: 'the-first-sapling', name: 'The First Sapling', species: 'Quercus leucotrichophora', owner: 'Ibrahim K.', years: 12, location: 'Uttarakhand, India', img: 1, quote: 'A promise to my daughter. On her tenth birthday she watered it herself.' },
  { id: 'monsoon-mother', name: 'Monsoon Mother', species: 'Mangifera indica', owner: 'Sundari P.', years: 27, location: 'Kerala, India', img: 2, quote: 'The mangoes she gives are shared across three villages. Some years we lose count.' },
  { id: 'the-quiet-one', name: 'The Quiet One', species: 'Terminalia arjuna', owner: 'Rohan S.', years: 19, location: 'Madhya Pradesh, India', img: 3, quote: 'It never asked for anything. It only kept giving shade.' },
]

const COMPETITIONS = [
  { id: 'best-looking-tree', title: 'Best Looking Tree', tagline: 'The most beautiful tree, chosen by the world.', deadline: '2025-08-14', entriesCount: 12480, img: 1 },
  { id: 'best-legacy-quote', title: 'Best Legacy Quote', tagline: 'One sentence that outlives us.', deadline: '2025-07-30', entriesCount: 8721, img: 2 },
  { id: 'greenest-school', title: 'Greenest School', tagline: 'Where the next generation grows a forest.', deadline: '2025-09-05', entriesCount: 342, img: 3 },
  { id: 'greenest-company', title: 'Greenest Company', tagline: 'Beyond CSR — measurable impact.', deadline: '2025-09-20', entriesCount: 268, img: 4 },
  { id: 'greenest-city', title: 'Greenest City', tagline: 'Cities that breathe again.', deadline: '2025-10-01', entriesCount: 96, img: 5 },
  { id: 'most-active-ngo', title: 'Most Active NGO', tagline: 'The tireless hands behind the movement.', deadline: '2025-08-28', entriesCount: 214, img: 0 },
  { id: 'most-active-community', title: 'Most Active Community', tagline: 'Neighbourhoods that plant together.', deadline: '2025-08-25', entriesCount: 1128, img: 1 },
  { id: 'best-nature-photograph', title: 'Best Nature Photograph', tagline: 'A single frame. A whole story.', deadline: '2025-07-18', entriesCount: 24810, img: 2 },
  { id: 'best-biodiversity-spot', title: 'Best Biodiversity Spot', tagline: 'Where life crowds joyfully together.', deadline: '2025-09-12', entriesCount: 812, img: 3 },
  { id: 'most-inspiring-story', title: 'Most Inspiring Story', tagline: 'The story that plants a seed in someone else.', deadline: '2025-10-10', entriesCount: 4210, img: 4 },
]

const LEADERBOARDS = {
  Individuals: [
    { name: 'Ananya Rao', place: 'Bengaluru', score: 4820 },
    { name: 'Ibrahim Khan', place: 'Dehradun', score: 4610 },
    { name: 'Sundari Pillai', place: 'Kochi', score: 4402 },
    { name: 'Rohan Sharma', place: 'Bhopal', score: 4188 },
    { name: 'Meera Iyer', place: 'Chennai', score: 3990 },
    { name: 'Tenzin Dolma', place: 'Gangtok', score: 3812 },
    { name: 'Farah Ali', place: 'Hyderabad', score: 3701 },
    { name: 'Vikram Bhat', place: 'Pune', score: 3555 },
  ],
  Communities: [
    { name: 'Yellapur Greens', place: 'Karnataka', score: 24810 },
    { name: 'Nilgiri Neighbours', place: 'Tamil Nadu', score: 22470 },
    { name: 'River Circle', place: 'Assam', score: 21320 },
    { name: 'Kutch Sowers', place: 'Gujarat', score: 19860 },
    { name: 'Konkan Roots', place: 'Maharashtra', score: 18420 },
    { name: 'Braj Bagh', place: 'Uttar Pradesh', score: 17110 },
  ],
  NGOs: [
    { name: 'Groves & Grains Trust', place: 'India', score: 128400 },
    { name: 'Wildroot Foundation', place: 'India', score: 121600 },
    { name: 'Blue Ridge Restoration', place: 'India', score: 118220 },
    { name: 'One Tree Circle', place: 'India', score: 109740 },
    { name: 'Deccan Dryland Trust', place: 'India', score: 98220 },
  ],
  Cities: [
    { name: 'Bengaluru', place: 'Karnataka', score: 78210 },
    { name: 'Kochi', place: 'Kerala', score: 71820 },
    { name: 'Dehradun', place: 'Uttarakhand', score: 68410 },
    { name: 'Guwahati', place: 'Assam', score: 61250 },
    { name: 'Pune', place: 'Maharashtra', score: 59870 },
  ],
  Schools: [
    { name: 'Rishi Valley School', place: 'Andhra Pradesh', score: 12480 },
    { name: 'Green Meadows Public', place: 'Bengaluru', score: 11720 },
    { name: 'Vidya Vann Vidyalaya', place: 'Bhopal', score: 10990 },
    { name: 'Sahyadri Vidyalaya', place: 'Pune', score: 9420 },
  ],
  Companies: [
    { name: 'Terra Textiles', place: 'India', score: 48720 },
    { name: 'Northwind Coffee Co.', place: 'India', score: 42160 },
    { name: 'Kavya Craft Studios', place: 'India', score: 39810 },
    { name: 'Meridian Semiconductors', place: 'India', score: 37220 },
  ],
  Forests: [
    { name: 'Whispering Ghats', place: 'Kerala', score: 68240 },
    { name: 'Mangrove Mile', place: 'Sundarbans', score: 51200 },
    { name: 'Monsoon Canopy', place: 'Meghalaya', score: 47510 },
    { name: 'Aravali Grove', place: 'Rajasthan', score: 42180 },
  ],
}

const BLOGS = [
  { id: 'why-native-species-matter', title: 'Why Native Species Matter More Than Ever', category: 'Wildlife', author: 'Meera Iyer', date: 'June 14, 2025', minutes: 7, img: 0, excerpt: 'A forest of the right trees, not just any trees. A field guide to planting with the land.' },
  { id: 'the-quiet-return-of-the-hornbill', title: 'The Quiet Return of the Hornbill', category: 'Wildlife', author: 'Tenzin Dolma', date: 'June 08, 2025', minutes: 5, img: 1, excerpt: 'How thirty families in Nagaland brought back a bird — and a whole forest with it.' },
  { id: 'a-monsoon-planting-guide', title: 'A Monsoon Planting Guide', category: 'Plantation Guides', author: 'Ibrahim Khan', date: 'May 30, 2025', minutes: 9, img: 2, excerpt: 'Nine species. Nine soils. Nine gentle instructions before the first rain.' },
  { id: 'reading-the-arjuna-tree', title: 'Reading the Arjuna Tree', category: 'Native Species', author: 'Sundari Pillai', date: 'May 22, 2025', minutes: 6, img: 3, excerpt: 'A river bank companion, a medicine, a shade, a story.' },
  { id: 'city-birds-are-listening', title: 'City Birds Are Listening', category: 'Environmental News', author: 'Farah Ali', date: 'May 12, 2025', minutes: 4, img: 0, excerpt: 'Urban plantings are changing the songs of common birds. Here is what we found.' },
  { id: 'the-slow-forest', title: 'The Slow Forest', category: 'Editorial', author: 'Ananya Rao', date: 'April 30, 2025', minutes: 8, img: 1, excerpt: 'On the ethic of planting something you will not live to see fully grown.' },
]

const PARTNERS = [
  { group: 'CSR', names: ['Terra Textiles', 'Northwind Coffee Co.', 'Kavya Craft Studios', 'Meridian Semiconductors', 'Aster Financial', 'Halcyon Hotels'] },
  { group: 'NGOs', names: ['Groves & Grains Trust', 'Wildroot Foundation', 'Blue Ridge Restoration', 'One Tree Circle', 'Deccan Dryland Trust', 'River Circle'] },
  { group: 'Nurseries', names: ['Sapling Studio', 'Rootworks', 'The Native Nursery', 'Green Verse', 'Aranya Bagh', 'Prithvi Pots'] },
  { group: 'Schools', names: ['Rishi Valley School', 'Green Meadows Public', 'Vidya Vann Vidyalaya', 'Sahyadri Vidyalaya', 'Modern Sanctum Academy'] },
  { group: 'Universities', names: ['Coastal Institute of Ecology', 'Himalaya University', 'Central Forest Sciences', 'Deccan Institute of Design'] },
]

const ECOSYSTEM = [
  { id: 'individuals', title: 'Individuals', description: 'Plant a tree in your name. Watch it grow across the years.', long: 'Every individual on ARTH begins with a single sapling. You choose a native species, a nursery near you, and a spot that means something. From that moment we help you track its growth, share its story, and connect it into the wider forest of the movement.' },
  { id: 'communities', title: 'Communities', description: 'Neighbourhoods, villages and citizen groups that plant together.', long: 'Community groves become landmarks. ARTH gives your community a shared page, a live tree count, a plantation calendar, and a story wall — so children who plant today can return in fifteen years to walk beneath what they made.' },
  { id: 'ngos', title: 'NGOs', description: 'Field organisations doing the tireless work of restoration.', long: 'Verified NGOs run large plantation drives on ARTH. We offer volunteer coordination, species inventory, geo-tagged planting logs, and transparent public dashboards that partners and donors can trust.' },
  { id: 'nurseries', title: 'Nurseries', description: 'The quiet heroes who grow the saplings the world will plant.', long: 'Nurseries list native saplings by region and season. Individuals, communities and NGOs source directly from them, keeping the movement rooted in local biodiversity — never imported monocultures.' },
  { id: 'organisations', title: 'Organisations', description: 'CSR & corporate partners planting forests, not press releases.', long: 'CSR partners adopt forests, sponsor community drives, and receive measurable, verifiable impact reports. No greenwashing — every tree is geo-tagged, species-tagged and public.' },
]

const MAP_POINTS = [
  { x: 22, y: 32, label: 'Aravali Grove' },
  { x: 30, y: 62, label: 'Whispering Ghats' },
  { x: 33, y: 22, label: 'Himalayan Cradle' },
  { x: 46, y: 54, label: 'Mangrove Mile' },
  { x: 40, y: 44, label: 'Red Earth Woods' },
  { x: 52, y: 30, label: 'Monsoon Canopy' },
  { x: 68, y: 40, label: 'Kinabalu Fringe' },
  { x: 78, y: 60, label: 'Reef Roots' },
  { x: 12, y: 46, label: 'Sahel Line' },
  { x: 82, y: 24, label: 'Boreal Belt' },
  { x: 26, y: 74, label: 'Cape Corridor' },
  { x: 60, y: 70, label: 'Coral Coast' },
]

const TIMELINE = [
  { year: '2016', title: 'A single sapling', text: 'Two friends plant one banyan on a dry Aravali hill. They agree to come back every year.' },
  { year: '2018', title: 'A hundred hands', text: 'Neighbours join. The hill wears its first green shawl.' },
  { year: '2020', title: 'A movement finds its name', text: 'ARTH — the earth, patient and giving — becomes a network of nurseries and NGOs.' },
  { year: '2022', title: 'A million trees', text: 'From Sundarbans to the Himalayas, a million saplings enter the ground.' },
  { year: '2025', title: 'A living archive', text: 'Every tree, every story, every hand — kept in a public, open, forever record.' },
]

async function main() {
  // NOTE: prisma.competition.deleteMany() below cascades onto real CompetitionEntry/
  // CompetitionEntryVote rows submitted by real users (see packages/db/prisma/schema.prisma) —
  // this wipe-and-reseed script is meant for fresh/dev databases, not a populated one.
  await prisma.stat.deleteMany()
  await prisma.timelineEntry.deleteMany()
  await prisma.mapPoint.deleteMany()
  await prisma.leaderboardEntry.deleteMany()
  await prisma.partner.deleteMany()
  await prisma.ecosystemEntry.deleteMany()
  await prisma.blog.deleteMany()
  await prisma.competition.deleteMany()
  await prisma.legacyTree.deleteMany()
  await prisma.forest.deleteMany()

  await prisma.forest.createMany({
    data: FORESTS.map(({ img, ...f }) => ({ ...f, imageUrl: IMAGES.forests[img] })),
  })

  await prisma.legacyTree.createMany({
    data: LEGACY_TREES.map(({ img, ...t }) => ({ ...t, imageUrl: IMAGES.legacy[img] })),
  })

  await prisma.competition.createMany({
    data: COMPETITIONS.map(({ img, deadline, ...c }) => ({
      ...c,
      deadline: new Date(deadline),
      imageUrl: IMAGES.forests[img],
    })),
  })

  await prisma.blog.createMany({
    data: BLOGS.map(({ img, ...b }) => ({ ...b, imageUrl: IMAGES.blogs[img] })),
  })

  await prisma.partner.createMany({
    data: PARTNERS.flatMap((p) => p.names.map((name) => ({ group: p.group, name }))),
  })

  await prisma.ecosystemEntry.createMany({ data: ECOSYSTEM })

  await prisma.leaderboardEntry.createMany({
    data: Object.entries(LEADERBOARDS).flatMap(([category, entries]) =>
      entries.map((e) => ({ category, ...e }))
    ),
  })

  await prisma.stat.createMany({ data: STATS })
  await prisma.timelineEntry.createMany({ data: TIMELINE })
  await prisma.mapPoint.createMany({ data: MAP_POINTS })

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
