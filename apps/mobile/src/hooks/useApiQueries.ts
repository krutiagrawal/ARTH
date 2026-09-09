import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { fetchTrees, plantTree, verifyPlantingPhoto, type PlantTreeInput } from '../api/trees';
import { fetchNgoPublicFollowers, fetchNurseryPublicFollowers } from '../api/publicFollowers';
import { fetchApprovedLocations, checkPlantingEligibility } from '../api/plantingLocations';
import { fetchSpecies } from '../api/species';
import { fetchTodayMissions, completeMission } from '../api/missions';
import { fetchEcoFacts } from '../api/ecoFacts';
import { fetchAchievements, fetchUserAchievements } from '../api/achievements';
import { fetchStreakCalendar } from '../api/streaks';
import { fetchThemes, selectTheme } from '../api/themes';
import { fetchLeaderboard } from '../api/leaderboard';
import { fetchPublicNgoLeaderboard, fetchPublicNurseryLeaderboard } from '../api/publicLeaderboard';
import {
  fetchFriends,
  fetchFriendRequests,
  searchUsers,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
} from '../api/friends';
import { fetchChallenges, joinChallenge, leaveChallenge } from '../api/challenges';
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
  fetchStoryViewers,
  fetchRingStatus,
  postStory,
  deleteStory,
  likeStory,
  unlikeStory,
} from '../api/stories';
import {
  fetchDrives,
  fetchDrive,
  joinDrive,
  leaveDrive,
  sponsorPlant,
  fetchMyDrives,
  fetchJoinedDrives,
  fetchUserJoinedDrives,
  fetchGroupDrives,
  createDrive,
  CreateDriveInput,
} from '../api/drives';
import {
  fetchAdoptableTrees,
  fetchAdoptableTree,
  adoptTree,
  fetchMyAdoptableTrees,
  createAdoptableTree,
  fetchMyAdoptions,
  releaseMyAdoption,
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
import {
  fetchGroupProfile,
  updateGroupProfile,
  regenerateGroupInviteCode,
  fetchGroupStats,
  fetchGroupMembers,
  setGroupMemberRole,
  removeGroupMember,
  fetchOwnGroupChallenges,
  createGroupChallenge,
  fetchMyGroups,
  joinGroupByInviteCode,
  leaveGroup,
  fetchGroupChallenges,
  joinGroupChallenge,
  fetchGroupPublicProfile,
  UpdateGroupProfileInput,
  CreateGroupChallengeInput,
} from '../api/group';
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
import { fetchNgoAchievements, fetchNgoPublicAchievements } from '../api/ngoAchievements';
import { fetchNgoStreakCalendar } from '../api/ngoStreaks';
import { fetchGroupStreakCalendar, fetchGroupStreakCalendarForMember } from '../api/groupStreaks';
import { fetchGroupAchievements, fetchGroupAchievementsForMember } from '../api/groupAchievements';
import { fetchGroupActivity, fetchGroupActivityForMember } from '../api/groupActivity';
import {
  fetchNurseryProfile,
  updateNurseryProfile,
  resubmitNurseryProfile,
  fetchNurseryStats,
  fetchSaplingStock,
  createSaplingStock,
  updateSaplingStock,
  deleteSaplingStock,
  fetchNurseryBadges,
  fetchNurseryPublicAchievements,
  fetchNurseryReservations,
  fulfillReservation as fulfillReservationApi,
  declineReservation as declineReservationApi,
  fetchStockLedger,
  fetchStockAnalytics,
  fetchNurseryOrders,
  fetchNurseryOrder,
  packOrder,
  dispatchOrder,
  deliverOrder,
  cancelNurseryOrder,
  fetchNurseryReviews,
  respondToReview as respondToReviewApi,
  UpdateNurseryProfileInput,
  SaplingStockInput,
  ReservationStatus,
  NurseryOrderStatus,
} from '../api/nursery';
import { fetchNurseryStreakCalendar } from '../api/nurseryStreaks';
import {
  browseNurseries,
  fetchNurseryPublicProfile,
  createReservation as createReservationApi,
  CreateReservationInput,
  followNursery,
  unfollowNursery,
} from '../api/nurseriesPublic';
import { fetchMyReservations, cancelReservation as cancelReservationApi } from '../api/reservations';
import {
  fetchCorporateProfile,
  updateCorporateProfile,
  resubmitCorporateProfile,
  fetchCorporateStats,
  fetchSponsorships,
  createSponsorship,
  deleteSponsorship,
  UpdateCorporateProfileInput,
  CreateSponsorshipInput,
} from '../api/corporate';
import { fetchNgoLeaderboard } from '../api/ngoLeaderboard';
import { fetchGroupLeaderboard } from '../api/groupLeaderboard';
import { fetchGroupThemes, selectGroupTheme } from '../api/groupThemes';
import { browseNgos, fetchNgoPublicProfile } from '../api/ngosPublic';
import { followNgo, unfollowNgo, fetchFollowedNgos, fetchFollowingFeed } from '../api/follow';
import {
  fetchAdminOverview,
  fetchAdminNgos,
  fetchAdminNgoSummary,
  setAdminNgoStatus,
  fetchAdminActionLogs,
  AdminNgosFilter,
  AdminActionLogsParams,
  NgoApprovalStatus,
  fetchAdminNurseries,
  setAdminNurseryStatus,
  fetchAdminCorporates,
  setAdminCorporateStatus,
  AdminOrgFilter,
  searchAdminAccounts,
  blockAdminAccount,
  unblockAdminAccount,
  AdminAccountType,
  fetchAdminTreeReviewQueue,
  reviewAdminTree,
  fetchAdminDrives,
  cancelAdminDrive,
  fetchAdminDonations,
  refundAdminDonation,
  fetchAdminOrders,
  refundAdminOrder,
  fetchAdminCatalog,
  createAdminCatalogItem,
  updateAdminCatalogItem,
  AdminCatalogModel,
} from '../api/admin';
import { fetchAddresses, createAddress, updateAddress, deleteAddress, UpsertAddressInput } from '../api/addresses';
import { fetchCart, addCartItem, updateCartItem, removeCartItem, clearCart } from '../api/cart';
import { fetchMyOrders, fetchMyOrder, checkout, cancelOrder, submitOrderReview } from '../api/orders';
import { fetchWishlist, addWishlistItem, removeWishlistItem } from '../api/wishlist';

export function useTrees(limit?: number, enabled: boolean = true) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['trees', limit],
    queryFn: () => fetchTrees({ limit }),
    enabled: isAuthenticated && enabled,
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

export const LEADERBOARD_PAGE_SIZE = 20;

/** Page-number (not infinite-scroll) pagination for the Ranks tab's user list. `page` is 1-indexed. */
export function useUserLeaderboardPage(scope: 'global' | 'friends', page: number) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['leaderboard', scope, 'page', page],
    queryFn: () => fetchLeaderboard(scope, { limit: LEADERBOARD_PAGE_SIZE, offset: (page - 1) * LEADERBOARD_PAGE_SIZE }),
    enabled: isAuthenticated,
  });
}

/** Public NGO ranking tab — visible to any logged-in user. `page` is 1-indexed. */
export function usePublicNgoLeaderboardPage(page: number) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['leaderboard', 'ngos', 'page', page],
    queryFn: () => fetchPublicNgoLeaderboard(LEADERBOARD_PAGE_SIZE, (page - 1) * LEADERBOARD_PAGE_SIZE),
    enabled: isAuthenticated,
  });
}

export function usePublicNurseryLeaderboardPage(page: number) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['leaderboard', 'nurseries', 'page', page],
    queryFn: () => fetchPublicNurseryLeaderboard(LEADERBOARD_PAGE_SIZE, (page - 1) * LEADERBOARD_PAGE_SIZE),
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

export function useUserAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', userId, 'achievements'],
    queryFn: () => fetchUserAchievements(userId as string),
    enabled: !!userId,
  });
}

export function useNgoPublicFollowers(ngoId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'public', ngoId, 'followers'],
    queryFn: () => fetchNgoPublicFollowers(ngoId as string),
    enabled: isAuthenticated && !!ngoId,
  });
}

export function useNurseryPublicFollowers(nurseryId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nursery', 'public', nurseryId, 'followers'],
    queryFn: () => fetchNurseryPublicFollowers(nurseryId as string),
    enabled: isAuthenticated && !!nurseryId,
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

export function useLeaveChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveChallenge(id),
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
    mutationFn: (input: { name?: string; handle?: string; avatarEmoji?: string; bio?: string | null }) => updateMe(input),
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

/**
 * Batch seen/unseen story-ring lookup for a screen's visible avatars — call once per list with
 * every id on it (profile header, a page of leaderboard rows, a followers list, ...) rather than
 * one request per avatar. Pass stable arrays (e.g. `useMemo`'d) to avoid refetching every render.
 */
export function useRingStatus(ids: { userIds?: string[]; ngoIds?: string[]; nurseryIds?: string[]; groupIds?: string[] }) {
  const { isAuthenticated } = useAuth();
  const userIds = ids.userIds ?? [];
  const ngoIds = ids.ngoIds ?? [];
  const nurseryIds = ids.nurseryIds ?? [];
  const groupIds = ids.groupIds ?? [];
  const hasAny = userIds.length + ngoIds.length + nurseryIds.length + groupIds.length > 0;

  return useQuery({
    queryKey: ['stories', 'ring-status', [...userIds].sort(), [...ngoIds].sort(), [...nurseryIds].sort(), [...groupIds].sort()],
    queryFn: () => fetchRingStatus({ userIds, ngoIds, nurseryIds, groupIds }),
    enabled: isAuthenticated && hasAny,
    staleTime: 30 * 1000,
  });
}

export function useStoryViewers(storyId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['stories', storyId, 'viewers'],
    queryFn: () => fetchStoryViewers(storyId as string),
    enabled: isAuthenticated && !!storyId,
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

export function useToggleStoryLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) => (liked ? unlikeStory(id) : likeStory(id)),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
      queryClient.invalidateQueries({ queryKey: ['stories', id, 'viewers'] });
    },
  });
}

export function useDrives(lat?: number, lng?: number, enabled: boolean = true) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['drives', lat, lng],
    queryFn: () => fetchDrives({ lat, lng }),
    enabled: isAuthenticated && enabled,
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

export function useApprovedPlantingLocations(enabled: boolean = true) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['plantingLocations'],
    queryFn: fetchApprovedLocations,
    enabled: isAuthenticated && enabled,
  });
}

export function useCheckPlantingEligibility() {
  return useMutation({
    mutationFn: (input: { lat: number; lng: number }) => checkPlantingEligibility(input),
  });
}

export function useLeaveDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leaveDrive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drives'] }),
  });
}

export function useAdoptableTrees(lat?: number, lng?: number, enabled: boolean = true) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['adoptable-trees', lat, lng],
    queryFn: () => fetchAdoptableTrees({ lat, lng }),
    enabled: isAuthenticated && enabled,
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

export function useMyAdoptions() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['adoptable-trees', 'my-adoptions'], queryFn: fetchMyAdoptions, enabled: isAuthenticated });
}

export function useReleaseMyAdoption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => releaseMyAdoption(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adoptable-trees'] });
    },
  });
}

export function useSponsorPlant() {
  return useMutation({
    mutationFn: ({ driveId, plantId }: { driveId: string; plantId: string }) => sponsorPlant(driveId, plantId),
  });
}

export function useJoinedDrives() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['drives', 'joined'],
    queryFn: fetchJoinedDrives,
    enabled: isAuthenticated,
  });
}

export function useUserJoinedDrives(userId: string | undefined) {
  return useQuery({
    queryKey: ['users', userId, 'drives', 'joined'],
    queryFn: () => fetchUserJoinedDrives(userId as string),
    enabled: !!userId,
  });
}

export function useGroupDrives(groupId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['groups', groupId, 'drives'],
    queryFn: () => fetchGroupDrives(groupId as string),
    enabled: isAuthenticated && Boolean(groupId),
  });
}

// ---------- NGO-facing ----------

export function useMyDrives(enabled: boolean = true) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['drives', 'mine'],
    queryFn: fetchMyDrives,
    enabled: isAuthenticated && enabled,
  });
}

export function useCreateDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDriveInput) => createDrive(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['drives'] }),
  });
}

export function useMyAdoptableTrees(enabled: boolean = true) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['adoptable-trees', 'mine'],
    queryFn: fetchMyAdoptableTrees,
    enabled: isAuthenticated && enabled,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ngo', 'updates'] });
      queryClient.invalidateQueries({ queryKey: ['ngo', 'achievements'] });
      queryClient.invalidateQueries({ queryKey: ['ngo', 'streaks'] });
      queryClient.invalidateQueries({ queryKey: ['ngo', 'leaderboard'] });
    },
  });
}

export function useNgoAchievements() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'achievements'],
    queryFn: fetchNgoAchievements,
    enabled: isAuthenticated,
  });
}

export function useNgoPublicAchievements(ngoId: string | undefined) {
  return useQuery({
    queryKey: ['ngos', ngoId, 'achievements'],
    queryFn: () => fetchNgoPublicAchievements(ngoId as string),
    enabled: !!ngoId,
  });
}

export function useNgoStreakCalendar(weeks = 12) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'streaks', 'calendar', weeks],
    queryFn: () => fetchNgoStreakCalendar(weeks),
    enabled: isAuthenticated,
  });
}

export function useNgoLeaderboard(limit = 50) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ngo', 'leaderboard', limit],
    queryFn: () => fetchNgoLeaderboard(limit),
    enabled: isAuthenticated,
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

// ---------- Admin ----------

export function useAdminOverview() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: fetchAdminOverview,
    enabled: isAuthenticated,
  });
}

export function useAdminNgos(filter: AdminNgosFilter = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['admin', 'ngos', filter],
    queryFn: () => fetchAdminNgos(filter),
    enabled: isAuthenticated,
  });
}

export function useAdminNgoSummary(id: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['admin', 'ngos', id, 'summary'],
    queryFn: () => fetchAdminNgoSummary(id as string),
    enabled: isAuthenticated && !!id,
  });
}

export function useSetAdminNgoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: NgoApprovalStatus; rejectionReason?: string }) =>
      setAdminNgoStatus(id, { status, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'ngos'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
}

export function useAdminActionLogs(params: AdminActionLogsParams = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['admin', 'action-logs', params],
    queryFn: () => fetchAdminActionLogs(params),
    enabled: isAuthenticated,
  });
}

export function useAdminNurseries(filter: AdminOrgFilter = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['admin', 'nurseries', filter],
    queryFn: () => fetchAdminNurseries(filter),
    enabled: isAuthenticated,
  });
}

export function useSetAdminNurseryStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: NgoApprovalStatus; rejectionReason?: string }) =>
      setAdminNurseryStatus(id, { status, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'nurseries'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
}

export function useAdminCorporates(filter: AdminOrgFilter = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['admin', 'corporates', filter],
    queryFn: () => fetchAdminCorporates(filter),
    enabled: isAuthenticated,
  });
}

export function useSetAdminCorporateStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, rejectionReason }: { id: string; status: NgoApprovalStatus; rejectionReason?: string }) =>
      setAdminCorporateStatus(id, { status, rejectionReason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'corporates'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
}

export function useAdminAccounts(filter: { q?: string; type?: AdminAccountType; page?: number; take?: number } = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['admin', 'accounts', filter],
    queryFn: () => searchAdminAccounts(filter),
    enabled: isAuthenticated,
  });
}

export function useBlockAdminAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason?: string }) => blockAdminAccount(userId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });
}

export function useUnblockAdminAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => unblockAdminAccount(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
}

export function useAdminTreeReviewQueue(params: { page?: number; take?: number } = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['admin', 'trees', 'review-queue', params],
    queryFn: () => fetchAdminTreeReviewQueue(params),
    enabled: isAuthenticated,
  });
}

export function useReviewAdminTree() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'approve' | 'reject' }) => reviewAdminTree(id, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trees'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'overview'] });
    },
  });
}

export function useAdminDrives(params: { page?: number; take?: number } = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['admin', 'drives', params], queryFn: () => fetchAdminDrives(params), enabled: isAuthenticated });
}

export function useCancelAdminDrive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelAdminDrive(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'drives'] }),
  });
}

export function useAdminDonations(params: { page?: number; take?: number } = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['admin', 'donations', params], queryFn: () => fetchAdminDonations(params), enabled: isAuthenticated });
}

export function useRefundAdminDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => refundAdminDonation(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'donations'] }),
  });
}

export function useAdminOrders(params: { page?: number; take?: number } = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['admin', 'orders', params], queryFn: () => fetchAdminOrders(params), enabled: isAuthenticated });
}

export function useRefundAdminOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => refundAdminOrder(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] }),
  });
}

export function useAdminCatalog(model: AdminCatalogModel) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['admin', 'catalog', model],
    queryFn: () => fetchAdminCatalog(model),
    enabled: isAuthenticated,
  });
}

export function useCreateAdminCatalogItem(model: AdminCatalogModel) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => createAdminCatalogItem(model, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'catalog', model] }),
  });
}

export function useUpdateAdminCatalogItem(model: AdminCatalogModel) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) => updateAdminCatalogItem(model, id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'catalog', model] }),
  });
}

export function useVerifyPlantingPhoto() {
  return useMutation({
    mutationFn: (photo: { uri: string; name: string; type: string }) => verifyPlantingPhoto(photo),
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

// ---------- Group profile / stats / members / challenges (owner dashboard) ----------

export function useGroupProfile() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['group', 'profile'],
    queryFn: fetchGroupProfile,
    enabled: isAuthenticated,
  });
}

export function useUpdateGroupProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGroupProfileInput) => updateGroupProfile(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', 'profile'] }),
  });
}

export function useRegenerateGroupInviteCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => regenerateGroupInviteCode(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', 'profile'] }),
  });
}

export function useGroupStats() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['group', 'stats'],
    queryFn: fetchGroupStats,
    enabled: isAuthenticated,
  });
}

export function useGroupLeaderboard(limit = 50) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['group', 'leaderboard', limit],
    queryFn: () => fetchGroupLeaderboard(limit),
    enabled: isAuthenticated,
  });
}

export function useGroupThemes() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['group', 'themes'],
    queryFn: fetchGroupThemes,
    enabled: isAuthenticated,
  });
}

export function useSelectGroupTheme() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (themeId: string) => selectGroupTheme(themeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group', 'themes'] });
      await queryClient.invalidateQueries({ queryKey: ['group', 'profile'] });
    },
  });
}

export function useGroupMembers() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['group', 'members'],
    queryFn: fetchGroupMembers,
    enabled: isAuthenticated,
  });
}

export function useSetGroupMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: 'owner' | 'co_admin' | 'member' }) => setGroupMemberRole(userId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', 'members'] }),
  });
}

export function useRemoveGroupMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeGroupMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group', 'members'] });
      queryClient.invalidateQueries({ queryKey: ['group', 'stats'] });
    },
  });
}

export function useOwnGroupChallenges() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['group', 'challenges', 'mine'],
    queryFn: fetchOwnGroupChallenges,
    enabled: isAuthenticated,
  });
}

export function useCreateGroupChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupChallengeInput) => createGroupChallenge(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', 'challenges'] }),
  });
}

export function useGroupStreakCalendar(weeks = 4) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['group', 'streaks', 'calendar', weeks],
    queryFn: () => fetchGroupStreakCalendar(weeks),
    enabled: isAuthenticated,
  });
}

export function useGroupAchievements() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['group', 'achievements'],
    queryFn: fetchGroupAchievements,
    enabled: isAuthenticated,
  });
}

export function useGroupActivity(options?: { enabled?: boolean }) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['group', 'activity'],
    queryFn: () => fetchGroupActivity(),
    enabled: isAuthenticated && (options?.enabled ?? true),
  });
}

// ---------- Groups (member-facing: join/leave/browse) ----------

export function useMyGroups() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['groups', 'mine'],
    queryFn: fetchMyGroups,
    enabled: isAuthenticated,
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inviteCode: string) => joinGroupByInviteCode(inviteCode),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] }),
  });
}

export function useLeaveGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => leaveGroup(groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups', 'mine'] }),
  });
}

export function useGroupPublicProfile(groupId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['groups', groupId, 'public'],
    queryFn: () => fetchGroupPublicProfile(groupId as string),
    enabled: isAuthenticated && Boolean(groupId),
  });
}

export function useGroupChallenges(groupId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['groups', groupId, 'challenges'],
    queryFn: () => fetchGroupChallenges(groupId as string),
    enabled: isAuthenticated && Boolean(groupId),
  });
}

export function useJoinGroupChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) => joinGroupChallenge(challengeId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useGroupActivityForMember(groupId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['groups', groupId, 'activity'],
    queryFn: () => fetchGroupActivityForMember(groupId as string),
    enabled: isAuthenticated && Boolean(groupId),
  });
}

export function useGroupStreakCalendarForMember(groupId: string | undefined, weeks = 4) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['groups', groupId, 'streaks', 'calendar', weeks],
    queryFn: () => fetchGroupStreakCalendarForMember(groupId as string, weeks),
    enabled: isAuthenticated && Boolean(groupId),
  });
}

export function useGroupAchievementsForMember(groupId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['groups', groupId, 'achievements'],
    queryFn: () => fetchGroupAchievementsForMember(groupId as string),
    enabled: isAuthenticated && Boolean(groupId),
  });
}

// ---------- Nursery profile / stats / stock ----------

export function useNurseryProfile() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nursery', 'profile'],
    queryFn: fetchNurseryProfile,
    enabled: isAuthenticated,
  });
}

export function useUpdateNurseryProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNurseryProfileInput) => updateNurseryProfile(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nursery', 'profile'] }),
  });
}

export function useResubmitNurseryProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resubmitNurseryProfile(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nursery', 'profile'] }),
  });
}

export function useNurseryStats() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nursery', 'stats'],
    queryFn: fetchNurseryStats,
    enabled: isAuthenticated,
  });
}

export function useSaplingStock() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nursery', 'stock'],
    queryFn: fetchSaplingStock,
    enabled: isAuthenticated,
  });
}

export function useCreateSaplingStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaplingStockInput) => createSaplingStock(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nursery', 'stock'] });
      queryClient.invalidateQueries({ queryKey: ['nursery', 'stats'] });
    },
  });
}

export function useUpdateSaplingStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<SaplingStockInput> }) => updateSaplingStock(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nursery', 'stock'] });
      queryClient.invalidateQueries({ queryKey: ['nursery', 'stats'] });
    },
  });
}

export function useDeleteSaplingStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSaplingStock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nursery', 'stock'] });
      queryClient.invalidateQueries({ queryKey: ['nursery', 'stats'] });
    },
  });
}

export function useNurseryStreakCalendar(weeks = 6) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nursery', 'streaks', 'calendar', weeks],
    queryFn: () => fetchNurseryStreakCalendar(weeks),
    enabled: isAuthenticated,
  });
}

export function useNurseryBadges() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nursery', 'badges'],
    queryFn: fetchNurseryBadges,
    enabled: isAuthenticated,
  });
}

export function useNurseryPublicAchievements(nurseryId: string | undefined) {
  return useQuery({
    queryKey: ['nurseries', nurseryId, 'achievements'],
    queryFn: () => fetchNurseryPublicAchievements(nurseryId as string),
    enabled: !!nurseryId,
  });
}

export function useNurseryReservations(status?: ReservationStatus) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nursery', 'reservations', status],
    queryFn: () => fetchNurseryReservations(status),
    enabled: isAuthenticated,
  });
}

export function useFulfillReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fulfillReservationApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nursery', 'reservations'] });
      queryClient.invalidateQueries({ queryKey: ['nursery', 'stock'] });
      queryClient.invalidateQueries({ queryKey: ['nursery', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['nursery', 'badges'] });
    },
  });
}

export function useDeclineReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => declineReservationApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nursery', 'reservations'] }),
  });
}

export function useStockLedger(page = 1, take = 30) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nursery', 'stock', 'ledger', page, take],
    queryFn: () => fetchStockLedger(page, take),
    enabled: isAuthenticated,
  });
}

export function useStockAnalytics() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nursery', 'stock', 'analytics'],
    queryFn: fetchStockAnalytics,
    enabled: isAuthenticated,
  });
}

// ---------- Nursery marketplace orders (Nursery-side) ----------

export function useNurseryOrders(status?: NurseryOrderStatus) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nursery', 'orders', status],
    queryFn: () => fetchNurseryOrders(status),
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });
}

export function useNurseryOrder(id: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nursery', 'orders', 'detail', id],
    queryFn: () => fetchNurseryOrder(id as string),
    enabled: isAuthenticated && !!id,
  });
}

function invalidateNurseryOrders(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['nursery', 'orders'] });
}

export function usePackOrder() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: (id: string) => packOrder(id), onSuccess: () => invalidateNurseryOrders(queryClient) });
}

export function useDispatchOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, riderName, riderPhone }: { id: string; riderName?: string; riderPhone?: string }) =>
      dispatchOrder(id, riderName, riderPhone),
    onSuccess: () => invalidateNurseryOrders(queryClient),
  });
}

export function useDeliverOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, otp }: { id: string; otp: string }) => deliverOrder(id, otp),
    onSuccess: () => invalidateNurseryOrders(queryClient),
  });
}

export function useCancelNurseryOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelNurseryOrder(id),
    onSuccess: () => invalidateNurseryOrders(queryClient),
  });
}

// ---------- Reviews (Nursery-side) ----------

export function useNurseryReviews() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['nursery', 'reviews'], queryFn: fetchNurseryReviews, enabled: isAuthenticated });
}

export function useRespondToReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) => respondToReviewApi(id, response),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['nursery', 'reviews'] }),
  });
}

// ---------- Public nursery directory / reservations (User-side) ----------

export function useBrowseNurseries(params: { q?: string; city?: string; deliveryOnly?: boolean; minRating?: number; lat?: number; lng?: number; radiusKm?: number } = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nurseries', 'browse', params],
    queryFn: () => browseNurseries(params),
    enabled: isAuthenticated,
  });
}

export function useFollowNursery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nurseryId: string) => followNursery(nurseryId),
    onSuccess: (_data, nurseryId) => {
      queryClient.invalidateQueries({ queryKey: ['nurseries', 'public', nurseryId] });
      queryClient.invalidateQueries({ queryKey: ['follows'] });
    },
  });
}

export function useUnfollowNursery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nurseryId: string) => unfollowNursery(nurseryId),
    onSuccess: (_data, nurseryId) => {
      queryClient.invalidateQueries({ queryKey: ['nurseries', 'public', nurseryId] });
      queryClient.invalidateQueries({ queryKey: ['follows'] });
    },
  });
}

export function useNurseryPublicProfile(id: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['nurseries', 'public', id],
    queryFn: () => fetchNurseryPublicProfile(id as string),
    enabled: isAuthenticated && !!id,
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReservationInput) => createReservationApi(input),
    onSuccess: (_data, input) => {
      queryClient.invalidateQueries({ queryKey: ['nurseries', 'public', input.nurseryId] });
      queryClient.invalidateQueries({ queryKey: ['reservations', 'mine'] });
    },
  });
}

export function useMyReservations() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['reservations', 'mine'],
    queryFn: fetchMyReservations,
    enabled: isAuthenticated,
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelReservationApi(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations', 'mine'] }),
  });
}

// ---------- Corporate profile / stats / sponsorships ----------

export function useCorporateProfile() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['corporate', 'profile'],
    queryFn: fetchCorporateProfile,
    enabled: isAuthenticated,
  });
}

export function useUpdateCorporateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCorporateProfileInput) => updateCorporateProfile(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['corporate', 'profile'] }),
  });
}

export function useResubmitCorporateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => resubmitCorporateProfile(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['corporate', 'profile'] }),
  });
}

export function useCorporateStats() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['corporate', 'stats'],
    queryFn: fetchCorporateStats,
    enabled: isAuthenticated,
  });
}

export function useSponsorships() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['corporate', 'sponsorships'],
    queryFn: fetchSponsorships,
    enabled: isAuthenticated,
  });
}

export function useCreateSponsorship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSponsorshipInput) => createSponsorship(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate', 'sponsorships'] });
      queryClient.invalidateQueries({ queryKey: ['corporate', 'stats'] });
    },
  });
}

export function useDeleteSponsorship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSponsorship(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corporate', 'sponsorships'] });
      queryClient.invalidateQueries({ queryKey: ['corporate', 'stats'] });
    },
  });
}

// ---------- Addresses ----------

export function useAddresses() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['addresses'], queryFn: fetchAddresses, enabled: isAuthenticated });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertAddressInput) => createAddress(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<UpsertAddressInput> }) => updateAddress(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });
}

// ---------- Nursery marketplace: cart / checkout / orders / wishlist ----------

export function useCart() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['cart'], queryFn: fetchCart, enabled: isAuthenticated });
}

export function useAddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ stockId, quantity }: { stockId: string; quantity: number }) => addCartItem(stockId, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => updateCartItem(itemId, quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => removeCartItem(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearCart(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });
}

export function useMyOrders() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['orders', 'mine'], queryFn: fetchMyOrders, enabled: isAuthenticated });
}

/** Polls every 8s while an order is out for delivery, so the tracking map keeps moving. */
export function useMyOrder(id: string | null) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['orders', 'mine', id],
    queryFn: () => fetchMyOrder(id as string),
    enabled: isAuthenticated && !!id,
    refetchInterval: (query) => (query.state.data?.status === 'out_for_delivery' ? 8000 : false),
  });
}

export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addressId: string) => checkout(addressId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelOrder(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', id] });
    },
  });
}

export function useSubmitOrderReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: { nurseryRating: number; deliveryRating?: number; comment?: string } }) =>
      submitOrderReview(id, input),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'mine', id] });
    },
  });
}

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: ['wishlist'], queryFn: fetchWishlist, enabled: isAuthenticated });
}

export function useAddWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { nurseryId?: string; stockId?: string }) => addWishlistItem(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });
}

export function useRemoveWishlistItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeWishlistItem(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['wishlist'] }),
  });
}
