import { apiFetch } from './client';
import type { NurseryGrowthLevel } from './nursery';

export interface WeeklyStreakWeek {
  week: string;
  met: boolean;
}

export interface WeeklyStreakStats {
  weeks: WeeklyStreakWeek[];
  current: number;
  longest: number;
}

export interface TrustScoreFactors {
  fulfilment: number;
  rating: number;
  inventoryFreshness: number;
  responsiveness: number;
}

export interface NurseryGrowthProgress {
  monthsActive: number;
  lifetimeSupplied: number;
  nextLevel: NurseryGrowthLevel | null;
  monthsToNext: number | null;
  suppliedToNext: number | null;
}

export interface ApiNurseryReputation {
  trustScore: number | null;
  trustScoreFactors: TrustScoreFactors | null;
  growthLevel: NurseryGrowthLevel;
  growthProgress: NurseryGrowthProgress;
  fulfilmentStreak: { current: number; max: number };
  streaks: {
    supply: WeeklyStreakStats;
    inventoryFreshness: WeeklyStreakStats;
    arthContribution: WeeklyStreakStats;
  };
}

export async function fetchNurseryReputation(weeks = 12): Promise<ApiNurseryReputation> {
  return apiFetch<ApiNurseryReputation>(`/api/nursery/reputation?weeks=${weeks}`);
}
