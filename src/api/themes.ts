import { apiFetch } from './client';

export interface ApiForestTheme {
  id: string;
  key: string;
  name: string;
  preview: string;
  unlocked: boolean;
}

export async function fetchThemes(): Promise<ApiForestTheme[]> {
  return apiFetch<ApiForestTheme[]>('/api/themes');
}

export async function selectTheme(id: string) {
  return apiFetch<{ selectedForestThemeId: string }>(`/api/themes/${id}/select`, { method: 'POST' });
}
