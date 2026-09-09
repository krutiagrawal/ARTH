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
  likeCount: number;
  /** Only present on the feed, where like state is resolved for the caller. */
  likedByMe?: boolean;
}

export interface ApiStoryAuthor {
  kind: 'user' | 'ngo' | 'nursery' | 'group';
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

export interface ApiStoryViewer {
  userId: string;
  name: string;
  handle: string;
  avatarEmoji: string;
  viewedAt: string;
  liked: boolean;
}

/** Owner-only: who has viewed (and liked) this story, newest first. */
export async function fetchStoryViewers(storyId: string): Promise<ApiStoryViewer[]> {
  return apiFetch<ApiStoryViewer[]>(`/api/stories/${storyId}/viewers`);
}

export interface StoryLikeResult {
  liked: boolean;
  likeCount: number;
}

export async function likeStory(id: string): Promise<StoryLikeResult> {
  return apiFetch<StoryLikeResult>(`/api/stories/${id}/like`, { method: 'POST' });
}

export async function unlikeStory(id: string): Promise<StoryLikeResult> {
  return apiFetch<StoryLikeResult>(`/api/stories/${id}/like`, { method: 'DELETE' });
}

/** Resolves a stored `/uploads/...` path to an absolute URL the app can render. */
export function resolveStoryImage(imageUrl: string): string | undefined {
  return resolveMediaUrl(imageUrl);
}

export interface RingStatus {
  hasStory: boolean;
  seen: boolean;
}

export interface RingStatusMap {
  users: Record<string, RingStatus>;
  ngos: Record<string, RingStatus>;
  nurseries: Record<string, RingStatus>;
  groups: Record<string, RingStatus>;
}

/** Batch seen/unseen ring lookup for avatars rendered outside the story tray/feed. */
export async function fetchRingStatus(ids: {
  userIds?: string[];
  ngoIds?: string[];
  nurseryIds?: string[];
  groupIds?: string[];
}): Promise<RingStatusMap> {
  const qs = new URLSearchParams();
  if (ids.userIds?.length) qs.set('userIds', ids.userIds.join(','));
  if (ids.ngoIds?.length) qs.set('ngoIds', ids.ngoIds.join(','));
  if (ids.nurseryIds?.length) qs.set('nurseryIds', ids.nurseryIds.join(','));
  if (ids.groupIds?.length) qs.set('groupIds', ids.groupIds.join(','));
  return apiFetch<RingStatusMap>(`/api/stories/ring-status?${qs}`);
}
