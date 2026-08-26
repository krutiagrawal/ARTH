import { apiFetch } from './client';
import type { Award } from './ngo';
import type { ApiPost } from './posts';
import type { ApiPortfolioEntry } from './portfolio';
import type { FollowPolicy, FollowStatus } from './ngoFollowers';

export interface ApiNgoSummary {
  id: string;
  orgName: string;
  description: string;
  logoUrl: string | null;
  city: string | null;
}

export async function browseNgos(params: { q?: string; city?: string } = {}): Promise<{ total: number; ngos: ApiNgoSummary[] }> {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.city) query.set('city', params.city);
  const qs = query.toString();
  return apiFetch(`/api/ngos${qs ? `?${qs}` : ''}`);
}

export interface ApiFeaturedDrive {
  id: string;
  title: string;
  photoUrl: string | null;
  city: string | null;
  startsAt: string;
  featured: boolean;
}

export interface ApiPublicNgoProfile {
  id: string;
  orgName: string;
  description: string;
  website: string | null;
  logoUrl: string | null;
  city: string | null;
  foundedYear: number | null;
  volunteerCountEstimate: number | null;
  awards: Award[];
  followPolicy: FollowPolicy;
  /** Accepted followers only — pending requests are not followers yet. */
  followersCount: number;
  isFollowing: boolean;
  /** Distinct from `isFollowing` so the button can read "Requested". */
  followStatus: FollowStatus | null;
  featuredDrives: ApiFeaturedDrive[];
  recentUpdates: ApiPost[];
  staff: { id: string; name: string; role: string; photoUrl: string | null }[];
  portfolio: ApiPortfolioEntry[];
  impact: {
    total: number;
    counts: Record<'healthy' | 'struggling' | 'dead' | 'removed', number>;
    survivalRate: number;
  };
  /** Self-reported totals from archived past work, kept apart from the verified `impact`. */
  priorImpact: { entries: number; treesPlanted: number; volunteersInvolved: number };
}

export async function fetchNgoPublicProfile(id: string): Promise<ApiPublicNgoProfile> {
  return apiFetch<ApiPublicNgoProfile>(`/api/ngos/${id}`);
}

/** Paginated public updates for one NGO — more than the 10 bundled in the profile. */
export async function fetchNgoPublicUpdates(
  id: string,
  params: { page?: number; take?: number } = {},
): Promise<ApiPost[]> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.take) qs.set('take', String(params.take));
  const suffix = qs.toString() ? `?${qs}` : '';
  return apiFetch<ApiPost[]>(`/api/ngos/${id}/updates${suffix}`);
}
