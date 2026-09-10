import React, { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/common/AppText';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';
import { IS_TABLET, CONTENT_MAX_WIDTH } from '../utils/responsive';

import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AccountTypeScreen } from '../screens/AccountTypeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { GroupRegisterScreen } from '../screens/GroupRegisterScreen';
import { GroupDashboardScreen } from '../screens/GroupDashboardScreen';
import { GroupManageScreen } from '../screens/GroupManageScreen';
import { GroupCreateChallengeScreen } from '../screens/GroupCreateChallengeScreen';
import { GroupSettingsScreen } from '../screens/GroupSettingsScreen';
import { GroupProfileScreen } from '../screens/GroupProfileScreen';
import { GroupMembersStandaloneScreen } from '../screens/GroupMembersStandaloneScreen';
import { EditGroupProfileScreen } from '../screens/EditGroupProfileScreen';
import { GroupStreakScreen } from '../screens/GroupStreakScreen';
import { GroupActivityScreen } from '../screens/GroupActivityScreen';
import { GroupsScreen } from '../screens/GroupsScreen';
import { GroupDetailScreen } from '../screens/GroupDetailScreen';
import { NurseryRegisterScreen } from '../screens/NurseryRegisterScreen';
import { NurseryDashboardScreen } from '../screens/NurseryDashboardScreen';
import { NurserySettingsScreen } from '../screens/NurserySettingsScreen';
import { NurseryProfileScreen } from '../screens/NurseryProfileScreen';
import { EditNurseryProfileScreen } from '../screens/EditNurseryProfileScreen';
import { NurseryStockScreen } from '../screens/NurseryStockScreen';
import { NurseryStreakBadgesScreen } from '../screens/NurseryStreakBadgesScreen';
import { NurseryReservationsScreen } from '../screens/NurseryReservationsScreen';
import { NurseryStockAnalyticsScreen } from '../screens/NurseryStockAnalyticsScreen';
import { NurseryDirectoryScreen } from '../screens/NurseryDirectoryScreen';
import { SaplingReservationScreen } from '../screens/SaplingReservationScreen';
import { MySaplingReservationsScreen } from '../screens/MySaplingReservationsScreen';
import { AddToCartScreen } from '../screens/AddToCartScreen';
import { CartScreen } from '../screens/CartScreen';
import { MyOrdersScreen } from '../screens/MyOrdersScreen';
import { OrderDetailScreen } from '../screens/OrderDetailScreen';
import { WishlistScreen } from '../screens/WishlistScreen';
import { AddressBookScreen } from '../screens/AddressBookScreen';
import { NurseryOrdersScreen } from '../screens/NurseryOrdersScreen';
import { NurseryOrderDetailScreen } from '../screens/NurseryOrderDetailScreen';
import { NurseryReviewsScreen } from '../screens/NurseryReviewsScreen';
import { MyAdoptionsScreen } from '../screens/MyAdoptionsScreen';
import { NurseryFollowersScreen } from '../screens/NurseryFollowersScreen';
import { CorporateRegisterScreen } from '../screens/CorporateRegisterScreen';
import { CorporateDashboardScreen } from '../screens/CorporateDashboardScreen';
import { CorporateSettingsScreen } from '../screens/CorporateSettingsScreen';
import { CorporateSponsorshipsScreen } from '../screens/CorporateSponsorshipsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ForestScreen } from '../screens/ForestScreen';
import { PlantTreeScreen } from '../screens/PlantTreeScreen';
import { CommunityScreen } from '../screens/CommunityScreen';
import { UserProfileScreen } from '../screens/UserProfileScreen';
import { StreakProtectionScreen } from '../screens/StreakProtectionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { SessionsScreen } from '../screens/SessionsScreen';
import { StaticContentScreen } from '../screens/StaticContentScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { EmojiPickerScreen } from '../screens/EmojiPickerScreen';
import { HomeThemePickerScreen } from '../screens/HomeThemePickerScreen';
import { FriendsListScreen } from '../screens/FriendsListScreen';
import { DrivesListScreen } from '../screens/DrivesListScreen';
import { AdoptTreeListScreen } from '../screens/AdoptTreeListScreen';
import { AdoptTreeDetailScreen } from '../screens/AdoptTreeDetailScreen';
import { CampaignsListScreen } from '../screens/CampaignsListScreen';
import { NgoDashboardScreen } from '../screens/NgoDashboardScreen';
import { NgoProfileScreen } from '../screens/NgoProfileScreen';
import { NgoMoreScreen } from '../screens/NgoMoreScreen';
import { NgoManageScreen } from '../screens/NgoManageScreen';
import { NgoCreateDriveScreen } from '../screens/NgoCreateDriveScreen';
import { NgoCreateAdoptableTreeScreen } from '../screens/NgoCreateAdoptableTreeScreen';
import { NgoRegisterScreen } from '../screens/NgoRegisterScreen';
import { NgoSettingsScreen } from '../screens/NgoSettingsScreen';
import { NgoStaffScreen } from '../screens/NgoStaffScreen';
import { NgoCreateCampaignScreen } from '../screens/NgoCreateCampaignScreen';
import { NgoReportsScreen } from '../screens/NgoReportsScreen';
import { NgoDonationsScreen } from '../screens/NgoDonationsScreen';
import { NgoVolunteersScreen } from '../screens/NgoVolunteersScreen';
import { NgoLogPlantedTreesScreen } from '../screens/NgoLogPlantedTreesScreen';
import { NgoHealthCheckScreen } from '../screens/NgoHealthCheckScreen';
import { PostComposerScreen } from '../screens/PostComposerScreen';
import { NgoCommunityScreen } from '../screens/NgoCommunityScreen';
import { NgoPortfolioScreen } from '../screens/NgoPortfolioScreen';
import { NgoPortfolioEntryScreen } from '../screens/NgoPortfolioEntryScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { PostDetailScreen } from '../screens/PostDetailScreen';
import { ProfilePostFeedScreen } from '../screens/ProfilePostFeedScreen';
import { PublicFollowersScreen } from '../screens/PublicFollowersScreen';
import { PostLikesScreen } from '../screens/PostLikesScreen';
import { BlockedAccountsScreen } from '../screens/BlockedAccountsScreen';
import { NgoDirectoryScreen } from '../screens/NgoDirectoryScreen';
import { FollowingFeedScreen } from '../screens/FollowingFeedScreen';
import { AdminHomeScreen, PANEL_BG } from '../screens/AdminHomeScreen';
import { AdminNgoApprovalsScreen } from '../screens/AdminNgoApprovalsScreen';
import { AdminNgoApprovalDetailScreen } from '../screens/AdminNgoApprovalDetailScreen';
import { AdminAuditLogScreen } from '../screens/AdminAuditLogScreen';
import { AdminReportsScreen } from '../screens/AdminReportsScreen';
import { AccountBlockedScreen } from '../screens/AccountBlockedScreen';
import { AdminMoreScreen } from '../screens/AdminMoreScreen';
import { AdminAccountSearchScreen } from '../screens/AdminAccountSearchScreen';
import { AdminNurseryApprovalsScreen } from '../screens/AdminNurseryApprovalsScreen';
import { AdminNurseryApprovalDetailScreen } from '../screens/AdminNurseryApprovalDetailScreen';
import { AdminCorporateApprovalsScreen } from '../screens/AdminCorporateApprovalsScreen';
import { AdminCorporateApprovalDetailScreen } from '../screens/AdminCorporateApprovalDetailScreen';
import { AdminOpsScreen } from '../screens/AdminOpsScreen';
import { AdminTreeReviewScreen } from '../screens/AdminTreeReviewScreen';
import { AdminCatalogScreen } from '../screens/AdminCatalogScreen';

import { BottomNav, NavSurface, TabName, TabItem, USER_TABS } from '../components/navigation/BottomNav';
import { useTimeTheme } from '../hooks/useTimeTheme';
import { usePushRegistration } from '../hooks/usePushRegistration';

export type NgoTabName = 'Home' | 'Community' | 'Post' | 'Manage' | 'More';
export type AdminTabName = 'Overview' | 'NGOs' | 'Reports' | 'AuditLog' | 'More';
export type GroupTabName = 'Home' | 'Manage' | 'Activity' | 'Settings';

const GROUP_TABS: TabItem[] = [
  { name: 'Home', icon: 'ðŸ¡', label: 'Home' },
  { name: 'Manage', icon: 'ðŸ‘¥', label: 'Manage', raised: true },
  { name: 'Activity', icon: 'ðŸ“£', label: 'Activity' },
  { name: 'Settings', icon: 'âš™ï¸', label: 'Settings' },
];

export type NurseryTabName = 'Home' | 'Stock' | 'Settings';

const NURSERY_TABS: TabItem[] = [
  { name: 'Home', icon: 'ðŸ¡', label: 'Home' },
  { name: 'Stock', icon: 'ðŸ“¦', label: 'Stock', raised: true },
  { name: 'Settings', icon: 'âš™ï¸', label: 'Settings' },
];

export type CorporateTabName = 'Home' | 'Sponsorships' | 'Settings';

const CORPORATE_TABS: TabItem[] = [
  { name: 'Home', icon: 'ðŸ¡', label: 'Home' },
  { name: 'Sponsorships', icon: 'ðŸ¤', label: 'Sponsor', raised: true },
  { name: 'Settings', icon: 'âš™ï¸', label: 'Settings' },
];

// Post takes the centre as a raised FAB, mirroring the user app's Plant button — posting is the
// action an NGO repeats most, and its weekly streak depends on it. Map moved into More: an NGO
// browsing the map is rare next to managing its own drives and community.
const NGO_TABS: TabItem[] = [
  { name: 'Home', icon: 'ðŸ¡', label: 'Home' },
  { name: 'Community', icon: 'ðŸ‘¥', label: 'Community' },
  { name: 'Post', icon: 'âž•', label: 'Post', raised: true },
  { name: 'Manage', icon: 'ðŸ“‹', label: 'Manage' },
  { name: 'More', icon: 'âš™ï¸', label: 'More' },
];

// NGO approvals is the action admins repeat most (AdminHomeScreen's own mascot line nags about
// pending count), so it takes the raised centre slot — same treatment as Post/Plant above.
const ADMIN_TABS: TabItem[] = [
  { name: 'Overview', icon: 'ðŸ“Š', label: 'Overview' },
  { name: 'NGOs', icon: 'ðŸ¢', label: 'NGOs', raised: true },
  { name: 'Reports', icon: 'ðŸš©', label: 'Reports' },
  { name: 'AuditLog', icon: 'ðŸ“œ', label: 'Audit Log' },
  { name: 'More', icon: '⚙️', label: 'More' },
];

// react-native-maps has no Android native module in Expo Go, so it must load
// lazily behind a Suspense/error boundary instead of App.tsx's eager import chain
// crashing the whole app on boot.
const MapScreen = React.lazy(() =>
  import('../screens/MapScreen').then((m) => ({ default: m.MapScreen }))
);

class MapErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.mapFallback}>
          <Text style={styles.mapFallbackText}>
            Map isn't available in Expo Go on Android. Build a dev client to use this tab.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// Same problem, same fix as MapScreen above: @stripe/stripe-react-native has native
// code Expo Go doesn't include, so this screen's import of it must be deferred until
// the user actually navigates here, not evaluated eagerly as part of the nav stack.
const LazyCampaignDetailScreen = React.lazy(() =>
  import('../screens/CampaignDetailScreen').then((m) => ({ default: m.CampaignDetailScreen }))
);

class DonateErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.mapFallback}>
          <Text style={styles.mapFallbackText}>
            Donations aren't available in Expo Go. Build a dev client to use this feature.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/** Pushable Map, for the NGO "More" menu now that Map no longer owns a tab slot. Wrapped in the
 * same lazy + boundary pair as the tab version, since react-native-maps has no Expo Go module. */
function NgoMapScreen({ navigation }: any) {
  return (
    <MapErrorBoundary>
      <Suspense fallback={<View style={styles.mainContainer} />}>
        <MapScreen navigation={navigation} mode="ngo" />
      </Suspense>
    </MapErrorBoundary>
  );
}

/** Pushable Map for a nursery to see how it shows up alongside every other nursery on the same
 * map planters browse — the default ('user') mode, not 'ngo' mode, since 'ngo' mode hides the
 * nurseries layer entirely. A nursery had no way to reach this screen at all before this route
 * existed; there was no "Map" tab on its own bottom nav the way the regular User role has. */
function NurseryMapScreen({ navigation }: any) {
  return (
    <MapErrorBoundary>
      <Suspense fallback={<View style={styles.mainContainer} />}>
        <MapScreen navigation={navigation} />
      </Suspense>
    </MapErrorBoundary>
  );
}

function CampaignDetailScreen(props: any) {
  return (
    <DonateErrorBoundary>
      <Suspense fallback={<View style={styles.mainContainer} />}>
        <LazyCampaignDetailScreen {...props} />
      </Suspense>
    </DonateErrorBoundary>
  );
}

// DriveDetailScreen now also uses @stripe/stripe-react-native (plant
// sponsorship) — same Expo-Go-native-module problem, same lazy + boundary fix.
const LazyDriveDetailScreen = React.lazy(() =>
  import('../screens/DriveDetailScreen').then((m) => ({ default: m.DriveDetailScreen }))
);

function DriveDetailScreen(props: any) {
  return (
    <DonateErrorBoundary>
      <Suspense fallback={<View style={styles.mainContainer} />}>
        <LazyDriveDetailScreen {...props} />
      </Suspense>
    </DonateErrorBoundary>
  );
}

// CheckoutScreen also uses @stripe/stripe-react-native (marketplace checkout) — same fix.
const LazyCheckoutScreen = React.lazy(() =>
  import('../screens/CheckoutScreen').then((m) => ({ default: m.CheckoutScreen }))
);

function CheckoutScreen(props: any) {
  return (
    <DonateErrorBoundary>
      <Suspense fallback={<View style={styles.mainContainer} />}>
        <LazyCheckoutScreen {...props} />
      </Suspense>
    </DonateErrorBoundary>
  );
}

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  AccountType: undefined;
  Login: undefined;
  Register: undefined;
  GroupRegister: undefined;
  GroupMain: undefined;
  GroupCreateChallenge: undefined;
  GroupProfile: undefined;
  GroupPublicProfile: { groupId: string };
  GroupSettings: undefined;
  GroupMembers: undefined;
  EditGroupProfile: undefined;
  GroupStreak: undefined;
  GroupActivity: { groupId: string } | undefined;
  GroupPostUpdate: { groupId: string } | undefined;
  Groups: undefined;
  GroupDetail: { groupId: string };
  NurseryRegister: undefined;
  NurseryMain: undefined;
  NurseryStock: undefined;
  NurseryProfile: undefined;
  EditNurseryProfile: undefined;
  NurseryStreakBadges: undefined;
  NurseryReservations: undefined;
  NurseryStockAnalytics: undefined;
  NurseryMap: undefined;
  NurseryDirectory: undefined;
  NurseryPublicProfile: { nurseryId: string };
  SaplingReservation: { nurseryId: string; stockId: string };
  MySaplingReservations: undefined;
  AddToCart: { nurseryId: string; stockId: string };
  Cart: undefined;
  Checkout: undefined;
  MyOrders: undefined;
  OrderDetail: { orderId: string };
  Wishlist: undefined;
  AddressBook: undefined;
  NurseryOrders: undefined;
  NurseryOrderDetail: { orderId: string };
  NurseryReviews: undefined;
  MyAdoptions: undefined;
  NurseryFollowers: undefined;
  NurseryPostUpdate: undefined;
  CorporateRegister: undefined;
  CorporateMain: undefined;
  CorporateSponsorships: undefined;
  Main: undefined;
  PlantTree: { verifiedLat?: number; verifiedLng?: number } | undefined;
  StreakProtection: undefined;
  Settings: undefined;
  Profile: undefined;
  UserPublicProfile: { userId: string; friendRequestId?: string; friendRequestFromName?: string };
  ChangePassword: undefined;
  Sessions: undefined;
  StaticContent: { title: string; body: string };
  EditProfile: undefined;
  EmojiPicker: { selected?: string; onSelect: (emoji: string) => void } | undefined;
  HomeThemePicker: { current: string | null } | undefined;
  FriendsList: { mode: 'requests' | 'squad' };
  Drives: undefined;
  DriveDetail: { driveId: string };
  AdoptTreeList: undefined;
  AdoptTreeDetail: { treeId: string };
  Campaigns: undefined;
  CampaignDetail: { campaignId: string };
  NgoMain: undefined;
  NgoProfile: undefined;
  NgoCreateDrive: undefined;
  NgoCreateAdoptableTree: undefined;
  NgoRegister: undefined;
  NgoSettings: undefined;
  NgoStaff: undefined;
  NgoCreateCampaign: undefined;
  NgoReports: undefined;
  NgoDonations: undefined;
  NgoVolunteers: undefined;
  NgoLogPlantedTrees: undefined;
  NgoHealthCheck: undefined;
  NgoPostUpdate: undefined;
  NgoCommunity: undefined;
  Map: undefined;
  NgoPortfolio: undefined;
  NgoPortfolioEntry: { entry?: any } | undefined;
  Notifications: undefined;
  PostDetail: { postId: string };
  ProfilePostFeed: { authorKind: 'user' | 'ngo' | 'nursery' | 'group'; authorId: string; initialPostId: string };
  PublicFollowers: { kind: 'ngo' | 'nursery'; id: string; name: string };
  PostLikes: { postId: string };
  BlockedAccounts: undefined;
  NgoDirectory: undefined;
  NgoPublicProfile: { ngoId: string };
  FollowingFeed: undefined;
  AdminMain: undefined;
  AdminNgoApprovalDetail: { ngo: import('../api/admin').ApiAdminNgo };
  AccountBlocked: undefined;
  AdminAccountSearch: undefined;
  AdminNurseryApprovals: undefined;
  AdminNurseryApprovalDetail: { nursery: import('../api/admin').ApiAdminNursery };
  AdminCorporateApprovals: undefined;
  AdminCorporateApprovalDetail: { corporate: import('../api/admin').ApiAdminCorporate };
  AdminOps: undefined;
  AdminTreeReview: undefined;
  AdminCatalog: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Resets the stack back to Login whenever `logout()` actually finishes — nothing else does. The
 * Splash screen only ever picks a starting route once, on the app's first mount; once a role's
 * `Main` stack (User/NGO/Admin) is showing, clearing `user` in AuthContext doesn't by itself pop
 * back to any screen, so "Sign out" looked like a dead button while the user was actually already
 * logged out underneath the still-visible NGO/Admin/User chrome.
 */
function useLogoutRedirect() {
  const { isLoading, isAuthenticated } = useAuth();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (isAuthenticated) wasAuthenticated.current = true;
    if (!isLoading && !isAuthenticated && wasAuthenticated.current && navigationRef.isReady()) {
      wasAuthenticated.current = false;
      navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [isLoading, isAuthenticated]);
}

/**
 * Redirects to the AccountBlocked screen the instant isBlocked flips true —
 * same shape as useLogoutRedirect above, fired from AuthContext's
 * onAccountBlocked handler (see api/client.ts) rather than a nav-time check,
 * so a block that happens mid-session (not just at cold launch) still takes
 * the user off whatever screen they're on immediately.
 */
function useBlockedRedirect() {
  const { isBlocked } = useAuth();

  useEffect(() => {
    if (isBlocked && navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'AccountBlocked' }] });
    }
  }, [isBlocked]);
}

function MainApp({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<TabName>('Home');
  // Always called (Rules of Hooks) — only actually handed to BottomNav while Home is active, so
  // every other tab keeps the static beige/green look untouched.
  const homeTheme = useTimeTheme();

  const renderScreen = useCallback(() => {
    switch (activeTab) {
      case 'Home':
        return <HomeScreen navigation={navigation} onNavigateTab={setActiveTab} />;
      case 'Forest':
        return <ForestScreen navigation={navigation} />;
      case 'Plant':
        return <PlantTreeScreen navigation={navigation} />;
      case 'Map':
        return (
          <MapErrorBoundary>
            <Suspense fallback={<View style={styles.mainContainer} />}>
              <MapScreen navigation={navigation} />
            </Suspense>
          </MapErrorBoundary>
        );
      case 'Community':
        return <CommunityScreen navigation={navigation} />;
      default:
        return <HomeScreen navigation={navigation} />;
    }
  }, [activeTab, navigation]);

  return (
    <View style={styles.mainContainer}>
      {renderScreen()}
      <BottomNav tabs={USER_TABS} activeTab={activeTab} onTabPress={setActiveTab} theme={activeTab === 'Home' ? homeTheme : null} />
    </View>
  );
}

function NgoMainApp({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<NgoTabName>('Home');
  // Same shape as MainApp: always called (Rules of Hooks), only handed to BottomNav on the
  // dashboard tab, which is the one screen here that paints itself from the time-of-day theme.
  const dashboardTheme = useTimeTheme();

  const renderScreen = useCallback(() => {
    switch (activeTab) {
      case 'Home':
        return <NgoDashboardScreen navigation={navigation} onNavigateTab={setActiveTab} />;
      case 'Community':
        return <NgoCommunityScreen navigation={navigation} />;
      case 'Manage':
        return <NgoManageScreen navigation={navigation} />;
      case 'Post':
        return <PostComposerScreen navigation={navigation} />;
      case 'More':
        return <NgoMoreScreen navigation={navigation} />;
      default:
        return <NgoDashboardScreen navigation={navigation} onNavigateTab={setActiveTab} />;
    }
  }, [activeTab, navigation]);

  return (
    <View style={styles.mainContainer}>
      {renderScreen()}
      <BottomNav
        tabs={NGO_TABS}
        activeTab={activeTab}
        onTabPress={setActiveTab as (t: TabName) => void}
        theme={activeTab === 'Home' ? dashboardTheme : null}
      />
    </View>
  );
}

function GroupMainApp({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<GroupTabName>('Home');
  const dashboardTheme = useTimeTheme();

  const renderScreen = useCallback(() => {
    switch (activeTab) {
      case 'Home':
        return <GroupDashboardScreen navigation={navigation} onNavigateTab={setActiveTab} />;
      case 'Manage':
        return <GroupManageScreen navigation={navigation} />;
      case 'Activity':
        return <GroupActivityScreen navigation={navigation} />;
      case 'Settings':
        return <GroupSettingsScreen navigation={navigation} />;
      default:
        return <GroupDashboardScreen navigation={navigation} onNavigateTab={setActiveTab} />;
    }
  }, [activeTab, navigation]);

  return (
    <View style={styles.mainContainer}>
      {renderScreen()}
      <BottomNav
        tabs={GROUP_TABS}
        activeTab={activeTab}
        onTabPress={setActiveTab as (t: TabName) => void}
        theme={activeTab === 'Home' ? dashboardTheme : null}
      />
    </View>
  );
}

function NurseryMainApp({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<NurseryTabName>('Home');
  const dashboardTheme = useTimeTheme();

  const renderScreen = useCallback(() => {
    switch (activeTab) {
      case 'Home':
        return <NurseryDashboardScreen navigation={navigation} onNavigateTab={setActiveTab} />;
      case 'Stock':
        return <NurseryStockScreen navigation={navigation} />;
      case 'Settings':
        return <NurserySettingsScreen navigation={navigation} />;
      default:
        return <NurseryDashboardScreen navigation={navigation} onNavigateTab={setActiveTab} />;
    }
  }, [activeTab, navigation]);

  return (
    <View style={styles.mainContainer}>
      {renderScreen()}
      <BottomNav
        tabs={NURSERY_TABS}
        activeTab={activeTab}
        onTabPress={setActiveTab as (t: TabName) => void}
        theme={activeTab === 'Home' ? dashboardTheme : null}
      />
    </View>
  );
}

function CorporateMainApp({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<CorporateTabName>('Home');
  const dashboardTheme = useTimeTheme();

  const renderScreen = useCallback(() => {
    switch (activeTab) {
      case 'Home':
        return <CorporateDashboardScreen navigation={navigation} onNavigateTab={setActiveTab} />;
      case 'Sponsorships':
        return <CorporateSponsorshipsScreen navigation={navigation} />;
      case 'Settings':
        return <CorporateSettingsScreen navigation={navigation} />;
      default:
        return <CorporateDashboardScreen navigation={navigation} onNavigateTab={setActiveTab} />;
    }
  }, [activeTab, navigation]);

  return (
    <View style={styles.mainContainer}>
      {renderScreen()}
      <BottomNav
        tabs={CORPORATE_TABS}
        activeTab={activeTab}
        onTabPress={setActiveTab as (t: TabName) => void}
        theme={activeTab === 'Home' ? dashboardTheme : null}
      />
    </View>
  );
}

/** Admin chrome is deliberately outside the time-of-day system — Overview paints a fixed dark
 * panel, the other two lay a `nightSky` gradient over the page. The floating nav takes whichever
 * tone its tab actually ends on so it reads as part of the page rather than a cream slab. */
const ADMIN_NAV_SURFACE: Record<AdminTabName, NavSurface> = {
  Overview: { background: PANEL_BG, tint: 'dark' },
  // Bottom stop of GRADIENTS.nightSky, which is what sits behind the bar on these two screens.
  NGOs: { background: '#2C3E6B', tint: 'dark' },
  Reports: { background: '#2C3E6B', tint: 'dark' },
  AuditLog: { background: '#2C3E6B', tint: 'dark' },
  More: { background: '#2C3E6B', tint: 'dark' },
};

function AdminMainApp({ navigation }: any) {
  const [activeTab, setActiveTab] = useState<AdminTabName>('Overview');

  const renderScreen = useCallback(() => {
    switch (activeTab) {
      case 'Overview':
        return <AdminHomeScreen navigation={navigation} onNavigateTab={setActiveTab} />;
      case 'NGOs':
        return <AdminNgoApprovalsScreen navigation={navigation} />;
      case 'Reports':
        return <AdminReportsScreen />;
      case 'AuditLog':
        return <AdminAuditLogScreen navigation={navigation} />;
      case 'More':
        return <AdminMoreScreen navigation={navigation} />;
      default:
        return <AdminHomeScreen navigation={navigation} />;
    }
  }, [activeTab, navigation]);

  return (
    <View style={styles.mainContainer}>
      {renderScreen()}
      <BottomNav
        tabs={ADMIN_TABS}
        activeTab={activeTab}
        onTabPress={setActiveTab as (t: TabName) => void}
        surface={ADMIN_NAV_SURFACE[activeTab]}
      />
    </View>
  );
}

export function AppNavigator() {
  // Registers this device for push once signed in. A silent no-op in Expo Go — see the hook.
  usePushRegistration();
  useLogoutRedirect();
  useBlockedRedirect();

  // This app's screens are all designed phone-first (fixed-width headers, edge-to-edge gradients,
  // etc.) — stretching that across a ~800-1000dp tablet canvas would distort every layout. Rather
  // than a bespoke tablet redesign, cap each screen's card to a comfortable phone-like width and
  // center it; the app-shell backdrop fills the rest so it doesn't read as a bug.
  return (
    <View style={IS_TABLET ? styles.tabletBackdrop : styles.fill}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            cardStyle: IS_TABLET ? styles.tabletCard : undefined,
            cardStyleInterpolator: ({ current, layouts }) => ({
              cardStyle: {
                opacity: current.progress,
                transform: [
                  {
                    scale: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.97, 1],
                    }),
                  },
                ],
              },
            }),
          }}
        >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="AccountType" component={AccountTypeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="GroupRegister" component={GroupRegisterScreen} />
        <Stack.Screen name="GroupMain" component={GroupMainApp} />
        <Stack.Screen name="GroupCreateChallenge" component={GroupCreateChallengeScreen} />
        <Stack.Screen name="GroupProfile" component={GroupProfileScreen} />
        <Stack.Screen name="GroupPublicProfile" component={GroupProfileScreen} />
        <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} />
        <Stack.Screen name="GroupMembers" component={GroupMembersStandaloneScreen} />
        <Stack.Screen name="EditGroupProfile" component={EditGroupProfileScreen} />
        <Stack.Screen name="GroupStreak" component={GroupStreakScreen} />
        <Stack.Screen name="GroupActivity" component={GroupActivityScreen} />
        <Stack.Screen name="GroupPostUpdate" component={PostComposerScreen} />
        <Stack.Screen name="NurseryRegister" component={NurseryRegisterScreen} />
        <Stack.Screen name="NurseryMain" component={NurseryMainApp} />
        <Stack.Screen name="NurseryStock" component={NurseryStockScreen} />
        <Stack.Screen name="NurseryProfile" component={NurseryProfileScreen} />
        <Stack.Screen name="EditNurseryProfile" component={EditNurseryProfileScreen} />
        <Stack.Screen name="NurseryStreakBadges" component={NurseryStreakBadgesScreen} />
        <Stack.Screen name="NurseryReservations" component={NurseryReservationsScreen} />
        <Stack.Screen name="NurseryStockAnalytics" component={NurseryStockAnalyticsScreen} />
        <Stack.Screen name="NurseryMap" component={NurseryMapScreen} />
        <Stack.Screen name="CorporateRegister" component={CorporateRegisterScreen} />
        <Stack.Screen name="CorporateMain" component={CorporateMainApp} />
        <Stack.Screen name="CorporateSponsorships" component={CorporateSponsorshipsScreen} />
        <Stack.Screen name="Groups" component={GroupsScreen} />
        <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
        <Stack.Screen name="Main" component={MainApp} />
        <Stack.Screen
          name="PlantTree"
          component={PlantTreeScreen}
          options={{
            presentation: 'modal',
            cardStyleInterpolator: ({ current, layouts }) => ({
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
              },
            }),
          }}
        />
        <Stack.Screen name="StreakProtection" component={StreakProtectionScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="Profile" component={UserProfileScreen} />
        <Stack.Screen name="UserPublicProfile" component={UserProfileScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        <Stack.Screen name="Sessions" component={SessionsScreen} />
        <Stack.Screen name="StaticContent" component={StaticContentScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="FriendsList" component={FriendsListScreen} />
        <Stack.Screen
          name="EmojiPicker"
          component={EmojiPickerScreen}
          options={{
            presentation: 'modal',
            cardStyleInterpolator: ({ current, layouts }) => ({
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
              },
            }),
          }}
        />
        <Stack.Screen
          name="HomeThemePicker"
          component={HomeThemePickerScreen}
          options={{
            presentation: 'modal',
            cardStyleInterpolator: ({ current, layouts }) => ({
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
              },
            }),
          }}
        />
        <Stack.Screen name="Drives" component={DrivesListScreen} />
        <Stack.Screen name="DriveDetail" component={DriveDetailScreen} />
        <Stack.Screen name="AdoptTreeList" component={AdoptTreeListScreen} />
        <Stack.Screen name="AdoptTreeDetail" component={AdoptTreeDetailScreen} />
        <Stack.Screen name="Campaigns" component={CampaignsListScreen} />
        <Stack.Screen name="NgoMain" component={NgoMainApp} />
        <Stack.Screen name="NgoProfile" component={NgoProfileScreen} />
        <Stack.Screen name="NgoCreateDrive" component={NgoCreateDriveScreen} />
        <Stack.Screen name="NgoCreateAdoptableTree" component={NgoCreateAdoptableTreeScreen} />
        <Stack.Screen name="NgoRegister" component={NgoRegisterScreen} />
        <Stack.Screen name="NgoSettings" component={NgoSettingsScreen} />
        <Stack.Screen name="NgoStaff" component={NgoStaffScreen} />
        <Stack.Screen name="NgoCreateCampaign" component={NgoCreateCampaignScreen} />
        <Stack.Screen name="NgoReports" component={NgoReportsScreen} />
        <Stack.Screen name="NgoDonations" component={NgoDonationsScreen} />
        <Stack.Screen name="NgoVolunteers" component={NgoVolunteersScreen} />
        <Stack.Screen name="NgoLogPlantedTrees" component={NgoLogPlantedTreesScreen} />
        <Stack.Screen name="NgoHealthCheck" component={NgoHealthCheckScreen} />
        <Stack.Screen name="NgoPostUpdate" component={PostComposerScreen} />
        <Stack.Screen name="NgoCommunity" component={NgoCommunityScreen} />
        <Stack.Screen name="Map" component={NgoMapScreen} />
        <Stack.Screen name="NgoPortfolio" component={NgoPortfolioScreen} />
        <Stack.Screen name="NgoPortfolioEntry" component={NgoPortfolioEntryScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        <Stack.Screen name="ProfilePostFeed" component={ProfilePostFeedScreen} />
        <Stack.Screen name="PublicFollowers" component={PublicFollowersScreen} />
        <Stack.Screen name="PostLikes" component={PostLikesScreen} />
        <Stack.Screen name="BlockedAccounts" component={BlockedAccountsScreen} />
        <Stack.Screen name="NgoDirectory" component={NgoDirectoryScreen} />
        <Stack.Screen name="NgoPublicProfile" component={NgoProfileScreen} />
        <Stack.Screen name="NurseryDirectory" component={NurseryDirectoryScreen} />
        <Stack.Screen name="NurseryPublicProfile" component={NurseryProfileScreen} />
        <Stack.Screen name="SaplingReservation" component={SaplingReservationScreen} />
        <Stack.Screen name="MySaplingReservations" component={MySaplingReservationsScreen} />
        <Stack.Screen name="AddToCart" component={AddToCartScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="Wishlist" component={WishlistScreen} />
        <Stack.Screen name="AddressBook" component={AddressBookScreen} />
        <Stack.Screen name="NurseryOrders" component={NurseryOrdersScreen} />
        <Stack.Screen name="NurseryOrderDetail" component={NurseryOrderDetailScreen} />
        <Stack.Screen name="NurseryReviews" component={NurseryReviewsScreen} />
        <Stack.Screen name="MyAdoptions" component={MyAdoptionsScreen} />
        <Stack.Screen name="NurseryFollowers" component={NurseryFollowersScreen} />
        <Stack.Screen name="NurseryPostUpdate" component={PostComposerScreen} />
        <Stack.Screen name="FollowingFeed" component={FollowingFeedScreen} />
        <Stack.Screen name="AdminMain" component={AdminMainApp} />
        <Stack.Screen name="AdminNgoApprovalDetail" component={AdminNgoApprovalDetailScreen} />
        <Stack.Screen name="AccountBlocked" component={AccountBlockedScreen} />
        <Stack.Screen name="AdminAccountSearch" component={AdminAccountSearchScreen} />
        <Stack.Screen name="AdminNurseryApprovals" component={AdminNurseryApprovalsScreen} />
        <Stack.Screen name="AdminNurseryApprovalDetail" component={AdminNurseryApprovalDetailScreen} />
        <Stack.Screen name="AdminCorporateApprovals" component={AdminCorporateApprovalsScreen} />
        <Stack.Screen name="AdminCorporateApprovalDetail" component={AdminCorporateApprovalDetailScreen} />
        <Stack.Screen name="AdminOps" component={AdminOpsScreen} />
        <Stack.Screen name="AdminTreeReview" component={AdminTreeReviewScreen} />
        <Stack.Screen name="AdminCatalog" component={AdminCatalogScreen} />
        <Stack.Screen
          name="CampaignDetail"
          component={CampaignDetailScreen}
          options={{
            presentation: 'modal',
            cardStyleInterpolator: ({ current, layouts }) => ({
              cardStyle: {
                transform: [
                  {
                    translateY: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.height, 0],
                    }),
                  },
                ],
              },
            }),
          }}
        />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  tabletBackdrop: {
    flex: 1,
    backgroundColor: COLORS.beigeLight,
  },
  tabletCard: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  mainContainer: {
    flex: 1,
  },
  mapFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mapFallbackText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#4A4A4A',
  },
});
