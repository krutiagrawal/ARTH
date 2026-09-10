import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSpecies() {
  const species = [
    { key: 'mangrove', commonName: 'Mangrove', emoji: '🌳', co2KgPerYear: 8.0, sortOrder: 1 },
    { key: 'teak', commonName: 'Teak', emoji: '🌲', co2KgPerYear: 6.0, sortOrder: 2 },
    { key: 'bamboo', commonName: 'Bamboo', emoji: '🎋', co2KgPerYear: 4.0, sortOrder: 3 },
    { key: 'khejri', commonName: 'Khejri', emoji: '🌵', co2KgPerYear: 3.2, sortOrder: 4 },
    { key: 'sandalwood', commonName: 'Sandalwood', emoji: '🪵', co2KgPerYear: 2.0, sortOrder: 5 },
    { key: 'pine', commonName: 'Pine', emoji: '🌲', co2KgPerYear: 1.8, sortOrder: 6 },
    { key: 'blue_gum', commonName: 'Blue Gum', emoji: '🌿', co2KgPerYear: 1.0, sortOrder: 7 },
    { key: 'oak', commonName: 'Oak', emoji: '🌳', co2KgPerYear: 5.5, sortOrder: 8 },
    { key: 'cherry_blossom', commonName: 'Cherry Blossom', emoji: '🌸', co2KgPerYear: 2.5, sortOrder: 9 },
    { key: 'maple', commonName: 'Maple', emoji: '🍁', co2KgPerYear: 3.5, sortOrder: 10 },
    { key: 'palm', commonName: 'Palm', emoji: '🌴', co2KgPerYear: 1.5, sortOrder: 11 },
    { key: 'willow', commonName: 'Willow', emoji: '🌿', co2KgPerYear: 2.2, sortOrder: 12 },
    { key: 'orange_tree', commonName: 'Orange Tree', emoji: '🍊', co2KgPerYear: 2.8, sortOrder: 13 },
    // Common in Indian nurseries and drive plantings.
    { key: 'neem', commonName: 'Neem', emoji: '🌳', co2KgPerYear: 4.5, sortOrder: 14 },
    { key: 'banyan', commonName: 'Banyan', emoji: '🌳', co2KgPerYear: 7.5, sortOrder: 15 },
    { key: 'peepal', commonName: 'Peepal', emoji: '🌳', co2KgPerYear: 5.0, sortOrder: 16 },
    { key: 'gulmohar', commonName: 'Gulmohar', emoji: '🌺', co2KgPerYear: 3.0, sortOrder: 17 },
    { key: 'amla', commonName: 'Amla', emoji: '🌿', co2KgPerYear: 2.0, sortOrder: 18 },
    { key: 'ashoka', commonName: 'Ashoka Tree', emoji: '🌲', co2KgPerYear: 2.5, sortOrder: 19 },
    { key: 'jamun', commonName: 'Jamun', emoji: '🫐', co2KgPerYear: 3.0, sortOrder: 20 },
    { key: 'mango', commonName: 'Mango Tree', emoji: '🥭', co2KgPerYear: 4.2, sortOrder: 21 },
    { key: 'guava', commonName: 'Guava', emoji: '🌳', co2KgPerYear: 2.0, sortOrder: 22 },
    { key: 'moringa', commonName: 'Moringa (Drumstick)', emoji: '🌿', co2KgPerYear: 2.2, sortOrder: 23 },
    { key: 'karanj', commonName: 'Karanj (Pongamia)', emoji: '🌳', co2KgPerYear: 3.5, sortOrder: 24 },
    { key: 'arjuna', commonName: 'Arjuna', emoji: '🌳', co2KgPerYear: 4.2, sortOrder: 25 },
    { key: 'jacaranda', commonName: 'Jacaranda', emoji: '🌸', co2KgPerYear: 3.0, sortOrder: 26 },
    { key: 'champa', commonName: 'Champa (Plumeria)', emoji: '🌺', co2KgPerYear: 1.8, sortOrder: 27 },
    { key: 'curry_leaf', commonName: 'Curry Leaf', emoji: '🌿', co2KgPerYear: 0.8, sortOrder: 28 },
    { key: 'coconut', commonName: 'Coconut Palm', emoji: '🥥', co2KgPerYear: 3.0, sortOrder: 29 },
    { key: 'bougainvillea', commonName: 'Bougainvillea', emoji: '🌺', co2KgPerYear: 1.2, sortOrder: 30 },
    { key: 'silver_oak', commonName: 'Silver Oak', emoji: '🌲', co2KgPerYear: 3.8, sortOrder: 31 },
    { key: 'rain_tree', commonName: 'Rain Tree', emoji: '🌳', co2KgPerYear: 6.5, sortOrder: 32 },
    { key: 'kadamba', commonName: 'Kadamba', emoji: '🌳', co2KgPerYear: 3.2, sortOrder: 33 },
    { key: 'subabul', commonName: 'Subabul', emoji: '🌿', co2KgPerYear: 2.0, sortOrder: 34 },
  ];

  for (const s of species) {
    await prisma.treeSpecies.upsert({ where: { key: s.key }, update: s, create: s });
  }
}

async function seedAchievements() {
  const achievements = [
    { key: 'first_roots', title: 'First Roots', description: 'Plant your very first tree', icon: '🌱', rarity: 'common', criteriaType: 'trees_planted', criteriaTarget: 1, sortOrder: 1 },
    { key: 'grove_guardian', title: 'Grove Guardian', description: 'Plant 10 trees', icon: '🌳', rarity: 'common', criteriaType: 'trees_planted', criteriaTarget: 10, sortOrder: 2 },
    { key: 'forest_keeper', title: 'Forest Keeper', description: 'Plant 25 trees', icon: '🌲', rarity: 'rare', criteriaType: 'trees_planted', criteriaTarget: 25, sortOrder: 3 },
    { key: 'ancient_steward', title: 'Ancient Steward', description: 'Plant 50 trees', icon: '🏔️', rarity: 'epic', criteriaType: 'trees_planted', criteriaTarget: 50, sortOrder: 4 },
    { key: 'streak_warrior', title: 'Streak Warrior', description: 'Maintain a 7-day streak', icon: '🔥', rarity: 'common', criteriaType: 'streak_days', criteriaTarget: 7, sortOrder: 5 },
    { key: 'unstoppable', title: 'Unstoppable', description: 'Maintain a 30-day streak', icon: '⚡', rarity: 'rare', criteriaType: 'streak_days', criteriaTarget: 30, sortOrder: 6 },
    { key: 'carbon_hero', title: 'Carbon Hero', description: 'Absorb 50kg CO₂', icon: '🌍', rarity: 'rare', criteriaType: 'co2_absorbed', criteriaTarget: 50, sortOrder: 7 },
    { key: 'diverse_forest', title: 'Diverse Forest', description: 'Plant 5 different species', icon: '🌿', rarity: 'common', criteriaType: 'species_diversity', criteriaTarget: 5, sortOrder: 8 },
    { key: 'social_roots', title: 'Social Roots', description: 'Add 5 friends', icon: '👥', rarity: 'common', criteriaType: 'friends_count', criteriaTarget: 5, sortOrder: 9 },
    { key: 'dawn_planter', title: 'Dawn Planter', description: 'Plant a tree at sunrise', icon: '🌅', rarity: 'rare', criteriaType: 'trees_planted', criteriaTarget: null, sortOrder: 10 },
    { key: 'legendary_grove', title: 'Legendary Grove', description: 'Reach forest level 10', icon: '✨', rarity: 'legendary', criteriaType: 'forest_level', criteriaTarget: 10, sortOrder: 11 },
    { key: 'seasonal_spirit', title: 'Seasonal Spirit', description: 'Plant in all 4 seasons', icon: '🍂', rarity: 'epic', criteriaType: 'seasonal_diversity', criteriaTarget: 4, sortOrder: 12 },
  ] as const;

  for (const a of achievements) {
    await prisma.achievement.upsert({ where: { key: a.key }, update: a, create: a });
  }
}

async function seedNgoAchievements() {
  const achievements = [
    // Milestones
    { key: 'ngo_first_drive', title: 'First Drive', description: 'Host your first planting drive', icon: '🌱', rarity: 'common', criteriaType: 'drives_hosted', criteriaTarget: 1, sortOrder: 1 },
    { key: 'ngo_grove_builder', title: 'Grove Builder', description: 'Host 10 planting drives', icon: '🌳', rarity: 'rare', criteriaType: 'drives_hosted', criteriaTarget: 10, sortOrder: 2 },
    { key: 'ngo_100_trees', title: '100 Trees Planted', description: 'Log 100 planted trees', icon: '🌲', rarity: 'common', criteriaType: 'trees_planted', criteriaTarget: 100, sortOrder: 3 },
    { key: 'ngo_1000_trees', title: '1,000 Trees Planted', description: 'Log 1,000 planted trees', icon: '🌴', rarity: 'epic', criteriaType: 'trees_planted', criteriaTarget: 1000, sortOrder: 4 },
    { key: 'ngo_fundraiser', title: 'Fundraiser', description: 'Raise ₹50,000 across your campaigns', icon: '💰', rarity: 'rare', criteriaType: 'funds_raised_cents', criteriaTarget: 5000000, sortOrder: 5 },
    { key: 'ngo_major_fundraiser', title: 'Major Fundraiser', description: 'Raise ₹5,00,000 across your campaigns', icon: '💎', rarity: 'legendary', criteriaType: 'funds_raised_cents', criteriaTarget: 50000000, sortOrder: 6 },
    // Consistency
    { key: 'ngo_active_voice', title: 'Active Voice', description: 'Post an update for 4 weeks in a row', icon: '📣', rarity: 'common', criteriaType: 'streak_weeks', criteriaTarget: 4, sortOrder: 7 },
    { key: 'ngo_steady_presence', title: 'Steady Presence', description: 'Post an update for 12 weeks in a row', icon: '🔥', rarity: 'rare', criteriaType: 'streak_weeks', criteriaTarget: 12, sortOrder: 8 },
    { key: 'ngo_year_round_presence', title: 'Year-Round Presence', description: 'Post an update for 52 weeks in a row', icon: '⭐', rarity: 'legendary', criteriaType: 'streak_weeks', criteriaTarget: 52, sortOrder: 9 },
    // Community reach
    { key: 'ngo_growing_circle', title: 'Growing Circle', description: 'Reach 50 volunteers across your drives', icon: '🤝', rarity: 'common', criteriaType: 'volunteers_reached', criteriaTarget: 50, sortOrder: 10 },
    { key: 'ngo_community_favorite', title: 'Community Favorite', description: 'Reach 100 followers', icon: '❤️', rarity: 'rare', criteriaType: 'followers_count', criteriaTarget: 100, sortOrder: 11 },
    { key: 'ngo_movement_builder', title: 'Movement Builder', description: 'Reach 500 followers', icon: '🚀', rarity: 'epic', criteriaType: 'followers_count', criteriaTarget: 500, sortOrder: 12 },
  ] as const;

  for (const a of achievements) {
    await prisma.ngoAchievement.upsert({ where: { key: a.key }, update: a, create: a });
  }
}

async function seedGroupAchievements() {
  const achievements = [
    { key: 'group_first_roots', title: 'First Roots', description: 'Plant your first tree as a group', icon: '🌱', rarity: 'common', criteriaType: 'trees_planted', criteriaTarget: 1, sortOrder: 1 },
    { key: 'group_grove_builders', title: 'Grove Builders', description: 'Plant 50 trees together', icon: '🌳', rarity: 'rare', criteriaType: 'trees_planted', criteriaTarget: 50, sortOrder: 2 },
    { key: 'group_forest_founders', title: 'Forest Founders', description: 'Plant 250 trees together', icon: '🌲', rarity: 'epic', criteriaType: 'trees_planted', criteriaTarget: 250, sortOrder: 3 },
    { key: 'group_full_house', title: 'Full House', description: 'Grow your group to 10 members', icon: '👥', rarity: 'common', criteriaType: 'member_count', criteriaTarget: 10, sortOrder: 4 },
    { key: 'group_two_weeks_strong', title: 'Two Weeks Strong', description: 'Keep the group streak alive for 14 days', icon: '🔥', rarity: 'rare', criteriaType: 'streak_days', criteriaTarget: 14, sortOrder: 5 },
    { key: 'group_century_streak', title: 'Century Streak', description: 'Keep the group streak alive for 100 days', icon: '⭐', rarity: 'legendary', criteriaType: 'streak_days', criteriaTarget: 100, sortOrder: 6 },
    { key: 'group_carbon_crew', title: 'Carbon Crew', description: 'Absorb 500kg of CO₂ together', icon: '🌍', rarity: 'epic', criteriaType: 'co2_absorbed', criteriaTarget: 500, sortOrder: 7 },
    { key: 'group_challenge_champions', title: 'Challenge Champions', description: 'Complete 3 group challenges', icon: '🏆', rarity: 'rare', criteriaType: 'challenges_completed', criteriaTarget: 3, sortOrder: 8 },
  ] as const;

  for (const a of achievements) {
    await prisma.groupAchievement.upsert({ where: { key: a.key }, update: a, create: a });
  }
}

async function seedNurseryAchievements() {
  const achievements = [
    { key: 'nursery_first_listing', title: 'First Listing', description: 'List your first species in stock', icon: '🌱', rarity: 'common', criteriaType: 'species_listed', criteriaTarget: 1, sortOrder: 1 },
    { key: 'nursery_full_shelf', title: 'Full Shelf', description: 'List 10 different species', icon: '🌿', rarity: 'rare', criteriaType: 'species_listed', criteriaTarget: 10, sortOrder: 2 },
    { key: 'nursery_generous_grower', title: 'Generous Grower', description: 'Give out 100 saplings to planters', icon: '🎁', rarity: 'rare', criteriaType: 'saplings_given_out', criteriaTarget: 100, sortOrder: 3 },
    { key: 'nursery_community_pillar', title: 'Community Pillar', description: 'Give out 1,000 saplings to planters', icon: '🌳', rarity: 'legendary', criteriaType: 'saplings_given_out', criteriaTarget: 1000, sortOrder: 4 },
    { key: 'nursery_trusted_nursery', title: 'Trusted Nursery', description: 'Fulfil 10 reservation requests', icon: '🤝', rarity: 'rare', criteriaType: 'reservations_fulfilled', criteriaTarget: 10, sortOrder: 5 },
    { key: 'nursery_week_long_streak', title: 'Week-Long Streak', description: 'Stay active for 7 days in a row', icon: '🔥', rarity: 'common', criteriaType: 'streak_days', criteriaTarget: 7, sortOrder: 6 },
    { key: 'nursery_century_streak', title: 'Century Streak', description: 'Stay active for 100 days in a row', icon: '⭐', rarity: 'legendary', criteriaType: 'streak_days', criteriaTarget: 100, sortOrder: 7 },
  ] as const;

  for (const a of achievements) {
    await prisma.nurseryAchievement.upsert({ where: { key: a.key }, update: a, create: a });
  }
}

async function seedForestThemes() {
  const themes = [
    { key: 'classic', name: 'Classic Grove', previewEmoji: '🌳', isDefaultUnlocked: true, sortOrder: 1 },
    { key: 'cherry', name: 'Cherry Blossom', previewEmoji: '🌸', isDefaultUnlocked: true, sortOrder: 2 },
    { key: 'bamboo', name: 'Bamboo Forest', previewEmoji: '🎋', isDefaultUnlocked: true, sortOrder: 3 },
    { key: 'autumn', name: 'Autumn Canopy', previewEmoji: '🍂', isDefaultUnlocked: true, sortOrder: 4 },
    { key: 'magical', name: 'Magical Woodland', previewEmoji: '✨', isDefaultUnlocked: true, sortOrder: 5 },
  ];

  for (const t of themes) {
    await prisma.forestTheme.upsert({ where: { key: t.key }, update: t, create: t });
  }

  // Backfill: unlock this theme for every existing user too, not just new registrations.
  await prisma.userForestTheme.updateMany({
    where: { theme: { key: { in: themes.map(t => t.key) } }, unlocked: false },
    data: { unlocked: true, unlockedAt: new Date() },
  });
}

async function seedDecorationTypes() {
  const decorations = [
    // Canopy
    { key: 'golden_oak_cluster', zone: 'canopy', name: 'Golden Oak Cluster', colorway: '#D4A853', variant: 'cluster-canopy', sortOrder: 1 },
    { key: 'silver_birch_grove', zone: 'canopy', name: 'Silver Birch Grove', colorway: '#DCE8D8', variant: 'cluster-canopy', sortOrder: 2 },
    { key: 'crimson_maple', zone: 'canopy', name: 'Crimson Maple', colorway: '#B03A2E', variant: 'cluster-canopy', sortOrder: 3 },
    { key: 'emerald_pine_stand', zone: 'canopy', name: 'Emerald Pine Stand', colorway: '#1B4D3E', variant: 'cluster-canopy', sortOrder: 4 },
    { key: 'blossom_canopy', zone: 'canopy', name: 'Blossom Canopy', colorway: '#F4B8C8', variant: 'cluster-canopy', sortOrder: 5 },
    { key: 'autumn_amber_cluster', zone: 'canopy', name: 'Autumn Amber Cluster', colorway: '#E08A3C', variant: 'cluster-canopy', sortOrder: 6 },
    { key: 'violet_wisteria_drape', zone: 'canopy', name: 'Violet Wisteria Drape', colorway: '#9B7EBD', variant: 'drape-canopy', sortOrder: 7 },
    { key: 'moonlit_willow', zone: 'canopy', name: 'Moonlit Willow', colorway: '#8FA8B8', variant: 'drape-canopy', sortOrder: 8 },
    { key: 'jade_bamboo_cluster', zone: 'canopy', name: 'Jade Bamboo Cluster', colorway: '#6FAE7C', variant: 'bamboo-canopy', sortOrder: 9 },
    { key: 'sunset_copper_canopy', zone: 'canopy', name: 'Sunset Copper Canopy', colorway: '#C76B3D', variant: 'cluster-canopy', sortOrder: 10 },
    // Understory
    { key: 'fern_frond_cluster', zone: 'understory', name: 'Fern Frond Cluster', colorway: '#4C7A4C', variant: 'fern', sortOrder: 1 },
    { key: 'wild_berry_bush', zone: 'understory', name: 'Wild Berry Bush', colorway: '#3F6B4A', variant: 'berry-bush', sortOrder: 2 },
    { key: 'lavender_sprig', zone: 'understory', name: 'Lavender Sprig', colorway: '#9B8EC4', variant: 'shrub', sortOrder: 3 },
    { key: 'sage_shrub', zone: 'understory', name: 'Sage Shrub', colorway: '#8FA888', variant: 'shrub', sortOrder: 4 },
    { key: 'holly_bush', zone: 'understory', name: 'Holly Bush', colorway: '#2F5E3A', variant: 'berry-bush', sortOrder: 5 },
    { key: 'bamboo_sprout', zone: 'understory', name: 'Bamboo Sprout', colorway: '#7FBF6A', variant: 'grass-tuft', sortOrder: 6 },
    { key: 'fiddlehead_fern', zone: 'understory', name: 'Fiddlehead Fern', colorway: '#5C8A5C', variant: 'fern', sortOrder: 7 },
    { key: 'golden_grass_tuft', zone: 'understory', name: 'Golden Grass Tuft', colorway: '#D6B863', variant: 'grass-tuft', sortOrder: 8 },
    { key: 'snowberry_bush', zone: 'understory', name: 'Snowberry Bush', colorway: '#6B8F6B', variant: 'berry-bush', sortOrder: 9 },
    { key: 'moss_covered_log', zone: 'understory', name: 'Moss-Covered Log', colorway: '#5A7350', variant: 'moss-log', sortOrder: 10 },
    // Forest Floor
    { key: 'red_toadstool', zone: 'forest_floor', name: 'Red Toadstool', colorway: '#C0392B', variant: 'mushroom-cap', sortOrder: 1 },
    { key: 'golden_chanterelle', zone: 'forest_floor', name: 'Golden Chanterelle', colorway: '#E0A030', variant: 'mushroom-cap', sortOrder: 2 },
    { key: 'fairy_ring_cluster', zone: 'forest_floor', name: 'Fairy Ring Cluster', colorway: '#E8DCC8', variant: 'mushroom-cap', sortOrder: 3 },
    { key: 'shelf_fungi', zone: 'forest_floor', name: 'Shelf Fungi', colorway: '#8B5E3C', variant: 'shelf-fungi', sortOrder: 4 },
    { key: 'bluecap_mushroom', zone: 'forest_floor', name: 'Bluecap Mushroom', colorway: '#6B7FC4', variant: 'mushroom-cap', sortOrder: 5 },
    { key: 'puffball_cluster', zone: 'forest_floor', name: 'Puffball Cluster', colorway: '#E8E0C8', variant: 'puffball', sortOrder: 6 },
    { key: 'morel_cluster', zone: 'forest_floor', name: 'Morel Cluster', colorway: '#A8874E', variant: 'mushroom-cap', sortOrder: 7 },
    { key: 'glowing_nightcap', zone: 'forest_floor', name: 'Glowing Nightcap', colorway: '#4FD8C4', variant: 'mushroom-cap', sortOrder: 8 },
    { key: 'pebble_path', zone: 'forest_floor', name: 'Pebble Path', colorway: '#9098A0', variant: 'pebble-cluster', sortOrder: 9 },
    { key: 'fallen_leaf_pile', zone: 'forest_floor', name: 'Fallen Leaf Pile', colorway: '#C77B3C', variant: 'leaf-pile', sortOrder: 10 },
    // Water
    { key: 'still_pond', zone: 'water', name: 'Still Pond', colorway: '#4A90A4', variant: 'pond-round', sortOrder: 1 },
    { key: 'lily_pad_cluster', zone: 'water', name: 'Lily Pad Cluster', colorway: '#4C8C5C', variant: 'lily-pad', sortOrder: 3 },
    { key: 'mossy_waterfall_rock', zone: 'water', name: 'Mossy Waterfall Rock', colorway: '#6B9E8C', variant: 'stream-curve', sortOrder: 4 },
    { key: 'reed_cluster', zone: 'water', name: 'Reed Cluster', colorway: '#7FA858', variant: 'reed-cluster', sortOrder: 5 },
    { key: 'koi_pond', zone: 'water', name: 'Koi Pond', colorway: '#3E7A94', variant: 'pond-round', sortOrder: 6 },
    { key: 'dewdrop_puddle', zone: 'water', name: 'Dewdrop Puddle', colorway: '#A8D4E0', variant: 'pond-round', sortOrder: 7 },
    { key: 'cattail_cluster', zone: 'water', name: 'Cattail Cluster', colorway: '#6B5738', variant: 'reed-cluster', sortOrder: 8 },
    { key: 'stepping_stones', zone: 'water', name: 'Stepping Stones', colorway: '#8B8880', variant: 'stepping-stones', sortOrder: 9 },
    { key: 'misty_spring', zone: 'water', name: 'Misty Spring', colorway: '#B8DCE4', variant: 'pond-round', sortOrder: 10 },
    // Meadow
    { key: 'wildflower_patch', zone: 'meadow', name: 'Wildflower Patch', colorway: '#D46BA3', variant: 'flower-cluster', sortOrder: 1 },
    { key: 'sunflower_cluster', zone: 'meadow', name: 'Sunflower Cluster', colorway: '#E8C23A', variant: 'flower-cluster', sortOrder: 2 },
    { key: 'lavender_field_row', zone: 'meadow', name: 'Lavender Field Row', colorway: '#8B7EC8', variant: 'flower-cluster', sortOrder: 3 },
    { key: 'daisy_cluster', zone: 'meadow', name: 'Daisy Cluster', colorway: '#F0EDE0', variant: 'flower-cluster', sortOrder: 4 },
    { key: 'poppy_patch', zone: 'meadow', name: 'Poppy Patch', colorway: '#D8402E', variant: 'flower-cluster', sortOrder: 5 },
    { key: 'butterfly_bush', zone: 'meadow', name: 'Butterfly Bush', colorway: '#A66BC4', variant: 'flower-cluster', sortOrder: 6 },
    { key: 'firefly_swarm', zone: 'meadow', name: 'Firefly Swarm', colorway: '#F0D848', variant: 'firefly-swarm', sortOrder: 7 },
    { key: 'clover_patch', zone: 'meadow', name: 'Clover Patch', colorway: '#5C9C5C', variant: 'clover-patch', sortOrder: 8 },
    { key: 'tall_grass_sway', zone: 'meadow', name: 'Tall Grass Sway', colorway: '#C4B458', variant: 'tall-grass', sortOrder: 9 },
    { key: 'dandelion_puff', zone: 'meadow', name: 'Dandelion Puff', colorway: '#E8E4D0', variant: 'flower-cluster', sortOrder: 10 },
    // Forest Floor — rock additions
    { key: 'boulder_stack', zone: 'forest_floor', name: 'Boulder Stack', colorway: '#8C9298', variant: 'rock-stack', sortOrder: 11 },
    { key: 'mossy_boulder', zone: 'forest_floor', name: 'Mossy Boulder', colorway: '#7C8A6E', variant: 'rock-stack', sortOrder: 12 },
    { key: 'sandstone_rocks', zone: 'forest_floor', name: 'Sandstone Rocks', colorway: '#C2A075', variant: 'rock-stack', sortOrder: 13 },
    // Water — fish + river additions
    { key: 'koi_fish', zone: 'water', name: 'Orange Koi', colorway: '#E0702C', variant: 'fish', sortOrder: 11 },
    { key: 'goldfish', zone: 'water', name: 'Goldfish', colorway: '#F2B23C', variant: 'fish', sortOrder: 12 },
    { key: 'clownfish', zone: 'water', name: 'Clownfish', colorway: '#E86A2C', variant: 'fish', sortOrder: 13 },
    { key: 'black_koi', zone: 'water', name: 'Black Koi', colorway: '#3A3A44', variant: 'fish', sortOrder: 14 },
    // Draw tools — the user sketches the path with their finger instead of picking a fixed icon.
    { key: 'custom_river', zone: 'water', name: 'Draw a River', colorway: '#4A7FA6', variant: 'hand-drawn-river', sortOrder: 15 },
    { key: 'custom_stream', zone: 'water', name: 'Draw a Stream', colorway: '#6FB0C4', variant: 'hand-drawn-stream', sortOrder: 16 },
    // Sky & Celestial
    { key: 'silver_star', zone: 'sky', name: 'Silver Star', colorway: '#D8E4F5', variant: 'star', sortOrder: 1 },
    { key: 'golden_star', zone: 'sky', name: 'Golden Star', colorway: '#F4D06A', variant: 'star', sortOrder: 2 },
    { key: 'azure_star', zone: 'sky', name: 'Azure Star', colorway: '#7FB2E8', variant: 'star', sortOrder: 3 },
    { key: 'northern_constellation', zone: 'sky', name: 'Constellation', colorway: '#BFD4F2', variant: 'constellation', sortOrder: 4 },
    // No Sun/Moon here — the Skia-rendered landscape already shows one automatically by time of day.
    { key: 'drifting_cloud', zone: 'sky', name: 'Drifting Cloud', colorway: '#E6EDF5', variant: 'cloud', sortOrder: 5 },
    { key: 'shooting_star', zone: 'sky', name: 'Shooting Star', colorway: '#FFE08A', variant: 'shooting-star', sortOrder: 6 },
    // Birds
    { key: 'garden_robin', zone: 'birds', name: 'Garden Robin', colorway: '#9C6B45', variant: 'bird-robin', sortOrder: 1 },
    { key: 'mountain_bluebird', zone: 'birds', name: 'Mountain Bluebird', colorway: '#4F8FD1', variant: 'bird-bluebird', sortOrder: 2 },
    { key: 'red_cardinal', zone: 'birds', name: 'Red Cardinal', colorway: '#C0392B', variant: 'bird-cardinal', sortOrder: 3 },
    { key: 'barn_owl', zone: 'birds', name: 'Barn Owl', colorway: '#8A6A46', variant: 'bird-owl', sortOrder: 4 },
    { key: 'ruby_hummingbird', zone: 'birds', name: 'Ruby Hummingbird', colorway: '#3FA98C', variant: 'bird-hummingbird', sortOrder: 5 },
    { key: 'white_dove', zone: 'birds', name: 'White Dove', colorway: '#EDE9DE', variant: 'bird-dove', sortOrder: 6 },
    { key: 'grey_crane', zone: 'birds', name: 'Grey Crane', colorway: '#A8AEB4', variant: 'bird-crane', sortOrder: 7 },
    // Land Animals
    { key: 'red_fox', zone: 'animals', name: 'Red Fox', colorway: '#D2703A', variant: 'animal-fox', sortOrder: 1 },
    { key: 'brown_rabbit', zone: 'animals', name: 'Brown Rabbit', colorway: '#B79B7E', variant: 'animal-rabbit', sortOrder: 2 },
    { key: 'spotted_fawn', zone: 'animals', name: 'Spotted Fawn', colorway: '#C08A4E', variant: 'animal-deer', sortOrder: 3 },
    { key: 'garden_hedgehog', zone: 'animals', name: 'Hedgehog', colorway: '#8A6A4A', variant: 'animal-hedgehog', sortOrder: 4 },
    { key: 'forest_squirrel', zone: 'animals', name: 'Forest Squirrel', colorway: '#B4703A', variant: 'animal-squirrel', sortOrder: 5 },
    { key: 'pond_turtle', zone: 'animals', name: 'Pond Turtle', colorway: '#5E8C4E', variant: 'animal-turtle', sortOrder: 6 },
    { key: 'monarch_butterfly', zone: 'animals', name: 'Monarch Butterfly', colorway: '#E07B2C', variant: 'animal-butterfly', sortOrder: 7 },
    { key: 'honeybee', zone: 'animals', name: 'Honeybee', colorway: '#E7B23C', variant: 'animal-bee', sortOrder: 8 },
    { key: 'ladybug', zone: 'animals', name: 'Ladybug', colorway: '#C0392B', variant: 'animal-ladybug', sortOrder: 9 },
    { key: 'garden_snail', zone: 'animals', name: 'Garden Snail', colorway: '#C69A5E', variant: 'animal-snail', sortOrder: 10 },
    // Fruits
    { key: 'red_apple', zone: 'fruits', name: 'Red Apple', colorway: '#C0392B', variant: 'fruit-apple', sortOrder: 1 },
    { key: 'ripe_cherries', zone: 'fruits', name: 'Ripe Cherries', colorway: '#A8243A', variant: 'fruit-cherries', sortOrder: 2 },
    { key: 'golden_pear', zone: 'fruits', name: 'Golden Pear', colorway: '#9FB84E', variant: 'fruit-pear', sortOrder: 3 },
    { key: 'juicy_orange', zone: 'fruits', name: 'Juicy Orange', colorway: '#E68A2E', variant: 'fruit-citrus', sortOrder: 4 },
    { key: 'purple_grapes', zone: 'fruits', name: 'Purple Grapes', colorway: '#7E5AA6', variant: 'fruit-grapes', sortOrder: 5 },
    { key: 'wild_berries', zone: 'fruits', name: 'Wild Berries', colorway: '#4A5AA0', variant: 'fruit-berries', sortOrder: 6 },
    { key: 'ripe_peach', zone: 'fruits', name: 'Ripe Peach', colorway: '#F0A55E', variant: 'fruit-peach', sortOrder: 7 },
  ] as const;

  for (const d of decorations) {
    await prisma.decorationType.upsert({ where: { key: d.key }, update: d, create: d });
  }

  // Sun/Moon were removed from the Sky catalog (the landscape already shows one by time of day), and
  // the pre-made icon river/stream were replaced by the freehand "Draw a River/Stream" tools — upsert
  // alone never deletes rows, so explicitly clean up the stale ones (cascades to any placements).
  await prisma.decorationType.deleteMany({
    where: { key: { in: ['radiant_sun', 'crescent_moon', 'winding_river', 'babbling_stream'] } },
  });
}

async function seedDailyMissions() {
  const missions = [
    { key: 'morning_planting', title: 'Morning Planting', description: 'Plant one tree before noon', xpReward: 50, icon: '🌅', type: 'plant' },
    { key: 'share_forest', title: 'Share Your Forest', description: 'Share a forest screenshot with a friend', xpReward: 30, icon: '📸', type: 'share' },
    { key: 'learn_today', title: 'Learn Today', description: 'Read 1 eco-tip about soil health', xpReward: 20, icon: '📚', type: 'learn' },
    { key: 'cheer_friend', title: 'Cheer a Friend', description: "React to a friend's tree planting", xpReward: 15, icon: '💚', type: 'community' },
  ] as const;

  for (const m of missions) {
    await prisma.dailyMission.upsert({ where: { key: m.key }, update: m, create: m });
  }
}

async function seedChallenges() {
  const now = new Date();
  const challenges = [
    { title: 'Spring Surge', description: 'Plant 5 trees this week with your crew', icon: '🌸', xpReward: 500, goalTotal: 5, goalType: 'trees_planted_count', daysLeft: 4 },
    { title: 'Urban Jungle', description: 'Plant trees in 3 different cities', icon: '🏙️', xpReward: 350, goalTotal: 3, goalType: 'cities_count', daysLeft: 12 },
    { title: 'Streak Masters', description: 'Keep your streak alive for 14 days', icon: '🔥', xpReward: 200, goalTotal: 14, goalType: 'streak_days', daysLeft: 2 },
    { title: 'Species Explorer', description: 'Plant 3 rare tree species', icon: '🔬', xpReward: 800, goalTotal: 3, goalType: 'rare_species_count', daysLeft: 20 },
  ] as const;

  for (const c of challenges) {
    const existing = await prisma.challenge.findFirst({ where: { title: c.title } });
    const endsAt = new Date(now.getTime() + c.daysLeft * 24 * 60 * 60 * 1000);
    const data = {
      title: c.title,
      description: c.description,
      icon: c.icon,
      xpReward: c.xpReward,
      goalTotal: c.goalTotal,
      goalType: c.goalType,
      startsAt: now,
      endsAt,
      isActive: true,
    };
    if (existing) {
      await prisma.challenge.update({ where: { id: existing.id }, data });
    } else {
      await prisma.challenge.create({ data });
    }
  }
}

async function seedEcoFacts() {
  const facts = [
    'A mature oak can absorb up to 48 pounds of CO₂ per year.',
    'Trees release phytoncides that reduce stress hormones.',
    'One tree produces enough oxygen for 2 people every year.',
    'Urban trees reduce city temperatures by up to 8°C.',
    'A single tree provides $273,000 worth of environmental benefits over its lifetime.',
  ];

  const existingCount = await prisma.ecoFact.count();
  if (existingCount === 0) {
    await prisma.ecoFact.createMany({
      data: facts.map((factText, i) => ({ factText, sortOrder: i + 1 })),
    });
  }
}

async function seedAppConfig() {
  await prisma.appConfig.upsert({
    where: { key: 'daily_tree_goal' },
    update: { value: '4000' },
    create: { key: 'daily_tree_goal', value: '4000' },
  });
}

async function seedForestLevelTiers() {
  const tiers = [
    { minLevel: 1, name: 'Sprout' },
    { minLevel: 2, name: 'Sapling' },
    { minLevel: 3, name: 'Young Tree' },
    { minLevel: 4, name: 'Growing Grove' },
    { minLevel: 5, name: 'Established Grove' },
    { minLevel: 6, name: 'Flourishing Forest' },
    { minLevel: 7, name: 'Thriving Woodland' },
    { minLevel: 8, name: 'Ancient Grove' },
    { minLevel: 9, name: 'Elder Forest' },
    { minLevel: 10, name: 'Legendary Grove' },
    { minLevel: 11, name: 'Mythic Canopy' },
  ];

  await prisma.forestLevelTier.deleteMany();
  await prisma.forestLevelTier.createMany({ data: tiers });
}

async function seedApprovedPlantingLocations() {
  const locations = [
    { id: 'pune-empress-garden', name: 'Empress Garden, Pune', lat: 18.5089, lng: 73.8823, radiusMeters: 150 },
    { id: 'pune-saras-baug', name: 'Saras Baug, Pune', lat: 18.5018, lng: 73.8517, radiusMeters: 120 },
    { id: 'pune-okayama-friendship-garden', name: 'Okayama Friendship Garden, Pune', lat: 18.5057, lng: 73.8226, radiusMeters: 100 },
    { id: 'pune-vetal-tekdi', name: 'Vetal Tekdi, Pune', lat: 18.5228, lng: 73.8145, radiusMeters: 300 },
    { id: 'pune-bund-garden', name: 'Bund Garden, Pune', lat: 18.5395, lng: 73.8869, radiusMeters: 120 },
    { id: 'pune-pu-la-deshpande-garden', name: 'Pu La Deshpande Garden, Pune', lat: 18.4977, lng: 73.857, radiusMeters: 100 },
  ];

  for (const location of locations) {
    await prisma.approvedPlantingLocation.upsert({
      where: { id: location.id },
      update: location,
      create: location,
    });
  }
}

async function main() {
  await seedSpecies();
  await seedAchievements();
  await seedNgoAchievements();
  await seedGroupAchievements();
  await seedNurseryAchievements();
  await seedForestThemes();
  await seedDecorationTypes();
  await seedDailyMissions();
  await seedChallenges();
  await seedEcoFacts();
  await seedAppConfig();
  await seedForestLevelTiers();
  await seedApprovedPlantingLocations();
  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
