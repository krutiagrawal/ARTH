import { apiFetch } from './client';
import type { ApiForestTheme } from './themes';

export async function fetchGroupThemes(): Promise<ApiForestTheme[]> {
  return apiFetch<ApiForestTheme[]>('/api/group/themes');
}

export async function selectGroupTheme(id: string) {
  return apiFetch<{ selectedForestThemeId: string }>(`/api/group/themes/${id}/select`, { method: 'POST' });
}
