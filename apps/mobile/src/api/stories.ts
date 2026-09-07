import { apiFetch, resolveMediaUrl, toFormFile } from './client';

export interface ApiStory {
  id: string;
  authorType: 'user' | 'ngo' | 'group' | 'nursery';
  /** Null on org-authored stories — the org/group owns them, not the operator's account. */
  userId: string | null;
  ngoId: string | null;
  groupId: string | null;
  nurseryId: string | null;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  /** Only present on the feed, where view receipts are resolved for the caller. */
  seen?: boolean;
  /** Only present on your own stories. */
  viewCount?: number;
}

export interface ApiStoryAuthor {
  kind: 'user' | 'ngo' | 'nursery';
  id: string;
  name: string;
  handle: string | null;
  avatarEmoji: string | null;
  /** NGO/nursery logo path; null for users. */
  imageUrl: string | null;
}

export interface ApiStoryGroup {
  author: ApiStoryAuthor;
  /** Retained for the original friends-only tray; null on NGO groups. */
  user: {
    id: string;
    name: string;
    handle: string;
    avatarEmoji: string;
  } | null;
  stories: ApiStory[];
  /** Drives the tray's bright vs. dimmed ring. */
  hasUnseen: boolean;
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

export async function postStory(input: {
  imageBase64: string;
  caption?: string;
  asNgo?: boolean;
  asGroup?: boolean;
  asNursery?: boolean;
}): Promise<ApiStory> {
  return apiFetch<ApiStory>('/api/stories', {
    method: 'POST',
    body: {
      imageBase64: input.imageBase64,
      caption: input.caption?.trim() || undefined,
      asNgo: input.asNgo || undefined,
      asGroup: input.asGroup || undefined,
      asNursery: input.asNursery || undefined,
    },
  });
}

/** Posts a camera/gallery photo as a story — how NGOs/Groups/nurseries post, vs. the base64 forest snapshot. */
export async function postPhotoStory(input: {
  photo: { uri: string; name: string; type: string };
  caption?: string;
  asNgo?: boolean;
  asGroup?: boolean;
  asNursery?: boolean;
}): Promise<ApiStory> {
  const form = new FormData();
  form.append('photo', toFormFile(input.photo.uri), input.photo.name);
  if (input.caption?.trim()) form.append('caption', input.caption.trim());
  if (input.asNgo) form.append('asNgo', 'true');
  if (input.asGroup) form.append('asGroup', 'true');
  if (input.asNursery) form.append('asNursery', 'true');
  return apiFetch<ApiStory>('/api/stories', { method: 'POST', body: form, isForm: true });
}

/** Records a view so the tray ring dims. Fire-and-forget — never block the viewer on it. */
export async function markStoryViewed(id: string): Promise<void> {
  await apiFetch<void>(`/api/stories/${id}/view`, { method: 'POST' });
}

export async function deleteStory(id: string): Promise<void> {
  await apiFetch(`/api/stories/${id}`, { method: 'DELETE' });
}

/** Resolves a stored `/uploads/...` path to an absolute URL the app can render. */
export function resolveStoryImage(imageUrl: string): string | undefined {
  return resolveMediaUrl(imageUrl);
}
