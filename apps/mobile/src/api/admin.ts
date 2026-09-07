import { apiFetch } from './client';

export interface ApiAdminOverview {
  usersByRole: Record<string, number>;
  ngosByStatus: Record<string, number>;
  nurseriesByStatus: Record<string, number>;
  corporatesByStatus: Record<string, number>;
  groupsCount: number;
  drivesCount: number;
  adoptedTreesCount: number;
  totalDonatedCents: number;
  blockedUsersCount: number;
  openReportsCount: number;
  treesPendingReviewCount: number;
}

export type NgoApprovalStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface ApiAdminNgo {
  id: string;
  orgName: string;
  description: string;
  website: string | null;
  contactPhone: string | null;
  status: NgoApprovalStatus;
  rejectionReason: string | null;
  createdAt: string;
  owner?: { id: string; email: string; name: string; handle: string };
}

export interface ApiAdminNgoSummary {
  drivesCount: number;
  campaignsCount: number;
  treesCount: number;
  totalRaisedCents: number;
}

export interface ApiAdminActionLog {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  createdAt: string;
  actor: { name: string; handle: string };
}

export interface AdminNgosFilter {
  status?: NgoApprovalStatus;
  q?: string;
  page?: number;
  take?: number;
}

export async function fetchAdminOverview(): Promise<ApiAdminOverview> {
  return apiFetch<ApiAdminOverview>('/api/admin/overview');
}

export async function fetchAdminNgos(filter: AdminNgosFilter = {}): Promise<{ total: number; ngos: ApiAdminNgo[] }> {
  return apiFetch(`/api/admin/ngos${toQueryString(filter)}`);
}

export async function fetchAdminNgoSummary(id: string): Promise<ApiAdminNgoSummary> {
  return apiFetch<ApiAdminNgoSummary>(`/api/admin/ngos/${id}/summary`);
}

export async function setAdminNgoStatus(
  id: string,
  input: { status: NgoApprovalStatus; rejectionReason?: string }
): Promise<ApiAdminNgo> {
  return apiFetch<ApiAdminNgo>(`/api/admin/ngos/${id}/status`, { method: 'PATCH', body: input });
}

// ---------- Nurseries / Corporates (same approval workflow as NGO) ----------

export interface ApiAdminNursery {
  id: string;
  nurseryName: string;
  description: string;
  city: string | null;
  contactPhone: string | null;
  status: NgoApprovalStatus;
  rejectionReason: string | null;
  createdAt: string;
  owner?: { id: string; email: string; name: string; handle: string };
}

export interface ApiAdminCorporate {
  id: string;
  companyName: string;
  description: string;
  city: string | null;
  industry: string | null;
  status: NgoApprovalStatus;
  rejectionReason: string | null;
  createdAt: string;
  owner?: { id: string; email: string; name: string; handle: string };
}

export interface AdminOrgFilter {
  status?: NgoApprovalStatus;
  q?: string;
  page?: number;
  take?: number;
}

function toQueryString<T extends object>(params: T) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchAdminNurseries(filter: AdminOrgFilter = {}): Promise<{ total: number; nurseries: ApiAdminNursery[] }> {
  return apiFetch(`/api/admin/nurseries${toQueryString(filter)}`);
}

export async function setAdminNurseryStatus(
  id: string,
  input: { status: NgoApprovalStatus; rejectionReason?: string }
): Promise<ApiAdminNursery> {
  return apiFetch<ApiAdminNursery>(`/api/admin/nurseries/${id}/status`, { method: 'PATCH', body: input });
}

export async function fetchAdminCorporates(filter: AdminOrgFilter = {}): Promise<{ total: number; corporates: ApiAdminCorporate[] }> {
  return apiFetch(`/api/admin/corporates${toQueryString(filter)}`);
}

export async function setAdminCorporateStatus(
  id: string,
  input: { status: NgoApprovalStatus; rejectionReason?: string }
): Promise<ApiAdminCorporate> {
  return apiFetch<ApiAdminCorporate>(`/api/admin/corporates/${id}/status`, { method: 'PATCH', body: input });
}

// ---------- Account search & blocking (User/NGO/Nursery/Corporate) ----------

export type AdminAccountType = 'user' | 'ngo' | 'nursery' | 'corporate';

export interface ApiAdminAccount {
  id: string;
  email: string;
  name: string;
  handle: string;
  role: AdminAccountType | 'admin' | 'group';
  isBlocked: boolean;
  blockedAt: string | null;
  blockedReason: string | null;
  createdAt: string;
  ngoProfile: { id: string; orgName: string; status: NgoApprovalStatus } | null;
  nurseryProfile: { id: string; nurseryName: string; status: NgoApprovalStatus } | null;
  corporateProfile: { id: string; companyName: string; status: NgoApprovalStatus } | null;
}

export async function searchAdminAccounts(
  filter: { q?: string; type?: AdminAccountType; page?: number; take?: number } = {}
): Promise<{ total: number; accounts: ApiAdminAccount[] }> {
  return apiFetch(`/api/admin/accounts${toQueryString(filter)}`);
}

export async function blockAdminAccount(userId: string, input: { reason?: string } = {}): Promise<ApiAdminAccount> {
  return apiFetch<ApiAdminAccount>(`/api/admin/accounts/${userId}/block`, { method: 'POST', body: input });
}

export async function unblockAdminAccount(userId: string): Promise<ApiAdminAccount> {
  return apiFetch<ApiAdminAccount>(`/api/admin/accounts/${userId}/unblock`, { method: 'POST' });
}

// ---------- AI tree-photo verification review queue ----------

export interface ApiAdminReviewTree {
  id: string;
  nickname: string;
  photoUrl: string | null;
  aiVerificationStatus: 'unverified' | 'verified' | 'rejected';
  createdAt: string;
  species: { commonName: string; emoji: string } | null;
  user: { id: string; name: string; handle: string; email: string } | null;
}

export async function fetchAdminTreeReviewQueue(params: { page?: number; take?: number } = {}): Promise<{ total: number; trees: ApiAdminReviewTree[] }> {
  return apiFetch(`/api/admin/trees/review-queue${toQueryString(params)}`);
}

export async function reviewAdminTree(id: string, decision: 'approve' | 'reject'): Promise<ApiAdminReviewTree> {
  return apiFetch<ApiAdminReviewTree>(`/api/admin/trees/${id}/review`, { method: 'PATCH', body: { decision } });
}

// ---------- Ops oversight: Drives / Donations / Orders ----------

export async function fetchAdminDrives(params: { page?: number; take?: number } = {}): Promise<{ total: number; drives: any[] }> {
  return apiFetch(`/api/admin/drives${toQueryString(params)}`);
}

export async function cancelAdminDrive(id: string, reason?: string): Promise<any> {
  return apiFetch(`/api/admin/drives/${id}/cancel`, { method: 'PATCH', body: { reason } });
}

export async function fetchAdminDonations(params: { page?: number; take?: number } = {}): Promise<{ total: number; donations: any[] }> {
  return apiFetch(`/api/admin/donations${toQueryString(params)}`);
}

export async function refundAdminDonation(id: string, reason?: string): Promise<any> {
  return apiFetch(`/api/admin/donations/${id}/refund`, { method: 'PATCH', body: { reason } });
}

export async function fetchAdminOrders(params: { page?: number; take?: number } = {}): Promise<{ total: number; orders: any[] }> {
  return apiFetch(`/api/admin/orders${toQueryString(params)}`);
}

export async function refundAdminOrder(id: string, reason?: string): Promise<any> {
  return apiFetch(`/api/admin/orders/${id}/refund`, { method: 'PATCH', body: { reason } });
}

// ---------- Catalog management ----------

export type AdminCatalogModel = 'species' | 'achievements' | 'challenges' | 'missions' | 'themes' | 'decorations';

export async function fetchAdminCatalog(model: AdminCatalogModel): Promise<any[]> {
  return apiFetch(`/api/admin/catalog/${model}`);
}

export async function createAdminCatalogItem(model: AdminCatalogModel, body: Record<string, unknown>): Promise<any> {
  return apiFetch(`/api/admin/catalog/${model}`, { method: 'POST', body });
}

export async function updateAdminCatalogItem(model: AdminCatalogModel, id: string, body: Record<string, unknown>): Promise<any> {
  return apiFetch(`/api/admin/catalog/${model}/${id}`, { method: 'PATCH', body });
}

export interface AdminActionLogsParams {
  page?: number;
  take?: number;
}

export async function fetchAdminActionLogs(
  params: AdminActionLogsParams = {}
): Promise<{ total: number; logs: ApiAdminActionLog[] }> {
  return apiFetch(`/api/admin/action-logs${toQueryString(params)}`);
}


// ---------- Content moderation ----------

export type ReportStatus = 'open' | 'actioned' | 'dismissed';
export type ReportTargetTypeFilter = 'accounts' | 'post' | 'story' | 'user' | 'ngo' | 'nursery' | 'corporate' | 'portfolio_entry' | 'order_review';
export type ModerationAction = 'hide' | 'unhide' | 'delete' | 'dismiss' | 'block_account';

export interface ApiAdminReport {
  id: string;
  targetType: 'post' | 'story' | 'user' | 'ngo' | 'nursery' | 'corporate' | 'portfolio_entry' | 'order_review';
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reviewedAt: string | null;
  reporter: { id: string; name: string; handle: string } | null;
  reviewedBy: { id: string; name: string } | null;
  /** Null once the reported post has been deleted — the report row outlives it. */
  post: {
    id: string;
    caption: string | null;
    isHidden: boolean;
    thumbnailUrl: string | null;
    authorName: string | null;
  } | null;
  /** Populated only for account-type reports (user/ngo/nursery/corporate). */
  account: { userId: string; name: string; handle: string; role: string; isBlocked: boolean } | null;
}

export async function fetchAdminReports(
  params: { status?: ReportStatus; targetType?: ReportTargetTypeFilter; page?: number; take?: number } = {}
): Promise<{ total: number; openCount: number; accountOpenCount: number; reports: ApiAdminReport[] }> {
  return apiFetch(`/api/admin/reports${toQueryString(params)}`);
}

export async function actOnAdminReport(
  id: string,
  input: { action: ModerationAction; reason?: string }
): Promise<void> {
  await apiFetch<void>(`/api/admin/reports/${id}`, { method: 'PATCH', body: input });
}
