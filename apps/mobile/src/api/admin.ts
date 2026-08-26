import { apiFetch } from './client';

export interface ApiAdminOverview {
  usersByRole: Record<string, number>;
  ngosByStatus: Record<string, number>;
  drivesCount: number;
  adoptedTreesCount: number;
  totalDonatedCents: number;
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
  const query = new URLSearchParams();
  Object.entries(filter).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const qs = query.toString();
  return apiFetch(`/api/admin/ngos${qs ? `?${qs}` : ''}`);
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

export interface AdminActionLogsParams {
  page?: number;
  take?: number;
}

export async function fetchAdminActionLogs(
  params: AdminActionLogsParams = {}
): Promise<{ total: number; logs: ApiAdminActionLog[] }> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const qs = query.toString();
  return apiFetch(`/api/admin/action-logs${qs ? `?${qs}` : ''}`);
}


// ---------- Content moderation ----------

export type ReportStatus = 'open' | 'actioned' | 'dismissed';
export type ModerationAction = 'hide' | 'unhide' | 'delete' | 'dismiss';

export interface ApiAdminReport {
  id: string;
  targetType: 'post' | 'story' | 'user' | 'ngo' | 'portfolio_entry';
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
}

export async function fetchAdminReports(
  params: { status?: ReportStatus; page?: number; take?: number } = {}
): Promise<{ total: number; openCount: number; reports: ApiAdminReport[] }> {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const qs = query.toString();
  return apiFetch(`/api/admin/reports${qs ? `?${qs}` : ''}`);
}

export async function actOnAdminReport(
  id: string,
  input: { action: ModerationAction; reason?: string }
): Promise<void> {
  await apiFetch<void>(`/api/admin/reports/${id}`, { method: 'PATCH', body: input });
}
