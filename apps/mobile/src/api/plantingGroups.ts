import { apiFetch, toFormFile } from './client';
import { pagedPath, type Page } from '../hooks/useInfiniteList';

export type GroupType = 'family' | 'friends' | 'school' | 'college' | 'club' | 'neighbourhood' | 'workplace' | 'other';
export type GroupRole = 'admin' | 'member';

export const GROUP_TYPES: { key: GroupType; label: string; emoji: string }[] = [
  { key: 'family', label: 'Family', emoji: '🏡' },
  { key: 'friends', label: 'Friends', emoji: '🧑‍🤝‍🧑' },
  { key: 'school', label: 'School', emoji: '🏫' },
  { key: 'college', label: 'College', emoji: '🎓' },
  { key: 'club', label: 'Club', emoji: '🤝' },
  { key: 'neighbourhood', label: 'Neighbourhood', emoji: '🏘️' },
  { key: 'workplace', label: 'Workplace', emoji: '🏢' },
  { key: 'other', label: 'Other', emoji: '🌳' },
];

export interface ApiGroup {
  id: string;
  name: string;
  handle: string;
  groupType: GroupType;
  description: string;
  logoUrl: string | null;
  city: string | null;
  memberCount: number;
  maxMembers: number;
  createdAt: string;
  /** Only on the caller's own list. */
  myRole?: GroupRole;
  joinedAt?: string;
}

export interface ApiGroupDetail extends ApiGroup {
  viewer: {
    role: GroupRole | null;
    pendingRequest: { id: string; kind: 'join_request' | 'invitation' } | null;
    isCreator: boolean;
  };
}

export interface ApiPerson {
  id: string;
  name: string;
  handle: string;
  avatarEmoji: string;
  avatarUrl?: string | null;
}

export interface ApiGroupMember {
  id: string;
  userId: string;
  role: GroupRole;
  joinedAt: string;
  user: ApiPerson;
}

export interface ApiGroupRequest {
  id: string;
  kind: 'join_request' | 'invitation';
  createdAt: string;
  user: ApiPerson;
}

export interface ApiMyRequests {
  invitations: { id: string; createdAt: string; group: ApiGroup; invitedBy: ApiPerson | null }[];
  joinRequests: { id: string; createdAt: string; group: ApiGroup; invitedBy: ApiPerson | null }[];
}

export interface ApiGroupStats {
  memberCount: number;
  treesPlanted: number;
  co2Kg: number;
  co2NextYearKg: number;
  adoptions: number;
  donatedCents: number;
  streakCurrent: number;
  streakMax: number;
  challengesCompleted: number;
  level: number;
  name: string;
  treesToNext: number;
  nextName: string | null;
  progress: number;
}

export interface ApiGroupAchievement {
  key: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  unlocked: boolean;
}

export interface ApiGroupChallenge {
  id: string;
  title: string;
  description: string;
  goalTotal: number;
  startsAt: string;
  endsAt: string;
  progress: number;
  status: 'upcoming' | 'active' | 'completed' | 'ended';
}

export interface ApiGroupActivity {
  id: string;
  type: 'member_joined' | 'member_left' | 'tree_planted' | 'tree_adopted' | 'donation_made' | 'challenge_created' | 'role_changed';
  createdAt: string;
  data: Record<string, any> | null;
  actor: ApiPerson | null;
}

export interface ApiGroupTree {
  id: string;
  publicId: string;
  nickname: string;
  species: { commonName: string; emoji: string };
  lat: number;
  lng: number;
  locationLabel: string | null;
  photoUrl: string | null;
  plantedAt: string;
  healthStatus: string;
  verification: string;
  plantedBy: ApiPerson;
}

export interface ApiGroupAdoption {
  id: string;
  createdAt: string;
  tree: { id: string; nickname: string; speciesName: string; photoUrl: string | null; ngoName: string };
  adoptedBy: { id: string; name: string; handle: string };
}

export interface ApiGroupDonation {
  id: string;
  amountCents: number;
  currency: string;
  receiptNumber: string | null;
  createdAt: string;
  campaign: { id: string; title: string; ngoName: string };
  donatedBy: { id: string; name: string; handle: string };
}

export interface ApiContributor {
  rank: number;
  role: GroupRole;
  treesPlanted: number;
  user: ApiPerson;
}

export interface ApiGroupRank {
  rank: number;
  treesPlanted: number;
  isMine: boolean;
  group: ApiGroup;
}

export interface ApiGroupAnalytics {
  weeks: number;
  series: { weekStart: string; trees: number; newMembers: number; donatedCents: number }[];
  totals: {
    treesInPeriod: number;
    newMembersInPeriod: number;
    donatedCentsInPeriod: number;
    activePlanters: number;
    memberCount: number;
    participationRate: number;
  };
  challenges: { open: number; completed: number };
  overall: ApiGroupStats;
}

// ---------- groups ----------

export async function createGroup(input: { name: string; handle: string; groupType: GroupType; description: string; city: string }) {
  return apiFetch<ApiGroup>('/api/planting-groups', { method: 'POST', body: input });
}

export async function fetchMyGroups(): Promise<ApiGroup[]> {
  return apiFetch<ApiGroup[]>('/api/planting-groups/mine');
}

export async function searchGroups(q: string): Promise<ApiGroup[]> {
  if (q.trim().length < 2) return [];
  return apiFetch<ApiGroup[]>(`/api/planting-groups/discover?q=${encodeURIComponent(q.trim())}`);
}

export async function fetchGroup(id: string): Promise<ApiGroupDetail> {
  return apiFetch<ApiGroupDetail>(`/api/planting-groups/${id}`);
}

export async function updateGroup(id: string, input: { name?: string; description?: string; groupType?: GroupType; city?: string }) {
  return apiFetch<ApiGroup>(`/api/planting-groups/${id}`, { method: 'PATCH', body: input });
}

export async function uploadGroupLogo(id: string, photo: { uri: string; name: string; type: string }) {
  const form = new FormData();
  form.append('logo', toFormFile(photo.uri), photo.name);
  return apiFetch<ApiGroup>(`/api/planting-groups/${id}/logo`, { method: 'POST', body: form, isForm: true });
}

export async function deleteGroup(id: string) {
  await apiFetch<void>(`/api/planting-groups/${id}`, { method: 'DELETE' });
}

// ---------- members ----------

export async function fetchGroupMembers(id: string, cursor?: string): Promise<Page<ApiGroupMember>> {
  return apiFetch<Page<ApiGroupMember>>(pagedPath(`/api/planting-groups/${id}/members`, cursor, {}, 30));
}

export async function setGroupMemberRole(id: string, userId: string, role: GroupRole) {
  return apiFetch(`/api/planting-groups/${id}/members/${userId}`, { method: 'PATCH', body: { role } });
}

/** Removes a member, or leaves the group when `userId` is the caller's own id. */
export async function removeGroupMember(id: string, userId: string) {
  return apiFetch<{ ok: boolean; groupDeleted: boolean }>(`/api/planting-groups/${id}/members/${userId}`, { method: 'DELETE' });
}

// ---------- joining ----------

export async function requestToJoinGroup(id: string) {
  return apiFetch(`/api/planting-groups/${id}/join-requests`, { method: 'POST' });
}

export async function inviteToGroup(id: string, handle: string) {
  return apiFetch(`/api/planting-groups/${id}/invitations`, { method: 'POST', body: { handle } });
}

export async function fetchGroupRequests(id: string, cursor?: string): Promise<Page<ApiGroupRequest>> {
  return apiFetch<Page<ApiGroupRequest>>(pagedPath(`/api/planting-groups/${id}/requests`, cursor, {}, 30));
}

export async function respondToGroupRequest(id: string, requestId: string, action: 'approve' | 'decline') {
  return apiFetch(`/api/planting-groups/${id}/requests/${requestId}/${action}`, { method: 'POST' });
}

export async function cancelGroupInvitation(id: string, requestId: string) {
  return apiFetch(`/api/planting-groups/${id}/requests/${requestId}`, { method: 'DELETE' });
}

export async function fetchMyGroupRequests(): Promise<ApiMyRequests> {
  return apiFetch<ApiMyRequests>('/api/planting-groups/requests/mine');
}

export async function respondToGroupInvitation(requestId: string, action: 'accept' | 'decline') {
  return apiFetch(`/api/planting-groups/requests/${requestId}/${action}`, { method: 'POST' });
}

// ---------- dashboard ----------

export async function fetchGroupStats(id: string): Promise<ApiGroupStats> {
  return apiFetch<ApiGroupStats>(`/api/planting-groups/${id}/stats`);
}

export async function fetchGroupAchievements(id: string): Promise<ApiGroupAchievement[]> {
  return apiFetch<ApiGroupAchievement[]>(`/api/planting-groups/${id}/achievements`);
}

export async function fetchGroupContributors(id: string): Promise<ApiContributor[]> {
  return apiFetch<ApiContributor[]>(`/api/planting-groups/${id}/contributors`);
}

export async function fetchGroupAnalytics(id: string, weeks: number): Promise<ApiGroupAnalytics> {
  return apiFetch<ApiGroupAnalytics>(`/api/planting-groups/${id}/analytics?weeks=${weeks}`);
}

export async function fetchGroupActivity(id: string, cursor?: string): Promise<Page<ApiGroupActivity>> {
  return apiFetch<Page<ApiGroupActivity>>(pagedPath(`/api/planting-groups/${id}/activity`, cursor, {}, 30));
}

export async function fetchGroupTrees(id: string, cursor?: string): Promise<Page<ApiGroupTree>> {
  return apiFetch<Page<ApiGroupTree>>(pagedPath(`/api/planting-groups/${id}/trees`, cursor, {}, 50));
}

export async function fetchGroupAdoptions(id: string, cursor?: string): Promise<Page<ApiGroupAdoption>> {
  return apiFetch<Page<ApiGroupAdoption>>(pagedPath(`/api/planting-groups/${id}/adoptions`, cursor, {}, 30));
}

export async function fetchGroupDonations(id: string, cursor?: string): Promise<Page<ApiGroupDonation>> {
  return apiFetch<Page<ApiGroupDonation>>(pagedPath(`/api/planting-groups/${id}/donations`, cursor, {}, 30));
}

export async function fetchGroupChallenges(id: string): Promise<ApiGroupChallenge[]> {
  return apiFetch<ApiGroupChallenge[]>(`/api/planting-groups/${id}/challenges`);
}

export async function createGroupChallenge(
  id: string,
  input: { title: string; description: string; goalTotal: number; startsAt: string; endsAt: string },
) {
  return apiFetch<{ id: string }>(`/api/planting-groups/${id}/challenges`, { method: 'POST', body: input });
}

export async function deleteGroupChallenge(id: string, challengeId: string) {
  await apiFetch<void>(`/api/planting-groups/${id}/challenges/${challengeId}`, { method: 'DELETE' });
}

export async function fetchGroupsLeaderboard(): Promise<ApiGroupRank[]> {
  return apiFetch<ApiGroupRank[]>('/api/planting-groups/leaderboard');
}
