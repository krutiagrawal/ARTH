import React, { useState, useCallback, Suspense } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ForestScreen } from '../screens/ForestScreen';
import { PlantTreeScreen } from '../screens/PlantTreeScreen';
import { CommunityScreen } from '../screens/CommunityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { StreakProtectionScreen } from '../screens/StreakProtectionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { SessionsScreen } from '../screens/SessionsScreen';
import { StaticContentScreen } from '../screens/StaticContentScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';
import { DrivesListScreen } from '../screens/DrivesListScreen';
import { AdoptTreeListScreen } from '../screens/AdoptTreeListScreen';
import { AdoptTreeDetailScreen } from '../screens/AdoptTreeDetailScreen';
import { CampaignsListScreen } from '../screens/CampaignsListScreen';
import { NgoHomeScreen } from '../screens/NgoHomeScreen';
import { NgoDrivesScreen } from '../screens/NgoDrivesScreen';
import { NgoCreateDriveScreen } from '../screens/NgoCreateDriveScreen';
import { NgoTreesScreen } from '../screens/NgoTreesScreen';
import { NgoCreateAdoptableTreeScreen } from '../screens/NgoCreateAdoptableTreeScreen';
import { NgoRegisterScreen } from '../screens/NgoRegisterScreen';
import { NgoSettingsScreen } from '../screens/NgoSettingsScreen';
import { NgoStaffScreen } from '../screens/NgoStaffScreen';
import { NgoCampaignsScreen } from '../screens/NgoCampaignsScreen';
import { NgoCreateCampaignScreen } from '../screens/NgoCreateCampaignScreen';
import { NgoReportsScreen } from '../screens/NgoReportsScreen';
import { NgoDonationsScreen } from '../screens/NgoDonationsScreen';
import { NgoVolunteersScreen } from '../screens/NgoVolunteersScreen';
import { NgoLogPlantedTreesScreen } from '../screens/NgoLogPlantedTreesScreen';
import { NgoHealthCheckScreen } from '../screens/NgoHealthCheckScreen';
import { NgoPostUpdateScreen } from '../screens/NgoPostUpdateScreen';
import { NgoDirectoryScreen } from '../screens/NgoDirectoryScreen';
import { NgoPublicProfileScreen } from '../screens/NgoPublicProfileScreen';
import { FollowingFeedScreen } from '../screens/FollowingFeedScreen';

import { BottomNav, TabName } from '../components/navigation/BottomNav';
import { useTimeTheme } from '../hooks/useTimeTheme';

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

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  PlantTree: undefined;
  StreakProtection: undefined;
  Settings: undefined;
  Profile: undefined;
  ChangePassword: undefined;
  Sessions: undefined;
  StaticContent: { title: string; body: string };
  EditProfile: undefined;
  Drives: undefined;
  DriveDetail: { driveId: string };
  AdoptTreeList: undefined;
  AdoptTreeDetail: { treeId: string };
  Campaigns: undefined;
  CampaignDetail: { campaignId: string };
  NgoHome: undefined;
  NgoDrives: undefined;
  NgoCreateDrive: undefined;
  NgoTrees: undefined;
  NgoCreateAdoptableTree: undefined;
  NgoRegister: undefined;
  NgoSettings: undefined;
  NgoStaff: undefined;
  NgoCampaigns: undefined;
  NgoCreateCampaign: undefined;
  NgoReports: undefined;
  NgoDonations: undefined;
  NgoVolunteers: undefined;
  NgoLogPlantedTrees: undefined;
  NgoHealthCheck: undefined;
  NgoPostUpdate: undefined;
  NgoDirectory: undefined;
  NgoPublicProfile: { ngoId: string };
  FollowingFeed: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

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
      <BottomNav activeTab={activeTab} onTabPress={setActiveTab} theme={activeTab === 'Home' ? homeTheme : null} />
    </View>
  );
}

export function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
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
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
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
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
          <Stack.Screen name="Sessions" component={SessionsScreen} />
          <Stack.Screen name="StaticContent" component={StaticContentScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="Drives" component={DrivesListScreen} />
          <Stack.Screen name="DriveDetail" component={DriveDetailScreen} />
          <Stack.Screen name="AdoptTreeList" component={AdoptTreeListScreen} />
          <Stack.Screen name="AdoptTreeDetail" component={AdoptTreeDetailScreen} />
          <Stack.Screen name="Campaigns" component={CampaignsListScreen} />
          <Stack.Screen name="NgoHome" component={NgoHomeScreen} />
          <Stack.Screen name="NgoDrives" component={NgoDrivesScreen} />
          <Stack.Screen name="NgoCreateDrive" component={NgoCreateDriveScreen} />
          <Stack.Screen name="NgoTrees" component={NgoTreesScreen} />
          <Stack.Screen name="NgoCreateAdoptableTree" component={NgoCreateAdoptableTreeScreen} />
          <Stack.Screen name="NgoRegister" component={NgoRegisterScreen} />
          <Stack.Screen name="NgoSettings" component={NgoSettingsScreen} />
          <Stack.Screen name="NgoStaff" component={NgoStaffScreen} />
          <Stack.Screen name="NgoCampaigns" component={NgoCampaignsScreen} />
          <Stack.Screen name="NgoCreateCampaign" component={NgoCreateCampaignScreen} />
          <Stack.Screen name="NgoReports" component={NgoReportsScreen} />
          <Stack.Screen name="NgoDonations" component={NgoDonationsScreen} />
          <Stack.Screen name="NgoVolunteers" component={NgoVolunteersScreen} />
          <Stack.Screen name="NgoLogPlantedTrees" component={NgoLogPlantedTreesScreen} />
          <Stack.Screen name="NgoHealthCheck" component={NgoHealthCheckScreen} />
          <Stack.Screen name="NgoPostUpdate" component={NgoPostUpdateScreen} />
          <Stack.Screen name="NgoDirectory" component={NgoDirectoryScreen} />
          <Stack.Screen name="NgoPublicProfile" component={NgoPublicProfileScreen} />
          <Stack.Screen name="FollowingFeed" component={FollowingFeedScreen} />
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
