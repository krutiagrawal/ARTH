import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import {
  createPost,
  deletePost,
  fetchNgoPosts,
  fetchPost,
  fetchPostLikers,
  fetchSavedPosts,
  fetchSocialFeed,
  fetchUserPosts,
  likePost,
  savePost,
  unlikePost,
  unsavePost,
  updatePostCaption,
  type ApiPost,
  type CreatePostInput,
  type CursorPage,
} from '../api/posts';
import {
  acceptFollowRequest,
  declineFollowRequest,
  fetchFollowers,
  removeFollower,
  type FollowStatus,
} from '../api/ngoFollowers';
import {
  acceptNurseryFollowRequest,
  declineNurseryFollowRequest,
  fetchNurseryFollowers,
  removeNurseryFollower,
} from '../api/nurseryFollowers';
import {
  createPortfolioEntry,
  deletePortfolioEntry,
  fetchMyPortfolio,
  fetchNgoPortfolio,
  updatePortfolioEntry,
  type PortfolioInput,
} from '../api/portfolio';
import {
  blockTarget,
  fetchBlocks,
  fetchNotifications,
  fetchUnreadCount,
  markNotificationsRead,
  reportContent,
  unblockTarget,
} from '../api/social';
import { actOnAdminReport, fetchAdminReports, type ModerationAction, type ReportStatus } from '../api/admin';
import { markStoryViewed } from '../api/stories';

/**
 * Query keys for the social layer. Kept in one place because a like has to reach every cached
 * list the post appears in — feed, saved, the author's grid and the post detail — and guessing
 * those key shapes at each call site is how caches drift out of sync.
 */
export const socialKeys = {
  feed: ['social', 'feed'] as const,
  saved: ['social', 'saved'] as const,
  post: (id: string) => ['social', 'post', id] as const,
  likers: (id: string) => ['social', 'likers', id] as const,
  ngoPosts: (ngoId: string) => ['social', 'posts', 'ngo', ngoId] as const,
  userPosts: (userId: string) => ['social', 'posts', 'user', userId] as const,
  followers: (status?: FollowStatus, q?: string) => ['ngo', 'followers', status ?? 'all', q ?? ''] as const,
  nurseryFollowers: (status?: FollowStatus, q?: string) => ['nursery', 'followers', status ?? 'all', q ?? ''] as const,
  portfolio: ['ngo', 'portfolio'] as const,
  ngoPortfolio: (ngoId: string) => ['ngos', 'portfolio', ngoId] as const,
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread'] as const,
  blocks: ['blocks'] as const,
  adminReports: (status?: ReportStatus) => ['admin', 'reports', status ?? 'all'] as const,
};

/** Every cached list that can contain posts, for cross-list cache surgery after a like/delete. */
const POST_LIST_KEYS = [socialKeys.feed, socialKeys.saved, ['social', 'posts']] as const;

// ---------------------------------------------------------------- Feeds

function cursorPageParams<T>() {
  return {
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: CursorPage<T>) => last.nextCursor ?? undefined,
  };
}

export function useSocialFeed() {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: socialKeys.feed,
    queryFn: ({ pageParam }) => fetchSocialFeed(pageParam),
    enabled: isAuthenticated,
    ...cursorPageParams<ApiPost>(),
  });
}

export function useSavedPosts() {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: socialKeys.saved,
    queryFn: ({ pageParam }) => fetchSavedPosts(pageParam),
    enabled: isAuthenticated,
    ...cursorPageParams<ApiPost>(),
  });
}

export function useNgoPosts(ngoId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: socialKeys.ngoPosts(ngoId ?? ''),
    queryFn: ({ pageParam }) => fetchNgoPosts(ngoId as string, pageParam),
    enabled: isAuthenticated && !!ngoId,
    ...cursorPageParams<ApiPost>(),
  });
}

export function useUserPosts(userId: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: socialKeys.userPosts(userId ?? ''),
    queryFn: ({ pageParam }) => fetchUserPosts(userId as string, pageParam),
    enabled: isAuthenticated && !!userId,
    ...cursorPageParams<ApiPost>(),
  });
}

export function usePost(id: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: socialKeys.post(id ?? ''),
    queryFn: () => fetchPost(id as string),
    enabled: isAuthenticated && !!id,
  });
}

export function usePostLikers(id: string | undefined) {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: socialKeys.likers(id ?? ''),
    queryFn: ({ pageParam }) => fetchPostLikers(id as string, pageParam),
    enabled: isAuthenticated && !!id,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

// ---------------------------------------------------------------- Mutations

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost(input),
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: socialKeys.feed });
      queryClient.invalidateQueries({ queryKey: ['social', 'posts'] });
      // Posting keeps the NGO's weekly streak and achievements moving, and the legacy updates
      // list is the same data under another name.
      queryClient.invalidateQueries({ queryKey: ['ngo'] });
      if (post.ngoId) queryClient.invalidateQueries({ queryKey: ['ngos', 'public', post.ngoId] });
      if (post.nurseryId) queryClient.invalidateQueries({ queryKey: ['nurseries', 'public', post.nurseryId] });
      // A group-tagged post shows up in that group's activity timeline immediately.
      queryClient.invalidateQueries({ queryKey: ['group'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}

export function useUpdatePostCaption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, caption }: { id: string; caption: string | null }) =>
      updatePostCaption(id, caption),
    onSuccess: (post) => {
      queryClient.setQueryData(socialKeys.post(post.id), post);
      queryClient.invalidateQueries({ queryKey: socialKeys.feed });
      queryClient.invalidateQueries({ queryKey: ['social', 'posts'] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePost(id),
    onSuccess: (_res, id) => {
      queryClient.removeQueries({ queryKey: socialKeys.post(id) });
      for (const key of POST_LIST_KEYS) queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['ngo'] });
    },
  });
}

/**
 * Rewrites one post everywhere it is cached.
 *
 * A post appears in the feed, the saved list, its author's grid and its own detail query at the
 * same time. Invalidating them all would make the heart flicker back to its old state while the
 * refetch is in flight, so the optimistic update edits each cache in place instead.
 */
function patchPostEverywhere(
  queryClient: ReturnType<typeof useQueryClient>,
  postId: string,
  patch: (post: ApiPost) => ApiPost,
) {
  queryClient.setQueriesData<{ pages: CursorPage<ApiPost>[]; pageParams: unknown[] }>(
    { queryKey: ['social'] },
    (data) => {
      if (!data?.pages) return data;
      return {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          posts: page.posts?.map((p) => (p.id === postId ? patch(p) : p)) ?? page.posts,
        })),
      };
    },
  );
  queryClient.setQueryData<ApiPost>(socialKeys.post(postId), (post) => (post ? patch(post) : post));
}

export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) =>
      liked ? unlikePost(id) : likePost(id),

    onMutate: async ({ id, liked }) => {
      await queryClient.cancelQueries({ queryKey: ['social'] });
      patchPostEverywhere(queryClient, id, (p) => ({
        ...p,
        likedByMe: !liked,
        // Guarded so a double-tap race can't drive the visible count negative.
        likeCount: Math.max(0, p.likeCount + (liked ? -1 : 1)),
      }));
      return { id, liked };
    },

    onError: (_err, { id, liked }) => {
      // Put it back exactly as it was.
      patchPostEverywhere(queryClient, id, (p) => ({
        ...p,
        likedByMe: liked,
        likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)),
      }));
    },

    onSuccess: (result, { id }) => {
      // The server's count is authoritative — it accounts for likes from other devices.
      patchPostEverywhere(queryClient, id, (p) => ({
        ...p,
        likedByMe: result.liked,
        likeCount: result.likeCount,
      }));
      queryClient.invalidateQueries({ queryKey: socialKeys.likers(id) });
    },
  });
}

export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      saved ? unsavePost(id) : savePost(id),
    onMutate: async ({ id, saved }) => {
      await queryClient.cancelQueries({ queryKey: ['social'] });
      patchPostEverywhere(queryClient, id, (p) => ({ ...p, savedByMe: !saved }));
      return { id, saved };
    },
    onError: (_err, { id, saved }) => {
      patchPostEverywhere(queryClient, id, (p) => ({ ...p, savedByMe: saved }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.saved });
    },
  });
}

// ---------------------------------------------------------------- NGO followers

export function useNgoFollowers(params: { status?: FollowStatus; q?: string } = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: socialKeys.followers(params.status, params.q),
    queryFn: () => fetchFollowers(params),
    enabled: isAuthenticated,
  });
}

function useFollowerAction(fn: (followId: string) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ngo', 'followers'] });
      queryClient.invalidateQueries({ queryKey: ['ngo', 'profile'] });
    },
  });
}

export const useAcceptFollowRequest = () => useFollowerAction(acceptFollowRequest);
export const useDeclineFollowRequest = () => useFollowerAction(declineFollowRequest);
export const useRemoveFollower = () => useFollowerAction(removeFollower);

// ---------------------------------------------------------------- Nursery followers

export function useNurseryFollowers(params: { status?: FollowStatus; q?: string } = {}) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: socialKeys.nurseryFollowers(params.status, params.q),
    queryFn: () => fetchNurseryFollowers(params),
    enabled: isAuthenticated,
  });
}

function useNurseryFollowerAction(fn: (followId: string) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nursery', 'followers'] });
      queryClient.invalidateQueries({ queryKey: ['nursery', 'profile'] });
    },
  });
}

export const useAcceptNurseryFollowRequest = () => useNurseryFollowerAction(acceptNurseryFollowRequest);
export const useDeclineNurseryFollowRequest = () => useNurseryFollowerAction(declineNurseryFollowRequest);
export const useRemoveNurseryFollower = () => useNurseryFollowerAction(removeNurseryFollower);

// ---------------------------------------------------------------- Portfolio

export function useMyPortfolio() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: socialKeys.portfolio,
    queryFn: fetchMyPortfolio,
    enabled: isAuthenticated,
  });
}

export function useNgoPortfolio(ngoId: string | undefined) {
  return useQuery({
    queryKey: socialKeys.ngoPortfolio(ngoId ?? ''),
    queryFn: () => fetchNgoPortfolio(ngoId as string),
    enabled: !!ngoId,
  });
}

function invalidatePortfolio(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: socialKeys.portfolio });
  queryClient.invalidateQueries({ queryKey: ['ngos', 'portfolio'] });
  queryClient.invalidateQueries({ queryKey: ['ngos', 'public'] });
}

export function useCreatePortfolioEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PortfolioInput) => createPortfolioEntry(input),
    onSuccess: () => invalidatePortfolio(queryClient),
  });
}

export function useUpdatePortfolioEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<PortfolioInput> }) =>
      updatePortfolioEntry(id, input),
    onSuccess: () => invalidatePortfolio(queryClient),
  });
}

export function useDeletePortfolioEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePortfolioEntry(id),
    onSuccess: () => invalidatePortfolio(queryClient),
  });
}

// ---------------------------------------------------------------- Notifications

export function useNotifications() {
  const { isAuthenticated } = useAuth();
  return useInfiniteQuery({
    queryKey: socialKeys.notifications,
    queryFn: ({ pageParam }) => fetchNotifications(pageParam),
    enabled: isAuthenticated,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useUnreadNotificationCount() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: socialKeys.unreadCount,
    queryFn: fetchUnreadCount,
    enabled: isAuthenticated,
    // The badge is ambient — poll rather than leaving it stale until the next screen change.
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.notifications });
      queryClient.invalidateQueries({ queryKey: socialKeys.unreadCount });
    },
  });
}

// ---------------------------------------------------------------- Moderation

export function useReportContent() {
  return useMutation({ mutationFn: reportContent });
}

export function useBlocks() {
  const { isAuthenticated } = useAuth();
  return useQuery({ queryKey: socialKeys.blocks, queryFn: fetchBlocks, enabled: isAuthenticated });
}

export function useBlockTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: blockTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.blocks });
      // Blocking removes their content from every feed, so nothing cached is trustworthy.
      queryClient.invalidateQueries({ queryKey: ['social'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['follows'] });
    },
  });
}

export function useUnblockTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: unblockTarget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.blocks });
      queryClient.invalidateQueries({ queryKey: ['social'] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useAdminReports(status?: ReportStatus) {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: socialKeys.adminReports(status),
    queryFn: () => fetchAdminReports({ status }),
    enabled: isAuthenticated,
  });
}

export function useActOnReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: ModerationAction; reason?: string }) =>
      actOnAdminReport(id, { action, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'actionLogs'] });
    },
  });
}

// ---------------------------------------------------------------- Stories

/**
 * Records a story view. Deliberately fire-and-forget: the viewer advances on a 5s timer and must
 * never wait on, or be interrupted by, a failed receipt.
 */
export function useMarkStoryViewed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markStoryViewed(id).catch(() => undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
    },
  });
}
