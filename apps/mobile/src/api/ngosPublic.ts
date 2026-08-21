import { apiFetch } from './client';
import type { Award } from './ngo';

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
  followersCount: number;
  isFollowing: boolean;
  featuredDrives: ApiFeaturedDrive[];
  recentUpdates: {
    id: string;
    ngoId: string;
    ngoName: string;
    ngoLogoUrl: string | null;
    driveId: string | null;
    driveTitle: string | null;
    caption: string | null;
    photoUrl: string | null;
    createdAt: string;
  }[];
  impact: {
    total: number;
    counts: Record<'healthy' | 'struggling' | 'dead' | 'removed', number>;
    survivalRate: number;
  };
}

export async function fetchNgoPublicProfile(id: string): Promise<ApiPublicNgoProfile> {
  return apiFetch<ApiPublicNgoProfile>(`/api/ngos/${id}`);
}
