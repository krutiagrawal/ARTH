import { apiFetch } from './client';

export type NgoGrowthLevel = 'seedling' | 'growing' | 'established' | 'evergreen';

export interface WeeklyStreakWeek {
  week: string;
  met: boolean;
}

export interface WeeklyStreakStats {
  weeks: WeeklyStreakWeek[];
  current: number;
  longest: number;
}

export interface NgoTrustScoreFactors {
  driveCompletion: number;
  updateFreshness: number;
  complianceCompleteness: number;
}

export interface NgoGrowthProgress {
  monthsActive: number;
  lifetimeTreesPlanted: number;
  nextLevel: NgoGrowthLevel | null;
  monthsToNext: number | null;
  treesToNext: number | null;
}

export interface ApiNgoReputation {
  trustScore: number | null;
  trustScoreFactors: NgoTrustScoreFactors | null;
  growthLevel: NgoGrowthLevel;
  growthProgress: NgoGrowthProgress;
  streaks: {
    updates: WeeklyStreakStats;
    driveActivity: WeeklyStreakStats;
    impactVerification: WeeklyStreakStats;
  };
}

export async function fetchNgoReputation(weeks = 12): Promise<ApiNgoReputation> {
  return apiFetch<ApiNgoReputation>(`/api/ngo/reputation?weeks=${weeks}`);
}
