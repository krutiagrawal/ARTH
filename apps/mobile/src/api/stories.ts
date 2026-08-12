import { apiFetch, API_URL } from './client';

export interface ApiStory {
  id: string;
  userId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface ApiStoryGroup {
  user: {
    id: string;
    name: string;
    handle: string;
    avatarEmoji: string;
  };
  stories: ApiStory[];
}

export async function fetchMyStories(): Promise<ApiStory[]> {
  return apiFetch<ApiStory[]>('/api/stories/me');
}

export async function fetchStoryFeed(): Promise<ApiStoryGroup[]> {
  return apiFetch<ApiStoryGroup[]>('/api/stories/feed');
}

export async function fetchUserStories(userId: string): Promise<ApiStory[]> {
  return apiFetch<ApiStory[]>(`/api/users/${userId}/stories`);
}

export async function postStory(input: { imageBase64: string; caption?: string }): Promise<ApiStory> {
  return apiFetch<ApiStory>('/api/stories', {
    method: 'POST',
    body: { imageBase64: input.imageBase64, caption: input.caption?.trim() || undefined },
  });
}

export async function deleteStory(id: string): Promise<void> {
  await apiFetch(`/api/stories/${id}`, { method: 'DELETE' });
}

/** Resolves a stored `/uploads/...` path to an absolute URL the app can render. */
export function resolveStoryImage(imageUrl: string): string {
  return imageUrl.startsWith('http') ? imageUrl : `${API_URL}${imageUrl}`;
}
