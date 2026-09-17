import { apiFetch } from './client';

// ---------- Moderation ----------

export type ReportTargetType = 'post' | 'story' | 'user' | 'ngo' | 'nursery' | 'corporate' | 'portfolio_entry';
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate'
  | 'misinformation'
  | 'nudity'
  | 'violence'
  | 'other';

/** Reason keys paired with the copy shown in the report sheet. */
export const REPORT_REASONS: { key: ReportReason; label: string; hint: string }[] = [
  { key: 'spam', label: 'Spam or misleading', hint: 'Repetitive, fake or commercial content' },
  { key: 'harassment', label: 'Harassment or bullying', hint: 'Targeting or intimidating someone' },
  { key: 'hate', label: 'Hate speech', hint: 'Attacks on a group or identity' },
  { key: 'misinformation', label: 'False information', hint: 'Misleading claims about impact or planting' },
  { key: 'nudity', label: 'Nudity or sexual content', hint: 'Not appropriate for this community' },
  { key: 'violence', label: 'Violence or harm', hint: 'Threats, cruelty or dangerous acts' },
  { key: 'other', label: 'Something else', hint: 'Tell us what is wrong' },
];

export async function reportContent(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}): Promise<void> {
  await apiFetch<void>('/api/reports', { method: 'POST', body: input });
}

export interface ApiBlock {
  id: string;
  createdAt: string;
  kind: 'user' | 'ngo';
  targetId: string;
  name: string;
  handle: string | null;
  avatarEmoji: string | null;
  logoUrl: string | null;
}

export async function fetchBlocks(): Promise<ApiBlock[]> {
  return apiFetch<ApiBlock[]>('/api/blocks');
}

export async function blockTarget(input: { userId?: string; ngoId?: string }): Promise<void> {
  await apiFetch<void>('/api/blocks', { method: 'POST', body: input });
}

export async function unblockTarget(input: { userId?: string; ngoId?: string }): Promise<void> {
  await apiFetch<void>('/api/blocks', { method: 'DELETE', body: input });
}

// ---------- Notifications ----------

export type NotificationType =
  | 'friend_request'
  | 'friend_request_accepted'
  | 'follow_request'
  | 'follow_accepted'
  | 'new_follower'
  | 'post_like'
  | 'new_post_from_followed'
  | 'drive_reminder'
  | 'report_resolved'
  | 'moderation_action'
  | 'reservation_requested'
  | 'reservation_fulfilled'
  | 'reservation_declined'
  | 'streak_at_risk'
  | 'streak_broken'
  | 'reengagement_nudge'
  | 'cart_abandoned'
  // ---- Marketplace order lifecycle (planter-facing) ----
  | 'order_placed'
  | 'order_confirmed'
  | 'order_out_for_delivery'
  | 'order_delivered'
  | 'order_cancelled'
  | 'order_ready_for_pickup'
  | 'order_picked_up'
  | 'order_plantation_verified'
  | 'order_fulfillment_today'
  | 'wishlist_back_in_stock'
  // ---- Nursery-flow (nursery-received) ----
  | 'stock_low'
  | 'stock_out_of_stock'
  | 'bulk_requirement_nearby'
  | 'bulk_requirement_response_received'
  | 'bulk_requirement_response_accepted'
  | 'sapling_planted'
  | 'nursery_tree_milestone'
  | 'nursery_impact_milestone';

export interface ApiNotification {
  id: string;
  type: NotificationType;
  postId: string | null;
  followId: string | null;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
  actor: {
    kind: 'user' | 'ngo' | 'nursery';
    id: string;
    name: string;
    imageUrl: string | null;
    handle: string | null;
    avatarEmoji?: string | null;
  } | null;
  postThumbnailUrl: string | null;
}

export async function fetchNotifications(
  cursor?: string,
): Promise<{ notifications: ApiNotification[]; nextCursor: string | null }> {
  const qs = cursor ? `?cursor=${cursor}` : '';
  return apiFetch(`/api/notifications${qs}`);
}

export async function fetchUnreadCount(): Promise<{ count: number }> {
  return apiFetch('/api/notifications/unread-count');
}

/** Omit `ids` to mark everything read. */
export async function markNotificationsRead(ids?: string[]): Promise<void> {
  await apiFetch<void>('/api/notifications/read', { method: 'POST', body: { ids } });
}

// ---------- Push registration ----------

export async function registerPushToken(token: string, platform: string): Promise<void> {
  await apiFetch<void>('/api/push-tokens', { method: 'POST', body: { token, platform } });
}

export async function removePushToken(token: string): Promise<void> {
  await apiFetch<void>(`/api/push-tokens/${encodeURIComponent(token)}`, { method: 'DELETE' });
}
