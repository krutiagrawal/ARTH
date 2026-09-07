import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Linking } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import Constants from 'expo-constants';
import { GlassCard } from '../components/common/GlassCard';
import { Toggle } from '../components/common/Toggle';
import { useFadeIn, useSlideUp } from '../hooks/useAnimations';
import { useReduceMotionContext } from '../context/ReduceMotionContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmDialogContext';
import { useSettings, useUpdateSettings, useSessions } from '../hooks/useApiQueries';
import { deleteAccount } from '../api/auth';
import type { ApiUserSettings } from '../api/settings';
import { PRIVACY_POLICY_TEXT, TERMS_OF_SERVICE_TEXT } from '../constants/legalContent';
import { SettingsRow, SettingsSectionHeader, SettingsDivider } from '../components/common/SettingsRow';

const DEFAULT_SETTINGS: ApiUserSettings = {
  haptics: true,
  notifications: true,
  ambientMode: false,
  sounds: true,
  darkMode: false,
  streakReminders: true,
  locationTracking: true,
  publicProfile: true,
  analyticsEnabled: true,
};

const { width: SW } = Dimensions.get('window');
/** Sourced from app.json#expo.version via expo-constants — never hand-typed, so it can't drift. */
const appVersionLabel = Constants.expoConfig?.version ? `ARTH v${Constants.expoConfig.version}` : 'ARTH';

interface ToggleItem {
  id: string;
  icon: string;
  label: string;
  sublabel: string;
  value: boolean;
  accentColor: string;
}

export function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: fetchedSettings } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const settings = fetchedSettings ?? DEFAULT_SETTINGS;
  const { override: reduceMotionOverride, setOverride: setReduceMotionOverride } = useReduceMotionContext();
  const confirm = useConfirm();

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleDeleteAccount = () => {
    confirm(
      'Delete Account',
      'This permanently deletes your account and cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
            await logout();
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ]
    );
  };

  // "auto" has no backend equivalent (only a `darkMode` boolean, and no screen currently re-skins for it) —
  // both light/auto persist as darkMode:false, this selector is cosmetic-only until dark mode is implemented.
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'auto'>(
    settings.darkMode ? 'dark' : 'light'
  );

  const toggle = (key: keyof ApiUserSettings) => {
    updateSettingsMutation.mutate({ [key]: !settings[key] });
  };

  const handleThemeSelect = (opt: 'light' | 'dark' | 'auto') => {
    setSelectedTheme(opt);
    updateSettingsMutation.mutate({ darkMode: opt === 'dark' });
  };

  const fadeStyle = useFadeIn(0);
  const { data: sessions } = useSessions();

  const handleSendFeedback = async () => {
    const url = 'mailto:support@plantapp.example?subject=ARTH%20Feedback';
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      confirm('No email app found', 'Please email us directly at support@plantapp.example');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation?.goBack?.()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIconDark}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitleDark}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <Animated.View style={fadeStyle}>
          <LinearGradient
            colors={[COLORS.forest, COLORS.sageDark]}
            style={styles.profileCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.profileCardAvatar}>
              <Text style={styles.profileCardEmoji}>{user?.avatarEmoji ?? '🧑‍🌾'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileCardName}>{user?.name ?? 'Planter'}</Text>
              <Text style={styles.profileCardHandle}>@{user?.handle ?? ''}</Text>
            </View>
            <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.editProfileText}>Edit</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Experience */}
        <SettingsSectionHeader title="Experience" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow
            icon="🌟"
            label="Ambient Mode"
            sublabel="Immersive background sounds & animations"
            accent={COLORS.golden}
            rightElement={
              <Toggle
                value={settings.ambientMode}
                onValueChange={() => toggle('ambientMode')}
                offColor={COLORS.sand}
                onColor={COLORS.golden}
              />
            }
          />
          <SettingsDivider />
          <SettingsRow
            icon="🔊"
            label="Nature Sounds"
            sublabel="Ambient forest & rain sounds"
            accent={COLORS.sage}
            rightElement={
              <Toggle
                value={settings.sounds}
                onValueChange={() => toggle('sounds')}
                offColor={COLORS.sand}
                onColor={COLORS.sage}
              />
            }
          />
          <SettingsDivider />
          <SettingsRow
            icon="📳"
            label="Haptic Feedback"
            sublabel="Tactile responses on interactions"
            accent={COLORS.earth}
            rightElement={
              <Toggle
                value={settings.haptics}
                onValueChange={() => toggle('haptics')}
                offColor={COLORS.sand}
                onColor={COLORS.earth}
              />
            }
          />
          <SettingsDivider />
          <SettingsRow
            icon="🧘"
            label="Reduce Motion"
            sublabel="Calmer visuals — pauses ambient animation"
            accent={COLORS.textMuted}
            rightElement={
              <Toggle
                value={reduceMotionOverride === true}
                onValueChange={(v) => setReduceMotionOverride(v ? true : null)}
                offColor={COLORS.sand}
                onColor={COLORS.textMuted}
              />
            }
          />
        </GlassCard>

        {/* Theme */}
        <SettingsSectionHeader title="Appearance" />
        <GlassCard variant="dark" style={styles.themeSection}>
          <Text style={styles.themeSectionLabelDark}>App Theme</Text>
          <View style={styles.themeOptions}>
            {(['light', 'dark', 'auto'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.themeOptionDark, selectedTheme === opt && styles.themeOptionSelected]}
                onPress={() => handleThemeSelect(opt)}
              >
                <Text style={styles.themeOptionIcon}>
                  {opt === 'light' ? '☀️' : opt === 'dark' ? '🌙' : '🔄'}
                </Text>
                <Text style={[styles.themeOptionLabelDark, selectedTheme === opt && styles.themeOptionLabelSelected]}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* Notifications */}
        <SettingsSectionHeader title="Notifications" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow
            icon="🔔"
            label="Push Notifications"
            sublabel="Daily reminders and achievements"
            accent={COLORS.xpBlue}
            rightElement={
              <Toggle
                value={settings.notifications}
                onValueChange={() => toggle('notifications')}
                offColor={COLORS.sand}
                onColor={COLORS.xpBlue}
              />
            }
          />
          <SettingsDivider />
          <SettingsRow
            icon="🔥"
            label="Streak Reminders"
            sublabel="Get reminded before your streak breaks"
            accent={COLORS.streakFire}
            rightElement={
              <Toggle
                value={settings.streakReminders}
                onValueChange={() => toggle('streakReminders')}
                offColor={COLORS.sand}
                onColor={COLORS.streakFire}
              />
            }
          />
        </GlassCard>

        {/* Privacy */}
        <SettingsSectionHeader title="Privacy & Data" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow
            icon="📍"
            label="Location Tracking"
            sublabel="Tag your planted trees with location"
            accent={COLORS.earth}
            rightElement={
              <Toggle
                value={settings.locationTracking}
                onValueChange={() => toggle('locationTracking')}
                offColor={COLORS.sand}
                onColor={COLORS.earth}
              />
            }
          />
          <SettingsDivider />
          <SettingsRow
            icon="👁️"
            label="Public Profile"
            sublabel="Let others see your forest and stats"
            accent={COLORS.sage}
            rightElement={
              <Toggle
                value={settings.publicProfile}
                onValueChange={() => toggle('publicProfile')}
                offColor={COLORS.sand}
                onColor={COLORS.sage}
              />
            }
          />
          <SettingsDivider />
          <SettingsRow
            icon="📊"
            label="Usage Analytics"
            sublabel="Help improve the app"
            accent={COLORS.textMuted}
            rightElement={
              <Toggle
                value={settings.analyticsEnabled}
                onValueChange={() => toggle('analyticsEnabled')}
                offColor={COLORS.sand}
                onColor={COLORS.sage}
              />
            }
          />
        </GlassCard>

        {/* Account */}
        <SettingsSectionHeader title="Account" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow icon="📧" label="Email" sublabel={user?.email ?? ''} accent={COLORS.xpBlue} />
          <SettingsDivider />
          <SettingsRow icon="🔒" label="Change Password" accent={COLORS.earth} onPress={() => navigation.navigate('ChangePassword')} />
          <SettingsDivider />
          <SettingsRow
            icon="📱"
            label="Connected Devices"
            sublabel={sessions ? `${sessions.length} device${sessions.length === 1 ? '' : 's'}` : '...'}
            accent={COLORS.sage}
            onPress={() => navigation.navigate('Sessions')}
          />
          <SettingsDivider />
          <SettingsRow
            icon="🌱"
            label="My Sapling Reservations"
            sublabel="Requests you've sent to nurseries"
            accent={COLORS.earth}
            onPress={() => navigation.navigate('MySaplingReservations')}
          />
          <SettingsDivider />
          <SettingsRow
            icon="📦"
            label="My Orders"
            sublabel="Saplings you've bought and their delivery status"
            accent={COLORS.golden}
            onPress={() => navigation.navigate('MyOrders')}
          />
          <SettingsDivider />
          <SettingsRow
            icon="♥"
            label="Wishlist"
            sublabel="Nurseries and saplings you've saved"
            accent={COLORS.coral}
            onPress={() => navigation.navigate('Wishlist')}
          />
          <SettingsDivider />
          <SettingsRow
            icon="📍"
            label="Delivery Addresses"
            sublabel="Manage saved addresses"
            accent={COLORS.sage}
            onPress={() => navigation.navigate('AddressBook')}
          />
          <SettingsDivider />
          <SettingsRow
            icon="🌳"
            label="My Adopted Trees"
            sublabel="Trees you're caring for"
            accent={COLORS.forest}
            onPress={() => navigation.navigate('MyAdoptions')}
          />
        </GlassCard>

        {/* Safety */}
        <SettingsSectionHeader title="Safety" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow
            icon="🚫"
            label="Blocked Accounts"
            sublabel="People and organisations you have hidden"
            accent={COLORS.coral}
            onPress={() => navigation.navigate('BlockedAccounts')}
          />
          <SettingsDivider />
          <SettingsRow
            icon="🔔"
            label="Notifications"
            sublabel="Follows, likes and updates"
            accent={COLORS.amber}
            onPress={() => navigation.navigate('Notifications')}
          />
        </GlassCard>

        {/* About */}
        <SettingsSectionHeader title="About" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow icon="ℹ️" label="App Version" sublabel={appVersionLabel} accent={COLORS.textMuted} />
          <SettingsDivider />
          <SettingsRow
            icon="📜"
            label="Privacy Policy"
            accent={COLORS.textMuted}
            onPress={() => navigation.navigate('StaticContent', { title: 'Privacy Policy', body: PRIVACY_POLICY_TEXT })}
          />
          <SettingsDivider />
          <SettingsRow
            icon="⚖️"
            label="Terms of Service"
            accent={COLORS.textMuted}
            onPress={() => navigation.navigate('StaticContent', { title: 'Terms of Service', body: TERMS_OF_SERVICE_TEXT })}
          />
          <SettingsDivider />
          <SettingsRow icon="💌" label="Send Feedback" accent={COLORS.sage} onPress={handleSendFeedback} />
        </GlassCard>

        {/* Danger zone */}
        <SettingsSectionHeader title="Account Actions" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow icon="🚪" label="Log Out" accent={COLORS.earth} onPress={handleLogout} />
          <SettingsDivider />
          <SettingsRow icon="🗑️" label="Delete Account" accent={COLORS.coral} dangerous onPress={handleDeleteAccount} />
        </GlassCard>

        <View style={styles.footer}>
          <Text style={styles.footerEmoji}>🌱</Text>
          <Text style={styles.footerTextDark}>{appVersionLabel} — Made with love for the planet</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
  },
  backBlur: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backIconDark: {
    fontSize: 18,
    color: COLORS.white,
    fontWeight: '700',
  },
  headerTitleDark: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  profileCard: {
    borderRadius: RADIUS.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.sage,
  },
  profileCardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCardEmoji: {
    fontSize: 28,
  },
  profileCardName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.white,
  },
  profileCardHandle: {
    fontSize: 13,
    color: COLORS.white,
    marginTop: 1,
  },
  editProfileButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.white,
  },
  themeSection: {
    gap: 12,
  },
  themeSectionLabelDark: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOptionDark: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    gap: 4,
  },
  themeOptionSelected: {
    borderColor: COLORS.sage,
    backgroundColor: 'rgba(135,168,120,0.22)',
  },
  themeOptionIcon: {
    fontSize: 22,
  },
  themeOptionLabelDark: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  themeOptionLabelSelected: {
    color: COLORS.sageLight,
  },
  footer: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  footerEmoji: {
    fontSize: 24,
  },
  footerTextDark: {
    fontSize: 12,
    color: COLORS.white,
    textAlign: 'center',
  },
});
