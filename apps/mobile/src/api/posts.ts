import { apiFetch, toFormFile } from './client';

export type PostAuthorKind = 'user' | 'ngo' | 'nursery';

export interface ApiPostAuthor {
  kind: PostAuthorKind;
  id: string;
  name: string;
  /** NGO/nursery logo. Null for users, who use `avatarEmoji` instead. */
  imageUrl: string | null;
  handle: string | null;
  avatarEmoji: string | null;
}

export interface ApiPostMedia {
  id: string;
  url: string;
  order: number;
}

export interface ApiPost {
  id: string;
  authorType: PostAuthorKind;
  author: ApiPostAuthor;
  caption: string | null;
  media: ApiPostMedia[];
  driveId: string | null;
  driveTitle: string | null;
  treeId: string | null;
  treeNickname: string | null;
  likeCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  /** Auto-hidden pending moderation. Only ever true on the author's own posts. */
  isHidden: boolean;
  isMine: boolean;
  createdAt: string;

  /** Legacy NgoUpdate keys the API still emits — prefer `media` and `author`. */
  ngoId: string | null;
  ngoName?: string;
  ngoLogoUrl?: string | null;
  nurseryId: string | null;
  photoUrl: string | null;
}

export interface CursorPage<T> {
  posts: T[];
  nextCursor: string | null;
}

export interface PickedPhoto {
  uri: string;
  name: string;
  type: string;
}

export interface CreatePostInput {
  caption?: string;
  driveId?: string;
  treeId?: string;
  /** Share this post to one of the caller's groups' activity timelines. */
  groupId?: string;
  photos: PickedPhoto[];
  /** Publish as the caller's NGO rather than as themselves. */
  asNgo?: boolean;
  /** Publish as the caller's nursery rather than as themselves. */
  asNursery?: boolean;
}

export async function createPost(input: CreatePostInput): Promise<ApiPost> {
  const form = new FormData();
  if (input.caption) form.append('caption', input.caption);
  if (input.driveId) form.append('driveId', input.driveId);
  if (input.treeId) form.append('treeId', input.treeId);
  if (input.groupId) form.append('groupId', input.groupId);
  if (input.asNgo) form.append('asNgo', 'true');
  if (input.asNursery) form.append('asNursery', 'true');
  // Repeated field name — the API reads every `photos` part in append order as the carousel.
  for (const photo of input.photos) {
    form.append('photos', toFormFile(photo.uri), photo.name);
  }
  return apiFetch<ApiPost>('/api/posts', { method: 'POST', body: form, isForm: true });
}

export async function fetchPost(id: string): Promise<ApiPost> {
  return apiFetch<ApiPost>(`/api/posts/${id}`);
}

export async function updatePostCaption(id: string, caption: string | null): Promise<ApiPost> {
  return apiFetch<ApiPost>(`/api/posts/${id}`, { method: 'PATCH', body: { caption } });
}

export async function deletePost(id: string): Promise<void> {
  await apiFetch<void>(`/api/posts/${id}`, { method: 'DELETE' });
}

export interface LikeResult {
  liked: boolean;
  likeCount: number;
}

export async function likePost(id: string): Promise<LikeResult> {
  return apiFetch<LikeResult>(`/api/posts/${id}/like`, { method: 'POST' });
}

export async function unlikePost(id: string): Promise<LikeResult> {
  return apiFetch<LikeResult>(`/api/posts/${id}/like`, { method: 'DELETE' });
}

export interface ApiLiker {
  id: string;
  name: string;
  handle: string;
  avatarEmoji: string;
}

export async function fetchPostLikers(
  id: string,
  cursor?: string,
): Promise<{ likers: ApiLiker[]; nextCursor: string | null }> {
  const qs = cursor ? `?cursor=${cursor}` : '';
  return apiFetch(`/api/posts/${id}/likes${qs}`);
}

export async function savePost(id: string): Promise<void> {
  await apiFetch<void>(`/api/posts/${id}/save`, { method: 'POST' });
}

export async function unsavePost(id: string): Promise<void> {
  await apiFetch<void>(`/api/posts/${id}/save`, { method: 'DELETE' });
}

// ---------- Feeds ----------

export async function fetchSocialFeed(cursor?: string): Promise<CursorPage<ApiPost>> {
  const qs = cursor ? `?cursor=${cursor}` : '';
  return apiFetch(`/api/social/feed${qs}`);
}

export async function fetchSavedPosts(cursor?: string): Promise<CursorPage<ApiPost>> {
  const qs = cursor ? `?cursor=${cursor}` : '';
  return apiFetch(`/api/social/saved${qs}`);
}

export async function fetchNgoPosts(ngoId: string, cursor?: string): Promise<CursorPage<ApiPost>> {
  const qs = cursor ? `?cursor=${cursor}` : '';
  return apiFetch(`/api/ngos/${ngoId}/posts${qs}`);
}

export async function fetchUserPosts(userId: string, cursor?: string): Promise<CursorPage<ApiPost>> {
  const qs = cursor ? `?cursor=${cursor}` : '';
  return apiFetch(`/api/users/${userId}/posts${qs}`);
}

export async function fetchNurseryPosts(nurseryId: string, cursor?: string): Promise<CursorPage<ApiPost>> {
  const qs = cursor ? `?cursor=${cursor}` : '';
  return apiFetch(`/api/nurseries/${nurseryId}/posts${qs}`);
}

export async function fetchGroupPosts(groupId: string, cursor?: string): Promise<CursorPage<ApiPost>> {
  const qs = cursor ? `?cursor=${cursor}` : '';
  return apiFetch(`/api/groups/${groupId}/posts${qs}`);
}
