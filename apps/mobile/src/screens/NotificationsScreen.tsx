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
      return 'asked to follow you';
    case 'follow_accepted':
      return 'accepted your follow request';
    case 'new_follower':
      return 'started following you';
    case 'post_like':
      return 'liked your post';
    case 'new_post_from_followed':
      return 'shared a new update';
    case 'drive_reminder':
      return 'has a drive coming up';
    case 'report_resolved':
      return 'Your report has been reviewed';
    case 'moderation_action':
      return 'Action was taken on your content';
    case 'reservation_requested':
      return 'requested saplings from your stock';
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
      return 'placed a new order with you';
    case 'order_confirmed':
      return (n.data as any)?.stage === 'packed' ? 'Your order was packed 📦' : 'Your order was confirmed';
    case 'order_out_for_delivery':
      return 'Your order is on its way';
    case 'order_delivered':
      return 'Your order has arrived — view your planting guide 🌱';
    case 'order_cancelled':
      return 'Your order was cancelled and refunded';
    case 'order_ready_for_pickup':
      return 'Your order is ready for pickup';
    case 'order_picked_up':
      return 'Your order is ready — view your planting guide 🌱';
    case 'order_plantation_verified':
      return "This order's saplings are now verified ARTH Trees 🌳";
    case 'order_fulfillment_today':
      return 'You have an order due today';
    case 'wishlist_back_in_stock':
      return 'A species on your wishlist is back in stock';
    // ---- Nursery-flow (nursery-received) ----
    case 'stock_low':
      return 'One of your species is running low on stock';
    case 'stock_out_of_stock':
      return 'One of your species just ran out of stock';
    case 'bulk_requirement_nearby':
      return 'An NGO nearby is looking for saplings';
    case 'bulk_requirement_response_received':
      return 'A nursery offered to supply your bulk requirement';
    case 'bulk_requirement_response_accepted':
      return 'Your bulk-supply offer was accepted';
    case 'sapling_planted':
      return 'A sapling you supplied was planted';
    case 'nursery_tree_milestone':
      return 'A tree you supplied hit a growth milestone 🌳';
    case 'nursery_impact_milestone':
      return 'You hit an impact milestone 🏆';
    // ---- NGO-flow (NGO-received) ----
    case 'ngo_donation_received':
      return `donated ₹${(((n.data as any)?.amountCents ?? 0) / 100).toLocaleString('en-IN')} to your campaign`;
    case 'ngo_drive_rsvp':
      return "RSVP'd to your drive";
    case 'ngo_tree_adopted':
      return 'adopted a tree from you';
    case 'ngo_streak_at_risk':
      return 'Your Updates Streak needs you this week 🔥';
    case 'ngo_streak_broken':
      return 'Your Updates Streak broke – start a new one 💔';
    case 'ngo_impact_milestone':
      return 'You hit a Growth Level milestone 🏆';
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
      return '📅';
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
      return '🌳';
    case 'ngo_streak_at_risk':
      return '🔥';
    case 'ngo_streak_broken':
      return '💔';
    case 'ngo_impact_milestone':
      return '🏆';
    default:
      return '🛡️';
  }
}

/** "Today" / "Yesterday" / "12 March" — the section headings. */
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

function NotificationRow({
  notification,
  onPress,
}: {
  notification: ApiNotification;
  onPress: () => void;
}) {
  const actorImage = resolveMediaUrl(notification.actor?.imageUrl);
  const thumb = resolveMediaUrl(notification.postThumbnailUrl);
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
    notification.type === 'sapling_planted' ||
    notification.type === 'nursery_tree_milestone' ||
    notification.type === 'nursery_impact_milestone' ||
    notification.type === 'order_fulfillment_today' ||
    notification.type === 'bulk_requirement_response_received' ||
    notification.type === 'ngo_streak_at_risk' ||
    notification.type === 'ngo_streak_broken' ||
    notification.type === 'ngo_impact_milestone';

  return (
    <TouchableOpacity
      style={[styles.row, !notification.read && styles.rowUnread]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.avatar}>
        {actorImage ? (
          <Image source={{ uri: actorImage }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarEmoji}>
            {notification.actor?.avatarEmoji ?? iconFor(notification)}
          </Text>
        )}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{iconFor(notification)}</Text>
        </View>
      </View>

      <View style={styles.rowText}>
        <Text style={styles.body}>
          {!standalone && notification.actor ? (
            <Text style={styles.actorName}>{notification.actor.name} </Text>
          ) : null}
          {describe(notification)}
        </Text>
        <Text style={styles.time}>
          {new Date(notification.createdAt).toLocaleTimeString(undefined, {
            hour: 'numeric',
            minute: '2-digit',
          })}
        </Text>
      </View>

      {thumb ? <Image source={{ uri: thumb }} style={styles.thumb} /> : null}
      {!notification.read && <View style={styles.unreadDot} />}
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
      // Nurseries are the only recipients of a request notification; individual planters are the
      // only recipients of a fulfilled/declined one — the type alone is enough to route correctly.
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
      if (n.type === 'bulk_requirement_nearby' || n.type === 'bulk_requirement_response_accepted') {
        const requirementId = (n.data as any)?.requirementId;
        if (requirementId) navigation.navigate('NurseryBulkRequirementDetail', { requirementId });
        else navigation.navigate('NurseryBulkRequirements');
        return;
      }
      if (n.type === 'bulk_requirement_response_received') {
        navigation.navigate('NgoBulkRequirements');
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
      if (n.type === 'ngo_drive_rsvp') {
        const driveId = (n.data as any)?.driveId;
        if (driveId) navigation.navigate('DriveDetail', { driveId });
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
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(107, 68, 35, 0.35)',
    padding: 12,
    marginBottom: 8,
  },
  rowUnread: { borderColor: COLORS.earth, backgroundColor: 'rgba(107, 68, 35, 0.06)' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 22 },
  avatarEmoji: { fontSize: 21 },
  typeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: { fontSize: 10 },
  rowText: { flex: 1 },
  body: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
  actorName: { fontFamily: FONTS.display, color: COLORS.textPrimary },
  time: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  thumb: { width: 40, height: 40, borderRadius: RADIUS.sm },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.forest,
  },
  footer: { marginVertical: SPACING.md },
});
