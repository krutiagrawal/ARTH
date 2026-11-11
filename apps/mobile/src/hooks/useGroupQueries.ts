import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { flatItems, pageParams, LIST_STALE_MS } from './useInfiniteList';
import {
  cancelGroupInvitation,
  createGroup,
  createGroupChallenge,
  deleteGroup,
  deleteGroupChallenge,
  fetchGroup,
  fetchGroupAchievements,
  fetchGroupActivity,
  fetchGroupAdoptions,
  fetchGroupAnalytics,
  fetchGroupChallenges,
  fetchGroupContributors,
  fetchGroupDonations,
  fetchGroupMembers,
  fetchGroupRequests,
  fetchGroupStats,
  fetchGroupTrees,
  fetchGroupsLeaderboard,
  fetchMyGroupRequests,
  fetchMyGroups,
  inviteToGroup,
  removeGroupMember,
  requestToJoinGroup,
  respondToGroupInvitation,
  respondToGroupRequest,
  searchGroups,
  setGroupMemberRole,
  updateGroup,
  uploadGroupLogo,
  type GroupRole,
  type GroupType,
} from '../api/plantingGroups';

/** Every group query lives under ['groups'] so one invalidation refreshes the lot. */
const KEY = 'groups';

function usePagedGroupQuery<T extends { id: string }>(
  key: unknown[],
  groupId: string | undefined,
  fetcher: (id: string, cursor?: string) => Promise<{ items: T[]; nextCursor: string | null }>,
) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: [KEY, groupId, ...key],
    queryFn: ({ pageParam }) => fetcher(groupId as string, pageParam),
    enabled: isAuthenticated && !!groupId,
    staleTime: LIST_STALE_MS,
    ...pageParams<T>(),
    select: flatItems,
  });
}

function useGroupQuery<T>(key: unknown[], groupId: string | undefined, fetcher: (id: string) => Promise<T>) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: [KEY, groupId, ...key],
    queryFn: () => fetcher(groupId as string),
    enabled: isAuthenticated && !!groupId,
  });
}

// ---------- reads ----------

export function useMyGroups() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: [KEY, 'mine'], queryFn: fetchMyGroups, enabled: isAuthenticated });
}

export function useMyGroupRequests() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: [KEY, 'requests', 'mine'], queryFn: fetchMyGroupRequests, enabled: isAuthenticated });
}

export function useGroupSearch(q: string) {
  const { isAuthenticated } = useAuth();
  const text = q.trim();
  return useQuery({ queryKey: [KEY, 'search', text], queryFn: () => searchGroups(text), enabled: isAuthenticated && text.length >= 2 });
}

export const useGroup = (id: string | undefined) => useGroupQuery(['detail'], id, fetchGroup);
export const useGroupStats = (id: string | undefined) => useGroupQuery(['stats'], id, fetchGroupStats);
export const useGroupAchievements = (id: string | undefined) => useGroupQuery(['achievements'], id, fetchGroupAchievements);
export const useGroupChallenges = (id: string | undefined) => useGroupQuery(['challenges'], id, fetchGroupChallenges);
export const useGroupContributors = (id: string | undefined) => useGroupQuery(['contributors'], id, fetchGroupContributors);
export const useGroupAnalytics = (id: string | undefined, weeks: number) =>
  useGroupQuery(['analytics', weeks], id, (gid) => fetchGroupAnalytics(gid, weeks));

export const useGroupMembers = (id: string | undefined) => usePagedGroupQuery(['members'], id, fetchGroupMembers);
export const useGroupRequests = (id: string | undefined, enabled = true) =>
  usePagedGroupQuery(['requests'], enabled ? id : undefined, fetchGroupRequests);
export const useGroupActivity = (id: string | undefined) => usePagedGroupQuery(['activity'], id, fetchGroupActivity);
export const useGroupTrees = (id: string | undefined) => usePagedGroupQuery(['trees'], id, fetchGroupTrees);
export const useGroupAdoptions = (id: string | undefined) => usePagedGroupQuery(['adoptions'], id, fetchGroupAdoptions);
export const useGroupDonations = (id: string | undefined) => usePagedGroupQuery(['donations'], id, fetchGroupDonations);

export function useGroupsLeaderboard() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: [KEY, 'leaderboard'], queryFn: fetchGroupsLeaderboard, enabled: isAuthenticated });
}

// ---------- writes ----------

function useInvalidatingMutation<TInput, TOut>(fn: (input: TInput) => Promise<TOut>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [KEY] }),
  });
}

export const useCreateGroup = () =>
  useInvalidatingMutation((input: { name: string; handle: string; groupType: GroupType; description: string; city?: string }) => createGroup(input));

export const useUpdateGroup = (id: string) =>
  useInvalidatingMutation((input: { name?: string; description?: string; groupType?: GroupType; city?: string | null }) => updateGroup(id, input));

export const useUploadGroupLogo = (id: string) =>
  useInvalidatingMutation((photo: { uri: string; name: string; type: string }) => uploadGroupLogo(id, photo));

export const useDeleteGroup = () => useInvalidatingMutation((id: string) => deleteGroup(id));

export const useSetGroupMemberRole = (id: string) =>
  useInvalidatingMutation(({ userId, role }: { userId: string; role: GroupRole }) => setGroupMemberRole(id, userId, role));

/** Remove a member, or leave (pass the caller's own id). */
export const useRemoveGroupMember = (id: string) => useInvalidatingMutation((userId: string) => removeGroupMember(id, userId));

export const useRequestToJoinGroup = () => useInvalidatingMutation((id: string) => requestToJoinGroup(id));

export const useInviteToGroup = (id: string) => useInvalidatingMutation((handle: string) => inviteToGroup(id, handle));

export const useRespondToGroupRequest = (id: string) =>
  useInvalidatingMutation(({ requestId, action }: { requestId: string; action: 'approve' | 'decline' }) => respondToGroupRequest(id, requestId, action));

export const useCancelGroupInvitation = (id: string) => useInvalidatingMutation((requestId: string) => cancelGroupInvitation(id, requestId));

export const useRespondToGroupInvitation = () =>
  useInvalidatingMutation(({ requestId, action }: { requestId: string; action: 'accept' | 'decline' }) => respondToGroupInvitation(requestId, action));

export const useCreateGroupChallenge = (id: string) =>
  useInvalidatingMutation((input: { title: string; description: string; goalTotal: number; startsAt: string; endsAt: string }) =>
    createGroupChallenge(id, input),
  );

export const useDeleteGroupChallenge = (id: string) => useInvalidatingMutation((challengeId: string) => deleteGroupChallenge(id, challengeId));
