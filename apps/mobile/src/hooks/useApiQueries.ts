import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { fetchTrees, plantTree, type PlantTreeInput } from '../api/trees';
import { fetchSpecies } from '../api/species';
import { fetchTodayMissions, completeMission } from '../api/missions';
import { fetchEcoFacts } from '../api/ecoFacts';
import { fetchAchievements } from '../api/achievements';
import { fetchStreakCalendar } from '../api/streaks';
import { fetchThemes, selectTheme } from '../api/themes';
import { fetchLeaderboard } from '../api/leaderboard';
import {
  fetchFriends,
  fetchFriendRequests,
  searchUsers,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
} from '../api/friends';
import { fetchChallenges, joinChallenge } from '../api/challenges';
import { fetchGlobalCounter } from '../api/community';
import { fetchSettings, updateSettings, type ApiUserSettings } from '../api/settings';
import { protectStreak } from '../api/streaks';
import { fetchFeed, cheerActivity } from '../api/feed';
import {
  fetchPublicProfile,
  updateMe,
  changePassword,
  fetchSessions,
  revokeSession,
} from '../api/users';
import {
  fetchDecorationTypes,
  fetchDecorationPlacements,
  createDecorationPlacement,
  updateDecorationPlacement,
  deleteDecorationPlacement,
  type CreatePlacementInput,
  type UpdatePlacementInput,
} from '../api/decorations';
import {
  fetchMyStories,
  fetchStoryFeed,
  fetchUserStories,
  postStory,
  deleteStory,
} from '../api/stories';
import {
  fetchDrives,
  fetchDrive,
  joinDrive,
  leaveDrive,
  sponsorPlant,
  fetchMyDrives,
  createDrive,
  CreateDriveInput,
} from '../api/drives';
import {
  fetchAdoptableTrees,
  fetchAdoptableTree,
  adoptTree,
  fetchMyAdoptableTrees,
  createAdoptableTree,
  CreateAdoptableTreeInput,
} from '../api/adoptions';
import {
  fetchCampaigns,
  fetchCampaign,
  createDonationIntent,
  fetchMyCampaigns,
  createCampaign,
  closeCampaign,
  reopenCampaign,
  CreateCampaignInput,
} from '../api/donations';
import {
  fetchNgoProfile,
  updateNgoProfile,
  resubmitNgoProfile,
  fetchNgoStats,
  fetchNgoReports,
  fetchNgoDonations,
  fetchNgoDonationsSummary,
  fetchNgoVolunteers,
  UpdateNgoProfileInput,
  DonationsFilter,
} from '../api/ngo';
import { fetchStaff, createStaff, updateStaff, deleteStaff, CreateStaffInput, UpdateStaffInput } from '../api/staff';
import {
  fetchPlantedTrees,
  bulkCreatePlantedTrees,
  logHealthCheck,
  logBulkHealthChecks,
  fetchSurvivalStats,
  ListPlantedTreesFilter,
  BulkCreatePlantedTreesInput,
  TreeHealthStatus,
} from '../api/plantedTrees';
import { fetchMyUpdates, createUpdate, deleteUpdate, CreateUpdateInput } from '../api/ngoUpdates';
import { browseNgos, fetchNgoPublicProfile } from '../api/ngosPublic';
import { followNgo, unfollowNgo, fetchFollowedNgos, fetchFollowingFeed } from '../api/follow';

export function useTrees(limit?: number) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['trees', limit],
    queryFn: () => fetchTrees({ limit }),
    enabled: isAuthenticated,
  });
}

export function useSpecies() {
  return useQuery({ queryKey: ['species'], queryFn: fetchSpecies });
}

export function useTodayMissions() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['missions', 'today'],
    queryFn: fetchTodayMissions,
    enabled: isAuthenticated,
  });
}

export function useCompleteMission() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: (id: string) => completeMission(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['missions', 'today'] }),
        refreshUser(),
      ]);
    },
  });
}

export function useEcoFacts() {
  return useQuery({ queryKey: ['eco-facts'], queryFn: fetchEcoFacts, staleTime: Infinity });
}

export function useAchievements() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['achievements'],
    queryFn: fetchAchievements,
    enabled: isAuthenticated,
  });
}

export function useStreakCalendar(weeks = 4) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['streaks', 'calendar', weeks],
    queryFn: () => fetchStreakCalendar(weeks),
    enabled: isAuthenticated,
  });
}

export function useThemes() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['themes'],
    queryFn: fetchThemes,
    enabled: isAuthenticated,
  });
}

export function useSelectTheme() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: (themeId: string) => selectTheme(themeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['themes'] });
      await refreshUser();
    },
  });
}

export function useLeaderboard(scope: 'global' | 'friends' = 'global') {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['leaderboard', scope],
    queryFn: () => fetchLeaderboard(scope),
    enabled: isAuthenticated,
  });
}

export function useFriends() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['friends'],
    queryFn: fetchFriends,
    enabled: isAuthenticated,
  });
}

export function useFriendRequests() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['friends', 'requests'],
    queryFn: fetchFriendRequests,
    enabled: isAuthenticated,
  });
}

export function useSearchUsers(query: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['users', 'search', query],
    queryFn: () => searchUsers(query),
    enabled: isAuthenticated && query.trim().length > 0,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addresseeId: string) => sendFriendRequest(addresseeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });
}

export function useRespondFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'accept' | 'decline' }) => respondFriendRequest(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendUserId: string) => removeFriend(friendUserId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['friends'] }),
  });
}

export function useFeed(scope: 'friends' | 'global' = 'friends') {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['feed', scope],
    queryFn: () => fetchFeed(scope),
    enabled: isAuthenticated,
  });
}

export function useCheerActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cheerActivity(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['feed'] }),
  });
}

export function usePublicProfile(userId: string | null) {
  return useQuery({
    queryKey: ['users', 'public', userId],
    queryFn: () => fetchPublicProfile(userId as string),
    enabled: !!userId,
  });
}

export function useChallenges() {
  return useQuery({ queryKey: ['challenges'], queryFn: fetchChallenges });
}

export function useJoinChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => joinChallenge(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['challenges'] }),
  });
}

export function useGlobalCounter() {
  return useQuery({ queryKey: ['community', 'global-counter'], queryFn: fetchGlobalCounter });
}

export function useSettings() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['settings'],
    queryFn: fetchSettings,
    enabled: isAuthenticated,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ApiUserSettings>) => updateSettings(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] });
      const previous = queryClient.getQueryData<ApiUserSettings>(['settings']);
      if (previous) {
        queryClient.setQueryData(['settings'], { ...previous, ...patch });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['settings'], context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });
}

export function useProtectStreak() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: (method: 'plant' | 'freeze' | 'xp') => protectStreak(method),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['streaks', 'calendar'] }),
        refreshUser(),
      ]);
    },
  });
}

export function useUpdateMe() {
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: (input: { name?: string; handle?: string; avatarEmoji?: string }) => updateMe(input),
    onSuccess: (updated) => setUser(updated),
  });
}

export function useChangePassword() {
  const { setUser } = useAuth();
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      changePassword(currentPassword, newPassword),
    onSuccess: (updated) => setUser(updated),
  });
}

export function useSessions() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['sessions'],
    queryFn: fetchSessions,
    enabled: isAuthenticated,
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeSession(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useDecorationTypes() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['decorations', 'types'],
    queryFn: fetchDecorationTypes,
    enabled: isAuthenticated,
    staleTime: Infinity,
  });
}

export function useDecorationPlacements() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['decorations', 'placements'],
    queryFn: fetchDecorationPlacements,
    enabled: isAuthenticated,
  });
}

export function useCreateDecorationPlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePlacementInput) => createDecorationPlacement(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decorations', 'placements'] }),
  });
}

export function useUpdateDecorationPlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdatePlacementInput) =>
      updateDecorationPlacement(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decorations', 'placements'] }),
  });
}

export function useDeleteDecorationPlacement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDecorationPlacement(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decorations', 'placements'] }),
  });
}

export function useMyStories() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['stories', 'me'],
    queryFn: fetchMyStories,
    enabled: isAuthenticated,
  });
}

export function useStoryFeed() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['stories', 'feed'],
    queryFn: fetchStoryFeed,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });
}

export function useUserStories(userId: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['stories', 'user', userId],
    queryFn: () => fetchUserStories(userId!),
    enabled: isAuthenticated && !!userId,
  });
}

export function usePostStory() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  return useMutation({
    mutationFn: (input: { imageBase64: string; caption?: string }) => postStory(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['stories'] }),
        queryClient.invalidateQueries({ queryKey: ['missions', 'today'] }),
        refreshUser(),
      ]);
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stories'] }),
  });
}

export function useDrives(lat?: number, lng?: number) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['drives', lat, lng],
    queryFn: () => fetchDrives({ lat, lng }),
    enabled: isAuthenticated,
  });
}

export function useDrive(id: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['drives', id],
    queryFn: () => fetchDrive(id as string),
    enabled: isAuthenticated && !!id,
  });
}

export function useJoinDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => joinDrive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drives'] }),
  });
}

export function useLeaveDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveDrive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drives'] }),
  });
}

export function useAdoptableTrees(lat?: number, lng?: number) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['adoptable-trees', lat, lng],
    queryFn: () => fetchAdoptableTrees({ lat, lng }),
    enabled: isAuthenticated,
  });
}

export function useAdoptableTree(id: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['adoptable-trees', id],
    queryFn: () => fetchAdoptableTree(id as string),
    enabled: isAuthenticated && !!id,
  });
}

export function useAdoptTree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message?: string }) => adoptTree(id, message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adoptable-trees'] }),
  });
}

export function useSponsorPlant() {
  return useMutation({
    mutationFn: ({ driveId, plantId }: { driveId: string; plantId: string }) => sponsorPlant(driveId, plantId),
  });
}

// ---------- NGO-facing ----------

export function useMyDrives() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['drives', 'mine'],
    queryFn: fetchMyDrives,
    enabled: isAuthenticated,
  });
}

export function useCreateDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDriveInput) => createDrive(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drives'] }),
  });
}

export function useMyAdoptableTrees() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['adoptable-trees', 'mine'],
    queryFn: fetchMyAdoptableTrees,
    enabled: isAuthenticated,
  });
}

export function useCreateAdoptableTree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdoptableTreeInput) => createAdoptableTree(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adoptable-trees'] }),
  });
}

export function useCampaigns() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: fetchCampaigns,
    enabled: isAuthenticated,
  });
}

export function useCampaign(id: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => fetchCampaign(id as string),
    enabled: isAuthenticated && !!id,
  });
}

export function useCreateDonationIntent() {
  return useMutation({
    mutationFn: ({ campaignId, amountCents }: { campaignId: string; amountCents: number }) =>
      createDonationIntent(campaignId, amountCents),
  });
}

export function useMyCampaigns() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['campaigns', 'mine'],
    queryFn: fetchMyCampaigns,
    enabled: isAuthenticated,
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCampaignInput) => createCampaign(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useCloseCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

export function useReopenCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reopenCampaign(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });
}

// ---------- NGO profile / stats / reports / donations / volunteers ----------

export function useNgoProfile() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'profile'],
    queryFn: fetchNgoProfile,
    enabled: isAuthenticated,
  });
}

export function useUpdateNgoProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNgoProfileInput) => updateNgoProfile(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ngo', 'profile'] }),
  });
}

export function useResubmitNgoProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resubmitNgoProfile(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ngo', 'profile'] }),
  });
}

export function useNgoStats() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'stats'],
    queryFn: fetchNgoStats,
    enabled: isAuthenticated,
  });
}

export function useNgoReports() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'reports'],
    queryFn: fetchNgoReports,
    enabled: isAuthenticated,
  });
}

export function useNgoDonations(filter: DonationsFilter = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'donations', filter],
    queryFn: () => fetchNgoDonations(filter),
    enabled: isAuthenticated,
  });
}

export function useNgoDonationsSummary() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'donations', 'summary'],
    queryFn: fetchNgoDonationsSummary,
    enabled: isAuthenticated,
  });
}

export function useNgoVolunteers() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'volunteers'],
    queryFn: fetchNgoVolunteers,
    enabled: isAuthenticated,
  });
}

// ---------- Staff roster ----------

export function useStaff() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'staff'],
    queryFn: fetchStaff,
    enabled: isAuthenticated,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStaffInput) => createStaff(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ngo', 'staff'] }),
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & UpdateStaffInput) => updateStaff(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ngo', 'staff'] }),
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStaff(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ngo', 'staff'] }),
  });
}

// ---------- Planted trees / health checks ----------

export function usePlantedTrees(filter: ListPlantedTreesFilter = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'planted-trees', filter],
    queryFn: () => fetchPlantedTrees(filter),
    enabled: isAuthenticated,
  });
}

export function useBulkCreatePlantedTrees() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkCreatePlantedTreesInput) => bulkCreatePlantedTrees(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ngo', 'planted-trees'] });
      queryClient.invalidateQueries({ queryKey: ['ngo', 'survival-stats'] });
    },
  });
}

export function useLogHealthCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ plantedTreeId, status, notes }: { plantedTreeId: string; status: TreeHealthStatus; notes?: string }) =>
      logHealthCheck(plantedTreeId, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ngo', 'planted-trees'] });
      queryClient.invalidateQueries({ queryKey: ['ngo', 'survival-stats'] });
    },
  });
}

export function useLogBulkHealthChecks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { plantedTreeIds: string[]; status: TreeHealthStatus; notes?: string }) => logBulkHealthChecks(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ngo', 'planted-trees'] });
      queryClient.invalidateQueries({ queryKey: ['ngo', 'survival-stats'] });
    },
  });
}

export function useSurvivalStats(driveId?: string) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'survival-stats', driveId],
    queryFn: () => fetchSurvivalStats(driveId),
    enabled: isAuthenticated,
  });
}

// ---------- NGO updates ----------

export function useMyUpdates() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'updates'],
    queryFn: fetchMyUpdates,
    enabled: isAuthenticated,
  });
}

export function useCreateUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUpdateInput) => createUpdate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ngo', 'updates'] }),
  });
}

export function useDeleteUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteUpdate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ngo', 'updates'] }),
  });
}

// ---------- Public NGO directory / follow ----------

export function useBrowseNgos(params: { q?: string; city?: string } = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngos', 'browse', params],
    queryFn: () => browseNgos(params),
    enabled: isAuthenticated,
  });
}

export function useNgoPublicProfile(id: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngos', 'public', id],
    queryFn: () => fetchNgoPublicProfile(id as string),
    enabled: isAuthenticated && !!id,
  });
}

export function useFollowNgo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ngoId: string) => followNgo(ngoId),
    onSuccess: (_data, ngoId) => {
      queryClient.invalidateQueries({ queryKey: ['ngos', 'public', ngoId] });
      queryClient.invalidateQueries({ queryKey: ['follows'] });
    },
  });
}

export function useUnfollowNgo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ngoId: string) => unfollowNgo(ngoId),
    onSuccess: (_data, ngoId) => {
      queryClient.invalidateQueries({ queryKey: ['ngos', 'public', ngoId] });
      queryClient.invalidateQueries({ queryKey: ['follows'] });
    },
  });
}

export function useFollowedNgos() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['follows'],
    queryFn: fetchFollowedNgos,
    enabled: isAuthenticated,
  });
}

export function useFollowingFeed() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['follows', 'feed'],
    queryFn: fetchFollowingFeed,
    enabled: isAuthenticated,
  });
}

export function usePlantTree() {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationFn: (input: PlantTreeInput) => plantTree(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trees'] }),
        queryClient.invalidateQueries({ queryKey: ['missions', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['achievements'] }),
        queryClient.invalidateQueries({ queryKey: ['streaks', 'calendar'] }),
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
        refreshUser(),
      ]);
    },
  });
}
