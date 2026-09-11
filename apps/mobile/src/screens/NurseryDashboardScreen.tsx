import React, { useRef } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Dimensions } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurTargetView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { SHADOWS } from '../constants/theme';
import { EcoWidget } from '../components/common/EcoWidget';
import { MuteButton } from '../components/common/MuteButton';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { ForestHeroCanvas } from '../components/common/ForestHeroCanvas';
import { AmbientCreatures } from '../components/common/AmbientCreatures';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { getSceneryMode, RainEffect, WindEffect } from '../components/common/WeatherEffects';
import { useTimeTheme, type TimeTheme } from '../hooks/useTimeTheme';
import { useDeviceWeather } from '../hooks/useDeviceWeather';
import { useAuth } from '../context/AuthContext';
import { useNurseryProfile, useNurseryStats, useNurseryReservations, useNurseryOrders, useNurseryDashboardToday } from '../hooks/useApiQueries';
import type { ApiNurseryActivityItem } from '../api/nursery';
import { useUnreadNotificationCount } from '../hooks/useSocialQueries';
import { useSlideUp } from '../hooks/useAnimations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { getHeroSeamColor, getHeroSeamTextColors } from '../utils/heroSeam';
import { hexToRgba } from '../utils/color';
import type { NurseryTabName } from '../navigation/AppNavigator';

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_HEIGHT = SH * 0.5;

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  pending: { title: 'Under review', body: "We're reviewing your nursery. Your stock will go live once approved." },
  rejected: { title: 'Application rejected', body: 'Update your details and resubmit from your Nursery Profile.' },
  suspended: { title: 'Account suspended', body: 'Contact support for details.' },
};

function StatusBanner({ status, seamText }: { status: string; seamText: { primary: string; secondary: string } }) {
  if (status === 'approved') return null;
  const copy = STATUS_COPY[status];
  if (!copy) return null;
  const isDanger = status === 'rejected' || status === 'suspended';
  return (
    <BorderCard
      noPadding
      style={[styles.statusBanner, { borderLeftWidth: 4, borderLeftColor: isDanger ? COLORS.coral : COLORS.golden }]}
    >
      <Text style={[styles.statusTitle, { color: seamText.primary }]}>{copy.title}</Text>
      <Text style={[styles.statusBody, { color: seamText.secondary }]}>{copy.body}</Text>
    </BorderCard>
  );
}

interface DockActionSpec {
  key: string;
  emoji: string;
  color: string;
  title: string;
  badge?: number;
  onPress: () => void;
}

// An icon shortcut, not another boxed card — the earlier full-width list and then a 2-column
// card grid both still read as "stacked cards" once there were several. This sits directly on
// the page instead, like a payments-app quick-actions row.
function DockItem({
  theme,
  seamText,
  delay,
  emoji,
  color,
  title,
  badge,
  onPress,
}: {
  theme: TimeTheme;
  seamText: { primary: string; secondary: string };
  delay: number;
  emoji: string;
  color: string;
  title: string;
  badge?: number;
  onPress: () => void;
}) {
  const animStyle = useSlideUp(delay, 16);
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity activeOpacity={0.75} onPress={onPress} style={styles.dockTouchable}>
        <View style={styles.dockIconWrap}>
          <LinearGradient
            colors={[color, hexToRgba(color, 0.65)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dockIconCircle}
          >
            <Text style={styles.dockIconEmoji}>{emoji}</Text>
          </LinearGradient>
          {!!badge && (
            <View style={styles.dockBadge}>
              <Text style={styles.dockBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.dockLabel, { color: seamText.secondary }]} numberOfLines={2}>
          {title}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Every slot is an equal-width flex column, so a row of 3 lines up cleanly under the row above it.
function DockRow({
  theme,
  seamText,
  items,
  delayStart,
}: {
  theme: TimeTheme;
  seamText: { primary: string; secondary: string };
  items: (DockActionSpec | null)[];
  delayStart: number;
}) {
  return (
    <View style={styles.dockGridRow}>
      {items.map((item, i) =>
        item ? (
          <View key={item.key} style={styles.dockSlot}>
            <DockItem
              theme={theme}
              seamText={seamText}
              delay={delayStart + i * 30}
              emoji={item.emoji}
              color={item.color}
              title={item.title}
              badge={item.badge}
              onPress={item.onPress}
            />
          </View>
        ) : (
          <View key={`empty-${i}`} style={styles.dockSlot} />
        )
      )}
    </View>
  );
}

// Sits in the header next to MuteButton and the avatar — the same 44px blurred-circle shape as
// MuteButton, so the two read as a matched pair of icon buttons. `useUnreadNotificationCount`
// already existed (built for a badge like this) but no screen had ever actually rendered it.
function NotificationBell({ onPress }: { onPress: () => void }) {
  const { data } = useUnreadNotificationCount();
  const unreadCount = data?.count ?? 0;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.bellButton}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
    >
      <View style={styles.bellBlur}>
        <Text style={styles.bellIcon}>🔔</Text>
      </View>
      {unreadCount > 0 && (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const ACTIVITY_COPY: Record<string, (data: Record<string, any>) => { icon: string; text: string }> = {
  order_placed: (d) => ({ icon: '🛒', text: `New order placed${d.species ? ` for ${d.species}` : ''}` }),
  order_picked_up: (d) => ({ icon: '🤝', text: `Order picked up by ${d.customerName ?? 'a planter'}` }),
  order_delivered: (d) => ({ icon: '🚚', text: `Order delivered to ${d.customerName ?? 'a planter'}` }),
  sapling_planted: (d) => ({ icon: '🌱', text: `${d.species ?? 'A sapling'} you supplied was planted${d.locationLabel ? ` at ${d.locationLabel}` : ''}` }),
  stock_low: (d) => ({ icon: '⚠️', text: `${d.species ?? 'A species'} is running low on stock` }),
  stock_out_of_stock: (d) => ({ icon: '🚫', text: `${d.species ?? 'A species'} is out of stock` }),
  bulk_requirement_nearby: (d) => ({ icon: '🤝', text: `${d.ngoName ?? 'An NGO'} is looking for saplings nearby` }),
  nursery_tree_milestone: (d) => ({ icon: '🌳', text: d.message ?? 'You hit a tree milestone!' }),
  nursery_impact_milestone: (d) => ({ icon: '🏆', text: d.message ?? 'You hit an impact milestone!' }),
};

function ActivityRow({ item }: { item: ApiNurseryActivityItem }) {
  const copy = ACTIVITY_COPY[item.type]?.(item.data ?? {}) ?? { icon: '📌', text: item.type };
  return (
    <BorderCard noPadding style={styles.activityRow}>
      <Text style={styles.activityIcon}>{copy.icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.activityText}>{copy.text}</Text>
        <Text style={styles.activityTime}>{new Date(item.createdAt).toLocaleString()}</Text>
      </View>
    </BorderCard>
  );
}

interface NurseryDashboardScreenProps {
  navigation: any;
  onNavigateTab: (tab: NurseryTabName) => void;
}

export function NurseryDashboardScreen({ navigation, onNavigateTab }: NurseryDashboardScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const theme = useTimeTheme();
  const { weather } = useDeviceWeather();
  const sceneryMode = getSceneryMode(weather);
  const { user } = useAuth();
  const { data: profile } = useNurseryProfile();
  const { data: stats, isLoading } = useNurseryStats();
  const { data: pendingReservations = [] } = useNurseryReservations('pending');
  const { data: confirmedOrders = [] } = useNurseryOrders('confirmed');
  const { data: packedOrders = [] } = useNurseryOrders('packed');
  const { data: today } = useNurseryDashboardToday();
  const blurTargetRef = useRef<View>(null);

  const pageBackground = getHeroSeamColor(theme);
  const seamText = getHeroSeamTextColors(theme);

  /** Shared props for the "Your Impact" tiles: real glass cards tinted from the time-of-day
   * theme (same recipe as the NGO dashboard's cards / Home's EcoFactCard). */
  const tileProps = {
    variant: 'glass' as const,
    fill: true,
    style: styles.gridTile,
    color: theme.accentColor,
    dark: theme.cardTint === 'dark',
    cardBackground: theme.cardBackground,
    cardBackgroundAlt: theme.cardBackgroundAlt,
    cardOverlayAlpha: theme.cardOverlayAlpha,
    borderColor: theme.cardBorder,
    textColor: theme.textPrimaryOnCard,
    subTextColor: theme.textSecondaryOnCard,
    blurTarget: blurTargetRef,
  };

  // Top row: the daily-use actions (inventory, incoming requests, engagement). Bottom row:
  // reference/reporting (analytics, editing the public profile, and previewing that profile —
  // "View on Map" is a nursery's only way to see the pin planters actually browse, which nothing
  // in the nursery role linked to before, even though the map already renders nursery markers).
  // Circle colors picked to contrast with each emoji's own dominant color, not just to look
  // varied — 📦's tan/brown box on a golden circle, and 🔥's orange/red on the streakFire-orange
  // circle, both camouflaged the icon against its own background.
  const dockActions: DockActionSpec[] = [
    { key: 'stock', emoji: '📦', color: COLORS.xpBlue, title: 'Manage inventory', onPress: () => navigation.navigate('NurseryStock') },
    {
      key: 'orders',
      emoji: '🚚',
      color: COLORS.amber,
      title: 'Orders',
      badge: confirmedOrders.length + packedOrders.length,
      onPress: () => navigation.navigate('NurseryOrders'),
    },
    { key: 'reservations', emoji: '🤝', color: COLORS.forest, title: 'Reservations', badge: pendingReservations.length, onPress: () => navigation.navigate('NurseryReservations') },
    { key: 'reviews', emoji: '⭐', color: COLORS.coral, title: 'Reviews', onPress: () => navigation.navigate('NurseryReviews') },
    { key: 'post', emoji: '📝', color: COLORS.sageDark, title: 'Post an update', onPress: () => navigation.navigate('NurseryPostUpdate') },
    { key: 'followers', emoji: '👥', color: COLORS.xpBlue, title: 'Followers', onPress: () => navigation.navigate('NurseryFollowers') },
    { key: 'streak', emoji: '🔥', color: COLORS.sage, title: 'Streak & Badges', onPress: () => navigation.navigate('NurseryStreakBadges') },
    { key: 'analytics', emoji: '📊', color: COLORS.golden, title: 'Stock Analytics', onPress: () => navigation.navigate('NurseryStockAnalytics') },
    { key: 'editProfile', emoji: '⚙️', color: COLORS.earth, title: 'Edit nursery profile', onPress: () => navigation.navigate('EditNurseryProfile') },
    { key: 'viewProfile', emoji: '🌿', color: COLORS.forest, title: 'View public profile', onPress: () => navigation.navigate('NurseryProfile') },
    { key: 'map', emoji: '🗺️', color: COLORS.coral, title: 'View on Map', onPress: () => navigation.navigate('NurseryMap') },
    { key: 'pickupDelivery', emoji: '🚴', color: COLORS.xpBlue, title: 'Pickup & Delivery', onPress: () => navigation.navigate('NurseryPickupDeliveryConfig') },
    {
      key: 'bulkRequirements',
      emoji: '🤝',
      color: COLORS.amber,
      title: 'Bulk Requirements',
      badge: today?.upcomingBulkRequirements?.length,
      onPress: () => navigation.navigate('NurseryBulkRequirements'),
    },
    { key: 'impact', emoji: '🌳', color: COLORS.sage, title: 'Nursery Impact', onPress: () => navigation.navigate('NurseryImpact') },
  ];

  // Every dock item now actually renders — the grid used to hardcode `.slice(0, 3)` /
  // `.slice(3, 6)`, silently dropping anything past the 6th entry as the dock grew. Chunking the
  // full array into rows of 3 keeps the same equal-width-column layout for however many items
  // exist, old or new.
  const dockRows: DockActionSpec[][] = [];
  for (let i = 0; i < dockActions.length; i += 3) {
    dockRows.push(dockActions.slice(i, i + 3));
  }

  return (
    <BlurTargetView ref={blurTargetRef} collapsable={false} style={[styles.container, { backgroundColor: pageBackground }]}>
      <StatusBar style={theme.statusBarStyle} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]}
      >
        <View style={[styles.heroSection, { height: HERO_HEIGHT }]}>
          {theme.heroImage ? (
            <Image
              source={theme.heroImage}
              style={{ position: 'absolute', top: 0, left: 0, width: SW, height: HERO_HEIGHT }}
              resizeMode="cover"
            />
          ) : (
            <ForestHeroCanvas theme={theme} width={SW} height={HERO_HEIGHT} treeCount={12} />
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0)', pageBackground]}
            style={[styles.heroBottomFade, { height: HERO_HEIGHT * 0.24 }]}
            pointerEvents="none"
          />

          <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
            <View>
              <Text style={[styles.greeting, { color: theme.textOnSky }]}>{theme.greeting} {theme.emoji}</Text>
              <Text style={[styles.orgName, { color: theme.textOnSky }]}>{profile?.nurseryName ?? user?.name ?? 'Your nursery'}</Text>
            </View>
            <View style={styles.headerRight}>
              <MuteButton />
              <NotificationBell onPress={() => navigation.navigate('Notifications')} />
              <TouchableOpacity style={styles.avatarButton} onPress={() => onNavigateTab('Settings')}>
                <LinearGradient colors={[COLORS.sageLight, COLORS.forest]} style={styles.avatar}>
                  <Text style={styles.avatarText}>{user?.avatarEmoji ?? '🌿'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsRow}>
            <EcoWidget
              icon="🌱"
              value={stats?.speciesCount ?? 0}
              label="Species"
              variant="glass"
              dark
              color={theme.accentColor}
              cardBackground={theme.cardBackground}
              cardBackgroundAlt={theme.cardBackgroundAlt}
              cardOverlayAlpha={theme.cardOverlayAlpha}
              textColor={theme.textSecondaryOnCard}
              subTextColor={theme.textSecondaryOnCard}
              borderColor={theme.cardBorder}
              delay={100}
              onPress={() => navigation.navigate('NurseryStock')}
              blurTarget={blurTargetRef}
            />
            <EcoWidget
              icon="📦"
              value={stats?.totalQuantity ?? 0}
              label="In stock"
              variant="glass"
              dark
              color={theme.accentColor}
              cardBackground={theme.cardBackground}
              cardBackgroundAlt={theme.cardBackgroundAlt}
              cardOverlayAlpha={theme.cardOverlayAlpha}
              textColor={theme.textSecondaryOnCard}
              subTextColor={theme.textSecondaryOnCard}
              borderColor={theme.cardBorder}
              delay={200}
              onPress={() => navigation.navigate('NurseryStock')}
              blurTarget={blurTargetRef}
            />
          </View>
        </View>

        {profile && <StatusBanner status={profile.status} seamText={seamText} />}

        {today && (
          <>
            <Text style={[styles.sectionTitle, { color: seamText.primary }]}>Today</Text>
            <View style={styles.gridRow}>
              <EcoWidget {...tileProps} icon="🛒" value={String(today.ordersToday)} label="Orders today" delay={0} onPress={() => navigation.navigate('NurseryOrders')} />
              <EcoWidget {...tileProps} icon="🆕" value={String(today.newPending)} label="New pending" delay={60} onPress={() => navigation.navigate('NurseryOrders')} />
            </View>
            <View style={styles.gridRow}>
              <EcoWidget {...tileProps} icon="📦" value={String(today.readyForPickup)} label="Ready for pickup" delay={120} onPress={() => navigation.navigate('NurseryOrders')} />
              <EcoWidget {...tileProps} icon="🚴" value={String(today.deliveriesPending)} label="Deliveries pending" delay={180} onPress={() => navigation.navigate('NurseryOrders')} />
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { color: seamText.primary }]}>Quick Actions</Text>
        <View style={styles.dockGrid}>
          {dockRows.map((row, i) => (
            <DockRow
              key={i}
              theme={theme}
              seamText={seamText}
              delayStart={120 + i * 90}
              items={row.length === 3 ? row : [...row, ...Array(3 - row.length).fill(null)]}
            />
          ))}
        </View>

        {today && (
          <>
            <Text style={[styles.sectionTitle, { color: seamText.primary }]}>Recent Activity</Text>
            {today.activity.length === 0 ? (
              <EmptyState icon="📋" title="No activity yet" body="Orders, plantings, and milestones will show up here." />
            ) : (
              <View style={styles.activityList}>
                {today.activity.slice(0, 10).map((item) => (
                  <ActivityRow key={item.id} item={item} />
                ))}
              </View>
            )}
          </>
        )}

        {isLoading || !stats ? (
          <ActivityIndicator color={theme.accentColor} style={styles.loader} />
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: seamText.primary }]}>Your Impact</Text>
            <View style={styles.gridRow}>
              <EcoWidget {...tileProps} icon="🌱" value={String(stats.speciesCount)} label="Species listed" delay={0} />
              <EcoWidget {...tileProps} icon="📦" value={String(stats.totalQuantity)} label="Saplings in stock" delay={60} />
              <EcoWidget {...tileProps} icon="🎁" value={String(stats.freeSpeciesCount)} label="Free species" delay={120} />
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.ambientLayer} pointerEvents="none">
        <AmbientCreatures period={theme.period} fireflyAreaHeight={SH * 0.5} />
        {sceneryMode === 'rain' && <RainEffect count={24} />}
        {sceneryMode === 'wind' && <WindEffect count={6} />}
        {sceneryMode === 'leaves' && (
          <FloatingParticles
            count={5}
            type={theme.particleType === 'firefly' ? 'leaf' : theme.particleType}
            speedMultiplier={2.2}
          />
        )}
      </View>
    </BlurTargetView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambientLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  scrollContent: { paddingHorizontal: 16, gap: 8 },
  heroSection: { position: 'relative', overflow: 'hidden', marginHorizontal: -16 },
  heroBottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, zIndex: 10 },
  greeting: { fontSize: 13, fontWeight: '500', letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  orgName: { fontFamily: FONTS.displayBold, fontSize: 24, lineHeight: 32, letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellButton: { width: 44, height: 44, borderRadius: 22 },
  bellBlur: { flex: 1, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1.5, borderColor: COLORS.warmBrown },
  bellIcon: { fontSize: 18 },
  bellBadge: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 1.5, borderColor: COLORS.cream },
  bellBadgeText: { fontSize: 9, fontWeight: '700', color: COLORS.white },
  avatarButton: {},
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sage },
  avatarText: { fontSize: 22 },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 4, marginBottom: 20 },
  loader: { marginTop: 20, marginBottom: 8 },
  statusBanner: { padding: 14, marginTop: 4, marginBottom: 8 },
  statusTitle: { fontSize: 14, fontWeight: '700' },
  statusBody: { fontSize: 12, marginTop: 2 },
  gridRow: { flexDirection: 'row', alignItems: 'stretch', gap: 10, marginBottom: 10 },
  gridTile: { flex: 1 },
  sectionTitle: { fontFamily: FONTS.display, fontSize: 20, lineHeight: 27, marginTop: 20 },
  // A 2-row, 3-column icon grid — icons sit directly on the page (no per-item card), like a
  // payments-app quick-actions row, rather than another stack of boxed cards.
  dockGrid: { marginTop: 4 },
  dockGridRow: { flexDirection: 'row' },
  dockSlot: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  dockTouchable: { alignItems: 'center' },
  dockIconWrap: { position: 'relative' },
  dockIconCircle: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', ...SHADOWS.sm },
  dockIconEmoji: { fontSize: 25 },
  dockBadge: { position: 'absolute', top: -3, right: -6, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.coral, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  dockBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  dockLabel: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginTop: 8, lineHeight: 17 },
  activityList: { gap: 8, marginTop: 4 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  activityIcon: { fontSize: 18 },
  activityText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  activityTime: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
