import { apiFetch } from './client';
import type { ApiPost } from './posts';

export type GroupActivityType =
  | 'tree_planted'
  | 'achievement_unlocked'
  | 'streak_milestone'
  | 'friend_cheer'
  | 'challenge_joined'
  | 'challenge_completed';

export interface GroupActivityEntry {
  kind: 'activity';
  id: string;
  createdAt: string;
  type: GroupActivityType;
  user: { id: string; name: string; handle: string; avatarEmoji: string };
  referenceType: string | null;
  referenceId: string | null;
}

export interface GroupPostEntry {
  kind: 'post';
  id: string;
  createdAt: string;
  post: ApiPost;
}

export type GroupActivityItem = GroupActivityEntry | GroupPostEntry;

// Owner-facing (role 'group').
export async function fetchGroupActivity(take = 30): Promise<GroupActivityItem[]> {
  return apiFetch<GroupActivityItem[]>(`/api/group/activity?take=${take}`);
}

// Member-facing (any authenticated user viewing a group they belong to).
export async function fetchGroupActivityForMember(groupId: string, take = 30): Promise<GroupActivityItem[]> {
  return apiFetch<GroupActivityItem[]>(`/api/groups/${groupId}/activity?take=${take}`);
}
