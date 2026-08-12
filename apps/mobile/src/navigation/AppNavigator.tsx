import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
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
import { MapScreen } from '../screens/MapScreen';
import { CommunityScreen } from '../screens/CommunityScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { StreakProtectionScreen } from '../screens/StreakProtectionScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ChangePasswordScreen } from '../screens/ChangePasswordScreen';
import { SessionsScreen } from '../screens/SessionsScreen';
import { StaticContentScreen } from '../screens/StaticContentScreen';
import { EditProfileScreen } from '../screens/EditProfileScreen';

import { BottomNav, TabName } from '../components/navigation/BottomNav';
import { useTimeTheme } from '../hooks/useTimeTheme';

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
        return <MapScreen navigation={navigation} />;
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
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
});
