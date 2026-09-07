import { apiFetch, toFormFile } from './client';

export interface ApiGroupProfile {
  id: string;
  groupName: string;
  groupType: 'family' | 'school' | 'club' | 'other';
  description: string;
  logoUrl: string | null;
  city: string | null;
  inviteCode: string;
  status: 'active' | 'suspended';
  streakCurrent: number;
  streakMax: number;
  badgesCount: number;
  handle: string | null;
  avatarEmoji: string | null;
  selectedForestThemeId: string | null;
  createdAt: string;
}

export interface UpdateGroupProfileInput {
  groupName?: string;
  groupType?: 'family' | 'school' | 'club' | 'other';
  description?: string;
  city?: string;
  handle?: string;
  avatarEmoji?: string;
  logo?: { uri: string; name: string; type: string };
}

export async function fetchGroupProfile(): Promise<ApiGroupProfile> {
  return apiFetch<ApiGroupProfile>('/api/group/profile');
}

export async function updateGroupProfile(input: UpdateGroupProfileInput): Promise<ApiGroupProfile> {
  const form = new FormData();
  if (input.groupName !== undefined) form.append('groupName', input.groupName);
  if (input.groupType !== undefined) form.append('groupType', input.groupType);
  if (input.description !== undefined) form.append('description', input.description);
  if (input.city !== undefined) form.append('city', input.city);
  if (input.handle !== undefined) form.append('handle', input.handle);
  if (input.avatarEmoji !== undefined) form.append('avatarEmoji', input.avatarEmoji);
  if (input.logo) {
    form.append('logo', toFormFile(input.logo.uri), input.logo.name);
  }
  return apiFetch<ApiGroupProfile>('/api/group/profile', { method: 'PATCH', body: form, isForm: true });
}

export async function regenerateGroupInviteCode(): Promise<ApiGroupProfile> {
  return apiFetch<ApiGroupProfile>('/api/group/invite-code/regenerate', { method: 'POST' });
}

export interface ApiGroupStats {
  memberCount: number;
  treesPlantedTotal: number;
  xpTotal: number;
  level: number;
  co2AbsorbedTotal: number;
}

export async function fetchGroupStats(): Promise<ApiGroupStats> {
  return apiFetch<ApiGroupStats>('/api/group/stats');
}

export interface ApiGroupMember {
  userId: string;
  role: 'owner' | 'co_admin' | 'member';
  joinedAt: string;
  name: string;
  handle: string;
  avatarEmoji: string;
  treesPlantedCount: number;
  xp: number;
}

export async function fetchGroupMembers(): Promise<ApiGroupMember[]> {
  return apiFetch<ApiGroupMember[]>('/api/group/members');
}

export async function setGroupMemberRole(userId: string, role: 'owner' | 'co_admin' | 'member'): Promise<void> {
  await apiFetch(`/api/group/members/${userId}/role`, { method: 'PATCH', body: { role } });
}

export async function removeGroupMember(userId: string): Promise<void> {
  await apiFetch(`/api/group/members/${userId}`, { method: 'DELETE' });
}

export interface ApiGroupChallenge {
  id: string;
  groupId: string;
  title: string;
  description: string;
  goalType: 'trees_planted_count' | 'cities_count' | 'streak_days' | 'rare_species_count';
  goalTotal: number;
  startsAt: string;
  endsAt: string;
  progress: number;
  participantCount: number;
}

export interface CreateGroupChallengeInput {
  title: string;
  description: string;
  goalType: 'trees_planted_count' | 'cities_count' | 'streak_days' | 'rare_species_count';
  goalTotal: number;
  startsAt: string;
  endsAt: string;
}

export async function fetchOwnGroupChallenges(): Promise<ApiGroupChallenge[]> {
  return apiFetch<ApiGroupChallenge[]>('/api/group/challenges');
}

export async function createGroupChallenge(input: CreateGroupChallengeInput): Promise<ApiGroupChallenge> {
  return apiFetch<ApiGroupChallenge>('/api/group/challenges', { method: 'POST', body: input });
}

// ---------- Member-facing (any authenticated user) ----------

export interface ApiGroupSummary {
  id: string;
  groupName: string;
  groupType: 'family' | 'school' | 'club' | 'other';
  description: string;
  logoUrl: string | null;
  city: string | null;
  status: 'active' | 'suspended';
}

export interface ApiGroupMembership {
  role: 'owner' | 'co_admin' | 'member';
  joinedAt: string;
  group: ApiGroupSummary;
}

export async function fetchMyGroups(): Promise<ApiGroupMembership[]> {
  return apiFetch<ApiGroupMembership[]>('/api/groups/mine');
}

export async function joinGroupByInviteCode(inviteCode: string): Promise<ApiGroupSummary> {
  return apiFetch<ApiGroupSummary>('/api/groups/join', { method: 'POST', body: { inviteCode } });
}

export async function leaveGroup(groupId: string): Promise<void> {
  await apiFetch(`/api/groups/${groupId}/leave`, { method: 'POST' });
}

export async function fetchGroupChallenges(groupId: string): Promise<ApiGroupChallenge[]> {
  return apiFetch<ApiGroupChallenge[]>(`/api/groups/${groupId}/challenges`);
}

export async function joinGroupChallenge(challengeId: string): Promise<void> {
  await apiFetch(`/api/groups/challenges/${challengeId}/join`, { method: 'POST' });
}
