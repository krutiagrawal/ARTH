import React, { useCallback, useEffect, useMemo } from 'react';
import { View, StyleSheet, SectionList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { FONTS } from '../constants/typography';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { EmptyState } from '../components/common/EmptyState';
import { resolveMediaUrl } from '../api/client';
import type { ApiNotification } from '../api/social';
import { useMarkNotificationsRead, useNotifications } from '../hooks/useSocialQueries';
import { useAuth } from '../context/AuthContext';

const ORDER_NOTIFICATION_TYPES = new Set([
  'order_placed',
  'order_confirmed',
  'order_out_for_delivery',
  'order_delivered',
  'order_cancelled',
  'order_ready_for_pickup',
  'order_picked_up',
  'order_plantation_verified',
  'order_fulfillment_today',
]);

/** One line of copy per notification type. The actor's name is rendered separately, in bold. */
function describe(n: ApiNotification): string {
  switch (n.type) {
    case 'friend_request':
      return 'wants to be your friend';
    case 'friend_request_accepted':
      return 'accepted your friend request';
    case 'follow_request':
      return 'would love to follow you 👋 Take a look and say yes?';
    case 'follow_accepted':
      return 'accepted your follow request 🤝';
    case 'new_follower':
      return 'is now following you 🎉 Your circle is growing!';
    case 'post_like':
      return 'loved your post ❤️';
    case 'tree_observation_logged':
      return 'added an observation on your tree';
    case 'tree_update_received':
      return 'sent an update on your tree – review it';
    case 'tree_update_decided':
      return (n.data as any)?.decision === 'accepted' ? 'accepted your tree update' : 'reviewed your tree update';
    case 'new_post_from_followed':
      return 'shared something new 📸 Come and see!';
    case 'drive_reminder':
      // A cancelled drive carries a full, ready-written message (apology + the NGO's reason).
      return (n.data as any)?.kind === 'cancelled' && (n.data as any)?.message
        ? (n.data as any).message
        : (n.data as any)?.kind === 'relaunched' && (n.data as any)?.message
          ? (n.data as any).message
          : 'has a drive coming up 🌳 Hope to see you there!';
    case 'report_resolved':
      return 'Your report has been reviewed';
    case 'moderation_action':
      return 'Action was taken on your content';
    case 'reservation_requested':
      return 'is asking for saplings from your stock 🌿 Ready to help?';
    case 'reservation_fulfilled':
      return 'fulfilled your sapling request';
    case 'reservation_declined':
      return 'declined your sapling request';
    case 'streak_at_risk':
      return 'Your streak needs you today 🔥';
    case 'streak_broken':
      return 'Your streak broke – start a new one 💔';
    case 'reengagement_nudge':
      return "We've missed you 🌳";
    case 'cart_abandoned':
      return 'You left something in your cart 🛒';
    // ---- Marketplace order lifecycle (planter-facing) ----
    case 'order_placed':
      return 'placed an order with you 🛒 Time to get packing!';
    case 'order_confirmed':
      return (n.data as any)?.stage === 'packed' ? 'Your order was packed 📦' : 'Your order was confirmed';
    case 'order_out_for_delivery':
      return 'Your order is on its way';
    case 'order_delivered':
      return 'Your order has arrived – view your planting guide 🌱';
    case 'order_cancelled':
      return 'Your order was cancelled and refunded';
    case 'order_ready_for_pickup':
      return 'Your order is ready for pickup';
    case 'order_picked_up':
      return 'Your order is ready – view your planting guide 🌱';
    case 'order_plantation_verified':
      return "This order's saplings are now verified ARTH Trees 🌳";
    case 'order_fulfillment_today':
      return 'You have an order due today 📦 Don\'t keep them waiting!';
    case 'wishlist_back_in_stock':
      return 'A species on your wishlist is back in stock';
    // ---- Nursery-flow (nursery-received) ----
    case 'stock_low':
      return 'One of your species is running low 📉 Time to restock!';
    case 'stock_out_of_stock':
      return 'A species just sold out 🚫 Restock to keep the orders coming!';
    case 'bulk_requirement_nearby':
      return 'An NGO nearby needs saplings 🌿 Could you help them grow?';
    case 'bulk_requirement_response_received':
      if ((n.data as any)?.stage === 'handed_off') {
        const qty = (n.data as any)?.quantityOffered ? `${Number((n.data as any).quantityOffered).toLocaleString('en-IN')} saplings` : 'the saplings';
        return `${(n.data as any)?.nurseryName ?? 'A nursery'} handed off ${qty} 📦 Confirm receipt with the handoff code to complete it!`;
      }
      return `A nursery offered to supply ${(n.data as any)?.quantityOffered ? `${Number((n.data as any).quantityOffered).toLocaleString('en-IN')} saplings` : 'your bulk requirement'} 🌱 See if it fits!`;
    case 'bulk_requirement_response_accepted':
      return 'Your offer was accepted 🎉 Those saplings are headed to a great home!';
    case 'bulk_requirement_updated':
      return `✏️ ${(n.data as any)?.message ?? 'An NGO changed a bulk requirement you offered on.'}`;
    case 'sapling_planted':
      return 'A sapling from your nursery just got planted 🌱 Your impact is taking root!';
    case 'nursery_tree_milestone':
      return 'A tree you supplied hit a growth milestone 🌳 Look how it grows!';
    case 'nursery_impact_milestone':
      return 'You hit an impact milestone 🏆 Congratulations – that\'s a lot of green!';
    // ---- NGO-flow (NGO-received) ----
    case 'ngo_donation_received':
      return `just donated ₹${(((n.data as any)?.amountCents ?? 0) / 100).toLocaleString('en-IN')} to “${(n.data as any)?.campaignTitle ?? 'your campaign'}” 💚 Someone believes in your work!`;
    case 'ngo_drive_rsvp':
      return (n.data as any)?.cancelled
        ? `had to cancel their RSVP${(n.data as any)?.driveTitle ? ` to “${(n.data as any).driveTitle}”` : ' to your drive'} 😕`
        : `is joining${(n.data as any)?.driveTitle ? ` “${(n.data as any).driveTitle}”` : ' your drive'} 🙌 One more planter on the team!`;
    case 'ngo_tree_adopted':
      return `adopted ${(n.data as any)?.treeNickname ?? 'a tree'} 🌳 A new tree parent just joined the family!`;
    case 'ngo_tree_released': {
      const d = n.data as any;
      return `released ${d?.treeNickname ?? 'a tree'}${d?.reason ? ` (${d.reason})` : ''} 🍃 It's open for adoption again.`;
    }
    case 'ngo_health_check_due': {
      const d = n.data as any;
      const days = d?.thresholdDays ?? 30;
      const where = d?.placeName ? ` – ${d.placeName}` : '';
      return d?.count > 1
        ? `🩺 ${d.count} trees are due for their ${days}-day health check${where} – time for a visit!`
        : `🩺 A tree is due for its ${days}-day health check${where} – time for a visit!`;
    }
    case 'ngo_streak_at_risk':
      return 'Your Updates Streak is on the line 🔥 Post an update this week to keep it alive!';
    case 'ngo_streak_broken':
      return 'Your Updates Streak broke 💔 Every great streak starts again – post an update to begin a new one!';
    case 'ngo_impact_milestone':
      return 'You just reached a new Growth Level 🏆 Look how far you\'ve come!';
    case 'bulk_requirement_deadline_passed':
      return 'Time ran out on a bulk requirement ⏰ Reschedule it to get offers flowing again.';
    default:
      return 'sent you an update';
  }
}

function iconFor(n: ApiNotification): string {
  switch (n.type) {
    case 'friend_request':
      return '🧑‍🤝‍🧑';
    case 'friend_request_accepted':
      return '🌱';
    case 'follow_request':
      return '📬';
    case 'follow_accepted':
    case 'new_follower':
      return '🌱';
    case 'post_like':
      return '❤️';
    case 'new_post_from_followed':
      return '📸';
    case 'drive_reminder':
      return (n.data as any)?.kind === 'cancelled' ? '💔' : '📅';
    case 'reservation_requested':
      return '🤝';
    case 'reservation_fulfilled':
      return '🎁';
    case 'reservation_declined':
      return '❌';
    case 'streak_at_risk':
      return '🔥';
    case 'streak_broken':
      return '💔';
    case 'reengagement_nudge':
      return '🌳';
    case 'cart_abandoned':
      return '🛒';
    case 'order_placed':
      return '🛒';
    case 'order_confirmed':
      return '📦';
    case 'order_out_for_delivery':
      return '🚴';
    case 'order_delivered':
      return '🌱';
    case 'order_cancelled':
      return '🚫';
    case 'order_ready_for_pickup':
      return '📦';
    case 'order_picked_up':
      return '🌱';
    case 'order_plantation_verified':
      return '🌳';
    case 'order_fulfillment_today':
      return '📅';
    case 'wishlist_back_in_stock':
      return '🌱';
    case 'stock_low':
      return '⚠️';
    case 'stock_out_of_stock':
      return '🚫';
    case 'bulk_requirement_nearby':
      return '🤝';
    case 'bulk_requirement_response_received':
      return '🤝';
    case 'bulk_requirement_response_accepted':
      return '✅';
    case 'bulk_requirement_updated':
      return '✏️';
    case 'sapling_planted':
      return '🌱';
    case 'nursery_tree_milestone':
      return '🌳';
    case 'nursery_impact_milestone':
      return '🏆';
    case 'ngo_donation_received':
      return '💸';
    case 'ngo_drive_rsvp':
      return '🤝';
    case 'ngo_tree_adopted':
    case 'ngo_tree_released':
      return '🌳';
    case 'tree_observation_logged':
    case 'tree_update_received':
    case 'tree_update_decided':
      return '🌳';
    case 'ngo_health_check_due':
      return '🩺';
    case 'ngo_streak_at_risk':
      return '🔥';
    case 'ngo_streak_broken':
      return '💔';
    case 'ngo_impact_milestone':
      return '🏆';
    case 'bulk_requirement_deadline_passed':
      return '⏰';
    default:
      return '🛡️';
  }
}

/** "Today" / "Yesterday" / "12 March" – the section headings. */
function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(today) - startOfDay(date)) / 86_400_000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
}

interface Presentation {
  /** Small uppercase tag above the text - what kind of thing this is. */
  label: string;
  /** Colours the icon tile, the tag, the accent bar and the call to action. */
  color: string;
  /** A big figure worth seeing at a glance (an amount, a quantity). */
  highlight?: string;
  /** The thing it is about: a campaign, a drive, a tree. */
  subject?: string;
  /** A message someone left, shown as a quote. */
  quote?: string;
  /** What tapping does, when it goes somewhere specific. */
  cta?: string;
}

/** Look and feel per notification: a colour family, a label and the one detail that matters. */
function present(n: ApiNotification): Presentation {
  const d = (n.data ?? {}) as any;
  const rupees = (cents?: number) => `₹${((cents ?? 0) / 100).toLocaleString('en-IN')}`;

  switch (n.type) {
    // ---- money & supporters ----
    case 'ngo_donation_received':
      return { label: 'Donation', color: COLORS.forest, highlight: `💰 ${rupees(d.amountCents)}`, subject: d.campaignTitle, quote: d.message || undefined, cta: 'View campaign' };
    case 'ngo_drive_rsvp':
      return { label: d.cancelled ? 'RSVP cancelled' : 'New RSVP', color: d.cancelled ? COLORS.coral : COLORS.golden, subject: d.driveTitle, cta: 'View drive' };
    case 'ngo_tree_adopted':
      return { label: 'Tree adopted', color: COLORS.forest, subject: d.treeNickname ? `🌳 ${d.treeNickname}` : undefined };
    case 'ngo_tree_released':
      return { label: 'Tree released', color: COLORS.earth, subject: d.treeNickname ? `🌳 ${d.treeNickname}` : undefined };
    case 'drive_reminder':
      return d.kind === 'cancelled'
        ? { label: 'Drive cancelled', color: COLORS.coral, subject: d.driveTitle, cta: 'View drive' }
        : d.kind === 'relaunched'
          ? { label: 'Drive is back on', color: COLORS.forest, subject: d.driveTitle, cta: 'RSVP again' }
          : { label: 'Drive reminder', color: COLORS.golden, subject: d.driveTitle, cta: 'View drive' };

    // ---- bulk saplings ----
    case 'bulk_requirement_nearby':
      return { label: 'Bulk request nearby', color: COLORS.golden, cta: 'View requirement' };
    case 'bulk_requirement_response_received':
      if (d.stage === 'handed_off') {
        return { label: 'Saplings handed off', color: COLORS.forest, highlight: d.quantityOffered ? `🌱 ${Number(d.quantityOffered).toLocaleString('en-IN')} saplings` : undefined, cta: 'Confirm receipt' };
      }
      return { label: 'New offer', color: COLORS.golden, highlight: d.quantityOffered ? `🌱 ${Number(d.quantityOffered).toLocaleString('en-IN')} saplings` : undefined, cta: 'Review offer' };
    case 'bulk_requirement_response_accepted':
      return { label: 'Offer accepted', color: COLORS.forest, highlight: d.quantityOffered ? `🌱 ${Number(d.quantityOffered).toLocaleString('en-IN')} saplings` : undefined, cta: 'Prepare handoff' };
    case 'bulk_requirement_updated':
      return { label: 'Requirement updated', color: COLORS.earth, cta: 'See changes' };
    case 'bulk_requirement_deadline_passed':
      return { label: 'Deadline passed', color: COLORS.coral, cta: 'Reschedule' };

    // ---- nursery stock & orders ----
    case 'stock_low':
      return { label: 'Low stock', color: COLORS.golden, cta: 'Manage stock' };
    case 'stock_out_of_stock':
      return { label: 'Out of stock', color: COLORS.coral, cta: 'Manage stock' };
    case 'reservation_requested':
      return { label: 'Sapling request', color: COLORS.golden, cta: 'Review request' };
    case 'sapling_planted':
      return { label: 'Sapling planted', color: COLORS.forest };
    case 'nursery_tree_milestone':
      return { label: 'Growth milestone', color: COLORS.forest };
    case 'nursery_impact_milestone':
    case 'ngo_impact_milestone':
      return { label: 'Milestone', color: COLORS.golden, cta: n.type === 'ngo_impact_milestone' ? 'See badges' : undefined };
    case 'order_placed':
    case 'order_fulfillment_today':
      return { label: n.type === 'order_placed' ? 'New order' : 'Due today', color: COLORS.xpBlue, cta: 'View order' };
    case 'order_cancelled':
      return { label: 'Order cancelled', color: COLORS.coral, cta: 'View order' };
    case 'order_confirmed':
    case 'order_out_for_delivery':
    case 'order_delivered':
    case 'order_ready_for_pickup':
    case 'order_picked_up':
    case 'order_plantation_verified':
      return { label: 'Your order', color: COLORS.xpBlue, cta: 'View order' };

    // ---- care & streaks ----
    case 'ngo_health_check_due':
      return { label: 'Health check due', color: COLORS.sage, cta: 'Log checks' };
    case 'ngo_streak_at_risk':
    case 'streak_at_risk':
      return { label: 'Streak at risk', color: COLORS.streakGold, cta: 'Keep it alive' };
    case 'ngo_streak_broken':
    case 'streak_broken':
      return { label: 'Streak broken', color: COLORS.coral };

    // ---- people ----
    case 'follow_request':
      return { label: 'Follow request', color: COLORS.sage, cta: 'Review request' };
    case 'friend_request':
      return { label: 'Friend request', color: COLORS.sage, cta: 'Review request' };
    case 'new_follower':
    case 'follow_accepted':
    case 'friend_request_accepted':
      return { label: 'New connection', color: COLORS.sage };
    case 'post_like':
      return { label: 'Like', color: COLORS.coral };
    case 'new_post_from_followed':
      return { label: 'New post', color: COLORS.sage };
    case 'tree_observation_logged':
    case 'tree_update_received':
    case 'tree_update_decided':
      return { label: 'Tree update', color: COLORS.forest };

    case 'report_resolved':
    case 'moderation_action':
      return { label: 'Moderation', color: COLORS.earth };
    default:
      return { label: 'Update', color: COLORS.earth };
  }
}

/** "now" / "12 min ago" / "3 h ago" for today, a clock time otherwise (the section header gives the day). */
function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 6) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: ApiNotification;
  onPress: () => void;
}) {
  const actorImage = resolveMediaUrl(notification.actor?.imageUrl);
  const thumb = resolveMediaUrl(notification.postThumbnailUrl);
  const look = present(notification);
  // Types with no actor (system-generated, not from another user) read as a full sentence on their own.
  const standalone =
    notification.type === 'report_resolved' ||
    notification.type === 'moderation_action' ||
    notification.type === 'streak_at_risk' ||
    notification.type === 'streak_broken' ||
    notification.type === 'reengagement_nudge' ||
    notification.type === 'cart_abandoned' ||
    notification.type === 'order_confirmed' ||
    notification.type === 'order_out_for_delivery' ||
    notification.type === 'order_delivered' ||
    notification.type === 'order_cancelled' ||
    notification.type === 'order_ready_for_pickup' ||
    notification.type === 'order_picked_up' ||
    notification.type === 'order_plantation_verified' ||
    notification.type === 'wishlist_back_in_stock' ||
    notification.type === 'stock_low' ||
    notification.type === 'stock_out_of_stock' ||
    notification.type === 'bulk_requirement_nearby' ||
    notification.type === 'bulk_requirement_response_accepted' ||
    notification.type === 'bulk_requirement_updated' ||
    notification.type === 'sapling_planted' ||
    notification.type === 'nursery_tree_milestone' ||
    notification.type === 'nursery_impact_milestone' ||
    notification.type === 'order_fulfillment_today' ||
    notification.type === 'bulk_requirement_response_received' ||
    notification.type === 'ngo_health_check_due' ||
    notification.type === 'ngo_streak_at_risk' ||
    notification.type === 'ngo_streak_broken' ||
    notification.type === 'ngo_impact_milestone' ||
    notification.type === 'bulk_requirement_deadline_passed';

  return (
    <TouchableOpacity
      style={[styles.row, { borderColor: notification.read ? 'rgba(107, 68, 35, 0.25)' : `${look.color}88` }, !notification.read && { backgroundColor: `${look.color}12` }]}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={[styles.accent, { backgroundColor: look.color, opacity: notification.read ? 0.35 : 1 }]} />

      <View style={[styles.tile, { backgroundColor: `${look.color}26` }]}>
        {actorImage ? (
          <Image source={{ uri: actorImage }} style={styles.tileImage} />
        ) : (
          <Text style={styles.tileEmoji}>{notification.actor?.avatarEmoji ?? iconFor(notification)}</Text>
        )}
        {(actorImage || notification.actor?.avatarEmoji) && (
          <View style={[styles.typeBadge, { backgroundColor: look.color }]}>
            <Text style={styles.typeBadgeText}>{iconFor(notification)}</Text>
          </View>
        )}
      </View>

      <View style={styles.rowText}>
        <View style={styles.topLine}>
          <Text style={[styles.label, { color: look.color }]} numberOfLines={1}>{look.label}</Text>
          <Text style={styles.time}>{timeAgo(notification.createdAt)}</Text>
        </View>

        <Text style={styles.body}>
          {!standalone && notification.actor ? <Text style={styles.actorName}>{notification.actor.name} </Text> : null}
          {describe(notification)}
        </Text>

        {look.highlight || look.subject ? (
          <View style={styles.detailRow}>
            {look.highlight ? (
              <View style={[styles.highlight, { backgroundColor: `${look.color}22` }]}>
                <Text style={[styles.highlightText, { color: look.color }]}>{look.highlight}</Text>
              </View>
            ) : null}
            {look.subject ? <Text style={styles.subject} numberOfLines={1}>{look.subject}</Text> : null}
          </View>
        ) : null}

        {look.quote ? (
          <View style={[styles.quote, { borderLeftColor: look.color }]}>
            <Text style={styles.quoteText} numberOfLines={3}>“{look.quote}”</Text>
          </View>
        ) : null}

        {look.cta ? <Text style={[styles.cta, { color: look.color }]}>{look.cta} ›</Text> : null}
      </View>

      {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} /> : null}
      {!notification.read && <View style={[styles.unreadDot, { backgroundColor: look.color }]} />}
    </TouchableOpacity>
  );
}

/**
 * The notification centre, shared by all three roles.
 *
 * Everything is marked read on open rather than per-row: the badge is the thing people act on,
 * and leaving it lit after they have plainly seen the list is the more annoying failure mode.
 */
export function NotificationsScreen({ navigation }: any) {
  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useNotifications();
  const markRead = useMarkNotificationsRead();
  const { user } = useAuth();
  const isNursery = user?.role === 'nursery';

  const notifications = useMemo(
    () => data?.pages.flatMap((p) => p.notifications) ?? [],
    [data],
  );

  useEffect(() => {
    if (notifications.some((n) => !n.read)) markRead.mutate(undefined);
    // Runs once per set of loaded notifications, not per render.
  }, [notifications.length]);

  const sections = useMemo(() => {
    const groups = new Map<string, ApiNotification[]>();
    for (const n of notifications) {
      const key = dayLabel(n.createdAt);
      const list = groups.get(key);
      if (list) list.push(n);
      else groups.set(key, [n]);
    }
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [notifications]);

  const openTarget = useCallback(
    (n: ApiNotification) => {
      if (n.postId) {
        navigation.navigate('PostDetail', { postId: n.postId });
        return;
      }
      if (n.type === 'tree_observation_logged' || n.type === 'tree_update_received' || n.type === 'tree_update_decided') {
        const d = n.data as any;
        if (d?.treeId) navigation.navigate('TreePassport', { kind: 'tree', id: d.treeId });
        else if (d?.plantedTreeId) navigation.navigate('TreePassport', { kind: 'planted-tree', id: d.plantedTreeId });
        return;
      }
      // Nurseries are the only recipients of a request notification; individual planters are the
      // only recipients of a fulfilled/declined one – the type alone is enough to route correctly.
      if (n.type === 'reservation_requested') {
        navigation.navigate('NurseryReservations');
        return;
      }
      if (n.type === 'reservation_fulfilled' || n.type === 'reservation_declined') {
        navigation.navigate('MySaplingReservations');
        return;
      }
      if (n.type === 'follow_request') {
        navigation.navigate(isNursery ? 'NurseryFollowers' : 'NgoFollowerRequests');
        return;
      }
      if (n.type === 'friend_request') {
        navigation.navigate('FriendsList', { mode: 'requests' });
        return;
      }
      if (n.type === 'friend_request_accepted' && n.actor) {
        navigation.navigate('UserPublicProfile', { userId: n.actor.id });
        return;
      }
      if (n.type === 'cart_abandoned') {
        navigation.navigate('Cart');
        return;
      }
      if (n.type === 'wishlist_back_in_stock') {
        navigation.navigate('Wishlist');
        return;
      }
      if (n.type === 'stock_low' || n.type === 'stock_out_of_stock') {
        navigation.navigate('NurseryStock');
        return;
      }
      if (n.type === 'bulk_requirement_nearby' || n.type === 'bulk_requirement_response_accepted' || n.type === 'bulk_requirement_updated') {
        const requirementId = (n.data as any)?.requirementId;
        if (requirementId) navigation.navigate('NurseryBulkRequirementDetail', { requirementId });
        else navigation.navigate('NurseryBulkRequirements');
        return;
      }
      if (n.type === 'bulk_requirement_response_received') {
        navigation.navigate('NgoBulkRequirements');
        return;
      }
      if (n.type === 'bulk_requirement_deadline_passed') {
        const requirementId = (n.data as any)?.requirementId;
        navigation.navigate('NgoBulkRequirements', requirementId ? { openRequirementId: requirementId } : undefined);
        return;
      }
      if (
        n.type === 'sapling_planted' ||
        n.type === 'nursery_tree_milestone' ||
        n.type === 'nursery_impact_milestone'
      ) {
        navigation.navigate('NurseryImpact');
        return;
      }
      if (n.type === 'ngo_donation_received') {
        navigation.navigate('NgoDonations');
        return;
      }
      if (n.type === 'ngo_drive_rsvp' || n.type === 'drive_reminder') {
        const driveId = (n.data as any)?.driveId;
        if (driveId) navigation.navigate('DriveDetail', { driveId });
        return;
      }
      if (n.type === 'streak_at_risk' || n.type === 'streak_broken') {
        navigation.navigate('StreakProtection');
        return;
      }
      if (n.type === 'ngo_health_check_due') {
        const d = n.data as any;
        if (d?.treeId) {
          navigation.navigate('NgoTreeDetail', { treeId: d.treeId });
        } else {
          // A zone, a plantation's unzoned trees (zoneId null + driveId), or independent plantings (both null).
          navigation.navigate('NgoZoneTrees', { zoneId: d?.zoneId ?? null, zoneName: d?.placeName ?? 'Trees', driveId: d?.driveId ?? null });
        }
        return;
      }
      if (n.type === 'ngo_streak_at_risk' || n.type === 'ngo_streak_broken' || n.type === 'ngo_impact_milestone') {
        navigation.navigate('NgoStreakBadges');
        return;
      }
      if (ORDER_NOTIFICATION_TYPES.has(n.type)) {
        const orderId = (n.data as any)?.orderId;
        if (orderId) {
          navigation.navigate(isNursery ? 'NurseryOrderDetail' : 'OrderDetail', { orderId });
        } else {
          navigation.navigate(isNursery ? 'NurseryOrders' : 'MyOrders');
        }
        return;
      }
      if (n.actor?.kind === 'ngo') {
        navigation.navigate('NgoPublicProfile', { ngoId: n.actor.id });
        return;
      }
      if (n.actor?.kind === 'nursery') {
        navigation.navigate('NurseryPublicProfile', { nurseryId: n.actor.id });
      }
    },
    [navigation, isNursery],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Notifications" onBack={() => navigation.goBack()} />

      {isLoading ? (
        <View style={styles.centre}>
          <ActivityIndicator color={COLORS.forest} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isRefetching}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.6}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <NotificationRow notification={item} onPress={() => openTarget(item)} />
          )}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={COLORS.forest} />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="🔔"
              title="Nothing yet"
              body="Follows, likes and updates from the NGOs you follow will show up here."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: SPACING.md, paddingBottom: SPACING.xl },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginTop: SPACING.md,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5 },
  tile: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileImage: { width: '100%', height: '100%', borderRadius: 16 },
  tileEmoji: { fontSize: 24 },
  typeBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: { fontSize: 11 },
  rowText: { flex: 1, gap: 4 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { flex: 1, fontSize: 10, fontWeight: '900', letterSpacing: 0.9, textTransform: 'uppercase' },
  time: { fontSize: 11, color: COLORS.textMuted },
  body: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
  actorName: { fontFamily: FONTS.display, color: COLORS.textPrimary },
  detailRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  highlight: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 3 },
  highlightText: { fontSize: 14, fontWeight: '900' },
  subject: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  quote: { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 2, marginTop: 2 },
  quoteText: { fontSize: 13, lineHeight: 18, fontStyle: 'italic', color: COLORS.textPrimary },
  cta: { fontSize: 12, fontWeight: '800', marginTop: 4 },
  thumb: { width: 44, height: 44, borderRadius: RADIUS.sm },
  unreadDot: { position: 'absolute', top: 12, right: 10, width: 9, height: 9, borderRadius: 5 },
  footer: { marginVertical: SPACING.md },
});
