import { apiFetch } from './client';

export interface ApiForestTheme {
  id: string;
  key: string;
  name: string;
  preview: string;
  unlocked: boolean;
  /** How to unlock it, shown when a locked theme is tapped; null when none is set. */
  unlockCriteria?: string | null;
}

export async function fetchThemes(): Promise<ApiForestTheme[]> {
  return apiFetch<ApiForestTheme[]>('/api/themes');
}

export async function selectTheme(id: string) {
  return apiFetch<{ selectedForestThemeId: string }>(`/api/themes/${id}/select`, { method: 'POST' });
}
