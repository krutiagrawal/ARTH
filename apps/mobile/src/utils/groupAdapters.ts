import type { ApiUser } from '../api/auth';
import type { ApiTree } from '../api/trees';
import type { ApiGroup, ApiGroupChallenge, ApiGroupStats, ApiGroupTree } from '../api/plantingGroups';
import type { ApiDailyMission } from '../api/missions';
import { groupTypeEmoji } from '../components/groups/GroupBits';

/**
 * Group mode reuses the individual app's screens. These adapters turn a group's data into the shapes
 * those screens already know, so a group looks exactly like a person's forest, just bigger.
 */

/** A group as the "owner" of its own forest: name, photo, level, streak and totals. */
export function groupAsUser(group: ApiGroup | undefined, stats: ApiGroupStats | undefined): ApiUser | null {
  if (!group) return null;
  return {
    id: group.id,
    role: 'user',
    email: '',
    name: group.name,
    handle: group.handle,
    bio: group.description,
    avatarEmoji: groupTypeEmoji(group.groupType),
    avatarUrl: group.logoUrl,
    city: group.city,
    xp: stats?.xp ?? 0,
    level: stats?.level ?? 1,
    streakCurrent: stats?.streakCurrent ?? 0,
    streakMax: stats?.streakMax ?? 0,
    streakFreezesAvailable: 0,
    treesPlantedCount: stats?.treesPlanted ?? 0,
    totalCo2Absorbed: stats?.co2Kg ?? 0,
    co2NextYearKg: stats?.co2NextYearKg ?? 0,
    badgesCount: 0,
    selectedForestThemeId: group.selectedForestThemeId,
    createdAt: group.createdAt,
    personalizationCompletedAt: null,
  };
}

function growthStage(plantedAt: string): 1 | 2 | 3 | 4 | 5 {
  const days = (Date.now() - new Date(plantedAt).getTime()) / 86_400_000;
  if (days < 14) return 1;
  if (days < 60) return 2;
  if (days < 180) return 3;
  if (days < 540) return 4;
  return 5;
}

/** A group tree as a normal tree card/pin. A personal tree keeps its blurred spot. */
export function groupTreeAsTree(t: ApiGroupTree): ApiTree {
  return {
    id: t.id,
    publicId: t.publicId,
    species: t.species.commonName,
    speciesId: '',
    speciesEmoji: t.species.emoji,
    nickname: t.nickname,
    plantedAt: t.plantedAt,
    location: t.locationLabel,
    lat: t.lat,
    lng: t.lng,
    growthStage: growthStage(t.plantedAt),
    healthStatus: t.healthStatus,
    photoUri: t.photoUrl,
    co2Absorbed: 0,
    xpEarned: 0,
    aiVerificationStatus: t.verification,
    planter: { id: t.plantedBy.id, name: t.plantedBy.name, handle: t.plantedBy.handle, avatarEmoji: t.plantedBy.avatarEmoji },
  };
}

/** Challenges shown in the "Today's Quests" card. */
export function challengesAsMissions(challenges: ApiGroupChallenge[] | undefined): (ApiDailyMission & { progressLabel: string })[] {
  const live = (challenges ?? []).filter((c) => c.status === 'active' || c.status === 'completed').slice(0, 3);
  if (live.length === 0) {
    return [
      {
        id: 'none',
        type: 'community',
        title: 'No active challenge',
        description: 'Admins can start one from the Quests tab',
        icon: '🏆',
        xpReward: 0,
        completed: false,
        progressLabel: '',
      } as unknown as ApiDailyMission & { progressLabel: string },
    ];
  }
  return live.map(
    (c) =>
      ({
        id: c.id,
        type: 'community',
        title: c.title,
        description: `${Math.min(c.progress, c.goalTotal)} of ${c.goalTotal} trees`,
        icon: '🏆',
        xpReward: 0,
        completed: c.status === 'completed',
        progressLabel: `${Math.min(c.progress, c.goalTotal)}/${c.goalTotal}`,
      }) as unknown as ApiDailyMission & { progressLabel: string },
  );
}
