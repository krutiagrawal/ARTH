export interface Tree {
  id: string;
  species: string;
  nickname: string;
  plantedAt: Date;
  location: string;
  lat: number;
  lng: number;
  growthStage: 1 | 2 | 3 | 4 | 5;
  photoUri?: string;
  co2Absorbed: number;
  xpEarned: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  total?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  treesPlanted: number;
  streak: number;
  isOnline: boolean;
  lastActive: string;
  forestLevel: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  participants: number;
  daysLeft: number;
  progress: number;
  total: number;
  xpReward: number;
  icon: string;
}

export interface DailyMission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  icon: string;
  type: 'plant' | 'share' | 'learn' | 'community';
}

export const USER_DATA = {
  name: 'Kruti',
  handle: '@kruti_roots',
  treesPlanted: 47,
  totalCo2: 94.3,
  streak: 12,
  maxStreak: 28,
  xp: 3840,
  level: 8,
  forestLevel: 'Ancient Grove',
  joinDate: '2024-03-15',
  badges: 14,
  rank: 247,
  totalUsers: 48291,
};

export const PLANTED_TREES: Tree[] = [
  {
    id: 't1',
    species: 'Mangrove',
    nickname: 'Sundari',
    plantedAt: new Date('2024-11-01'),
    location: 'Sundarbans, West Bengal',
    lat: 21.9497,
    lng: 88.8774,
    growthStage: 5,
    co2Absorbed: 8.2,
    xpEarned: 120,
  },
  {
    id: 't2',
    species: 'Teak',
    nickname: 'Devraj',
    plantedAt: new Date('2024-11-15'),
    location: 'Western Ghats, Kerala',
    lat: 10.0159,
    lng: 77.0125,
    growthStage: 4,
    co2Absorbed: 5.8,
    xpEarned: 100,
  },
  {
    id: 't3',
    species: 'Bamboo',
    nickname: 'Bansuri',
    plantedAt: new Date('2024-12-02'),
    location: 'Kaziranga, Assam',
    lat: 26.5775,
    lng: 93.1701,
    growthStage: 3,
    co2Absorbed: 3.4,
    xpEarned: 90,
  },
  {
    id: 't4',
    species: 'Khejri',
    nickname: 'Desert Star',
    plantedAt: new Date('2025-01-10'),
    location: 'Aravalli, Rajasthan',
    lat: 25.3478,
    lng: 73.8756,
    growthStage: 3,
    co2Absorbed: 3.1,
    xpEarned: 90,
  },
  {
    id: 't5',
    species: 'Sandalwood',
    nickname: 'Chandan',
    plantedAt: new Date('2025-02-20'),
    location: 'Bandipur, Karnataka',
    lat: 11.6702,
    lng: 76.6340,
    growthStage: 2,
    co2Absorbed: 1.9,
    xpEarned: 80,
  },
  {
    id: 't6',
    species: 'Pine',
    nickname: 'Megha',
    plantedAt: new Date('2025-03-05'),
    location: 'Shillong, Meghalaya',
    lat: 25.5788,
    lng: 91.8933,
    growthStage: 2,
    co2Absorbed: 1.6,
    xpEarned: 80,
  },
  {
    id: 't7',
    species: 'Blue Gum',
    nickname: 'Nilgiri',
    plantedAt: new Date('2025-04-01'),
    location: 'Nilgiris, Tamil Nadu',
    lat: 11.4102,
    lng: 76.6950,
    growthStage: 1,
    co2Absorbed: 0.8,
    xpEarned: 150,
  },
  {
    id: 't8',
    species: 'Mangrove',
    nickname: 'Sagar',
    plantedAt: new Date('2025-04-20'),
    location: 'Mumbai Mangroves, Maharashtra',
    lat: 19.1136,
    lng: 72.8697,
    growthStage: 1,
    co2Absorbed: 0.5,
    xpEarned: 70,
  },
];

export const MAP_LOCATIONS = PLANTED_TREES.map(t => ({
  id: t.id,
  lat: t.lat,
  lng: t.lng,
  species: t.species,
  nickname: t.nickname,
  growthStage: t.growthStage,
  location: t.location,
}));

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', title: 'First Roots', description: 'Plant your very first tree', icon: '🌱', unlocked: true, rarity: 'common' },
  { id: 'a2', title: 'Grove Guardian', description: 'Plant 10 trees', icon: '🌳', unlocked: true, rarity: 'common' },
  { id: 'a3', title: 'Forest Keeper', description: 'Plant 25 trees', icon: '🌲', unlocked: true, rarity: 'rare' },
  { id: 'a4', title: 'Ancient Steward', description: 'Plant 50 trees', icon: '🏔️', unlocked: false, progress: 47, total: 50, rarity: 'epic' },
  { id: 'a5', title: 'Streak Warrior', description: 'Maintain a 7-day streak', icon: '🔥', unlocked: true, rarity: 'common' },
  { id: 'a6', title: 'Unstoppable', description: 'Maintain a 30-day streak', icon: '⚡', unlocked: false, progress: 12, total: 30, rarity: 'rare' },
  { id: 'a7', title: 'Carbon Hero', description: 'Absorb 50kg CO₂', icon: '🌍', unlocked: true, rarity: 'rare' },
  { id: 'a8', title: 'Diverse Forest', description: 'Plant 5 different species', icon: '🌿', unlocked: true, rarity: 'common' },
  { id: 'a9', title: 'Social Roots', description: 'Add 5 friends', icon: '👥', unlocked: false, progress: 3, total: 5, rarity: 'common' },
  { id: 'a10', title: 'Dawn Planter', description: 'Plant a tree at sunrise', icon: '🌅', unlocked: true, rarity: 'rare' },
  { id: 'a11', title: 'Legendary Grove', description: 'Reach forest level 10', icon: '✨', unlocked: false, progress: 8, total: 10, rarity: 'legendary' },
  { id: 'a12', title: 'Seasonal Spirit', description: 'Plant in all 4 seasons', icon: '🍂', unlocked: false, progress: 3, total: 4, rarity: 'epic' },
];

export const FRIENDS: Friend[] = [
  { id: 'f1', name: 'Marco', avatar: '🧑‍🌾', treesPlanted: 63, streak: 21, isOnline: true, lastActive: 'now', forestLevel: 9 },
  { id: 'f2', name: 'Yuki', avatar: '👩‍🌾', treesPlanted: 41, streak: 8, isOnline: true, lastActive: '5m ago', forestLevel: 7 },
  { id: 'f3', name: 'Sam', avatar: '🧑', treesPlanted: 28, streak: 3, isOnline: false, lastActive: '2h ago', forestLevel: 5 },
  { id: 'f4', name: 'Zara', avatar: '👧', treesPlanted: 89, streak: 45, isOnline: false, lastActive: '1d ago', forestLevel: 11 },
  { id: 'f5', name: 'Nico', avatar: '🧒', treesPlanted: 17, streak: 1, isOnline: true, lastActive: 'now', forestLevel: 3 },
];

export const CHALLENGES: Challenge[] = [
  {
    id: 'c1',
    title: 'Spring Surge',
    description: 'Plant 5 trees this week with your crew',
    participants: 2847,
    daysLeft: 4,
    progress: 3,
    total: 5,
    xpReward: 500,
    icon: '🌸',
  },
  {
    id: 'c2',
    title: 'Urban Jungle',
    description: 'Plant trees in 3 different cities',
    participants: 1203,
    daysLeft: 12,
    progress: 1,
    total: 3,
    xpReward: 350,
    icon: '🏙️',
  },
  {
    id: 'c3',
    title: 'Streak Masters',
    description: 'Keep your streak alive for 14 days',
    participants: 5621,
    daysLeft: 2,
    progress: 12,
    total: 14,
    xpReward: 200,
    icon: '🔥',
  },
  {
    id: 'c4',
    title: 'Species Explorer',
    description: 'Plant 3 rare tree species',
    participants: 891,
    daysLeft: 20,
    progress: 0,
    total: 3,
    xpReward: 800,
    icon: '🔬',
  },
];

export const DAILY_MISSIONS: DailyMission[] = [
  {
    id: 'm1',
    title: 'Morning Planting',
    description: 'Plant one tree before noon',
    xpReward: 50,
    completed: false,
    icon: '🌅',
    type: 'plant',
  },
  {
    id: 'm2',
    title: 'Share Your Forest',
    description: 'Share a forest screenshot with a friend',
    xpReward: 30,
    completed: true,
    icon: '📸',
    type: 'share',
  },
  {
    id: 'm3',
    title: 'Learn Today',
    description: 'Read 1 eco-tip about soil health',
    xpReward: 20,
    completed: false,
    icon: '📚',
    type: 'learn',
  },
  {
    id: 'm4',
    title: 'Cheer a Friend',
    description: 'React to a friend\'s tree planting',
    xpReward: 15,
    completed: false,
    icon: '💚',
    type: 'community',
  },
];

export const LEADERBOARD = [
  { rank: 1, name: 'Zara', trees: 89, streak: 45, avatar: '👧', isUser: false },
  { rank: 2, name: 'Marco', trees: 63, streak: 21, avatar: '🧑‍🌾', isUser: false },
  { rank: 3, name: 'Priya', trees: 58, streak: 18, avatar: '👩', isUser: false },
  { rank: 4, name: 'Aria (You)', trees: 47, streak: 12, avatar: '🧑', isUser: true },
  { rank: 5, name: 'Yuki', trees: 41, streak: 8, avatar: '👩‍🌾', isUser: false },
  { rank: 6, name: 'Devon', trees: 35, streak: 15, avatar: '🧔', isUser: false },
  { rank: 7, name: 'Sam', trees: 28, streak: 3, avatar: '🧑', isUser: false },
];

export const ECO_FACTS = [
  'A mature oak can absorb up to 48 pounds of CO₂ per year.',
  'Trees release phytoncides that reduce stress hormones.',
  'One tree produces enough oxygen for 2 people every year.',
  'Urban trees reduce city temperatures by up to 8°C.',
  'A single tree provides $273,000 worth of environmental benefits over its lifetime.',
];

export const FOREST_THEMES = [
  { id: 'classic', name: 'Classic Grove', unlocked: true, preview: '🌳' },
  { id: 'cherry', name: 'Cherry Blossom', unlocked: true, preview: '🌸' },
  { id: 'bamboo', name: 'Bamboo Forest', unlocked: false, preview: '🎋' },
  { id: 'autumn', name: 'Autumn Canopy', unlocked: false, preview: '🍂' },
  { id: 'magical', name: 'Magical Woodland', unlocked: false, preview: '✨' },
];

export const STREAK_DATA = [
  { week: 'Week 1', days: [true, true, true, false, true, true, true] },
  { week: 'Week 2', days: [true, true, false, false, true, true, true] },
  { week: 'Week 3', days: [true, true, true, true, true, true, true] },
  { week: 'Week 4', days: [true, true, true, true, false, false, false] },
];

export const ONBOARDING_PAGES = [
  {
    id: 1,
    title: 'Build Your\nLiving Forest',
    subtitle: 'Every tree you plant becomes part of your own evolving digital ecosystem – watch it grow with you.',
    cta: 'Begin Growing',
    accent: '#87A878',
    emoji: '🌱',
  },
  {
    id: 2,
    title: 'Protect Your\nStreak',
    subtitle: 'Plant daily to keep your streak alive. Your forest grows stronger the longer you stay consistent.',
    cta: 'I\'m Ready',
    accent: '#E8B84B',
    emoji: '🔥',
  },
  {
    id: 3,
    title: 'Real Impact,\nReal Planet',
    subtitle: 'Every photo you upload is verified. Your actions create measurable change – not just pixels.',
    cta: 'Make a Difference',
    accent: '#4A90D9',
    emoji: '🌍',
  },
  {
    id: 4,
    title: 'Grow Together\nWith Others',
    subtitle: 'Join thousands of eco-warriors. Challenge friends, celebrate together, protect the planet as one.',
    cta: 'Let\'s Plant',
    accent: '#A0724A',
    emoji: '👥',
  },
];
