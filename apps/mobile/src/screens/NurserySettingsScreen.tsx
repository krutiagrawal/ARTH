import React, { useState } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { useNurseryProfile, useSettings, useUpdateSettings, useSessions } from '../hooks/useApiQueries';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BlurCard } from '../components/common/GlassCard';
import { Toggle } from '../components/common/Toggle';
import { SettingsRow, SettingsSectionHeader, SettingsDivider } from '../components/common/SettingsRow';
import { useFadeIn } from '../hooks/useAnimations';
import { useReduceMotionContext } from '../context/ReduceMotionContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmDialogContext';
import { deleteAccount } from '../api/auth';
import { resolveMediaUrl } from '../api/client';
import type { ApiUserSettings } from '../api/settings';
import { PRIVACY_POLICY_TEXT, TERMS_OF_SERVICE_TEXT } from '../constants/legalContent';

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

/** Sourced from app.json#expo.version via expo-constants — never hand-typed, so it can't drift. */
const appVersionLabel = Constants.expoConfig?.version ? `ARTH v${Constants.expoConfig.version}` : 'ARTH';

export function NurserySettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useNurseryProfile();
  // The nursery account's own login (email, logout, delete-account) is a regular User row (role
  // 'nursery') — these settings/session endpoints are already generic to any authenticated user,
  // so this screen reuses the exact same hooks the individual user's SettingsScreen does. Profile
  // identity (logo/name/description/city/phone/location) lives on its own NurseryProfileScreen —
  // this screen is preferences and account only.
  const { user, logout } = useAuth();
  const { data: fetchedSettings } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const settings = fetchedSettings ?? DEFAULT_SETTINGS;
  const { override: reduceMotionOverride, setOverride: setReduceMotionOverride } = useReduceMotionContext();
  const { data: sessions } = useSessions();
  const confirm = useConfirm();

  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'auto'>(
    settings.darkMode ? 'dark' : 'light'
  );
  const fadeStyle = useFadeIn(0);
  const logoUri = resolveMediaUrl(profile?.logoUrl) ?? null;

  const toggle = (key: keyof ApiUserSettings) => {
    updateSettingsMutation.mutate({ [key]: !settings[key] });
  };

  const handleThemeSelect = (opt: 'light' | 'dark' | 'auto') => {
    setSelectedTheme(opt);
    updateSettingsMutation.mutate({ darkMode: opt === 'dark' });
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleDeleteAccount = () => {
    confirm(
      'Delete Account',
      'This permanently deletes your nursery account and cannot be undone. Are you sure?',
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

      <ScreenHeader
        title="Settings"
        subtitle="Preferences and account"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {/* Profile card — a shortcut, not the profile itself */}
          <Animated.View style={fadeStyle}>
            <LinearGradient colors={[COLORS.forest, COLORS.sageDark]} style={styles.profileCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.profileCardAvatar}>
                {logoUri ? <Image source={{ uri: logoUri }} style={styles.profileCardLogo} /> : <Text style={styles.profileCardEmoji}>🌿</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.profileCardName} numberOfLines={1}>{profile?.nurseryName ?? 'Your nursery'}</Text>
                {profile?.city ? <Text style={styles.profileCardHandle}>📍 {profile.city}</Text> : null}
              </View>
              <TouchableOpacity style={styles.editProfileButton} onPress={() => navigation.navigate('NurseryProfile')}>
                <Text style={styles.editProfileText}>Edit</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          {/* Experience */}
          <SettingsSectionHeader title="Experience" />
          <BlurCard tint="light" noPadding>
            <SettingsRow
              variant="light"
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
            <SettingsDivider variant="light" />
            <SettingsRow
              variant="light"
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
            <SettingsDivider variant="light" />
            <SettingsRow
              variant="light"
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
            <SettingsDivider variant="light" />
            <SettingsRow
              variant="light"
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
          </BlurCard>

          {/* Theme */}
          <SettingsSectionHeader title="Appearance" />
          <BlurCard tint="light" style={styles.themeSection}>
            <Text style={styles.themeSectionLabel}>App Theme</Text>
            <View style={styles.themeOptions}>
              {(['light', 'dark', 'auto'] as const).map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.themeOption, selectedTheme === opt && styles.themeOptionSelected]}
                  onPress={() => handleThemeSelect(opt)}
                >
                  <Text style={styles.themeOptionIcon}>{opt === 'light' ? '☀️' : opt === 'dark' ? '🌙' : '🔄'}</Text>
                  <Text style={[styles.themeOptionLabel, selectedTheme === opt && styles.themeOptionLabelSelected]}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </BlurCard>

          {/* Notifications */}
          <SettingsSectionHeader title="Notifications" />
          <BlurCard tint="light" noPadding>
            <SettingsRow
              variant="light"
              icon="🔔"
              label="Push Notifications"
              sublabel="Reservation requests and updates"
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
            <SettingsDivider variant="light" />
            <SettingsRow
              variant="light"
              icon="🔥"
              label="Streak Reminders"
              sublabel="Get reminded before your nursery's streak breaks"
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
          </BlurCard>

          {/* Privacy */}
          <SettingsSectionHeader title="Privacy & Data" />
          <BlurCard tint="light" noPadding>
            <SettingsRow
              variant="light"
              icon="👁️"
              label="Public Profile"
              sublabel="Let planters find you and browse your stock"
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
            <SettingsDivider variant="light" />
            <SettingsRow
              variant="light"
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
          </BlurCard>

          {/* Account */}
          <SettingsSectionHeader title="Account" />
          <BlurCard tint="light" noPadding>
            <SettingsRow variant="light" icon="📧" label="Email" sublabel={user?.email ?? ''} accent={COLORS.xpBlue} />
            <SettingsDivider variant="light" />
            <SettingsRow variant="light" icon="🔒" label="Change Password" accent={COLORS.earth} onPress={() => navigation.navigate('ChangePassword')} />
            <SettingsDivider variant="light" />
            <SettingsRow
              variant="light"
              icon="📱"
              label="Connected Devices"
              sublabel={sessions ? `${sessions.length} device${sessions.length === 1 ? '' : 's'}` : '...'}
              accent={COLORS.sage}
              onPress={() => navigation.navigate('Sessions')}
            />
          </BlurCard>

          {/* Safety */}
          <SettingsSectionHeader title="Safety" />
          <BlurCard tint="light" noPadding>
            <SettingsRow
              variant="light"
              icon="🚫"
              label="Blocked Accounts"
              sublabel="People and organisations you have hidden"
              accent={COLORS.coral}
              onPress={() => navigation.navigate('BlockedAccounts')}
            />
            <SettingsDivider variant="light" />
            <SettingsRow
              variant="light"
              icon="🔔"
              label="Notifications"
              sublabel="Reservation requests and updates"
              accent={COLORS.amber}
              onPress={() => navigation.navigate('Notifications')}
            />
          </BlurCard>

          {/* About */}
          <SettingsSectionHeader title="About" />
          <BlurCard tint="light" noPadding>
            <SettingsRow variant="light" icon="ℹ️" label="App Version" sublabel={appVersionLabel} accent={COLORS.textMuted} />
            <SettingsDivider variant="light" />
            <SettingsRow
              variant="light"
              icon="📜"
              label="Privacy Policy"
              accent={COLORS.textMuted}
              onPress={() => navigation.navigate('StaticContent', { title: 'Privacy Policy', body: PRIVACY_POLICY_TEXT })}
            />
            <SettingsDivider variant="light" />
            <SettingsRow
              variant="light"
              icon="⚖️"
              label="Terms of Service"
              accent={COLORS.textMuted}
              onPress={() => navigation.navigate('StaticContent', { title: 'Terms of Service', body: TERMS_OF_SERVICE_TEXT })}
            />
            <SettingsDivider variant="light" />
            <SettingsRow variant="light" icon="💌" label="Send Feedback" accent={COLORS.sage} onPress={handleSendFeedback} />
          </BlurCard>

          {/* Danger zone */}
          <SettingsSectionHeader title="Account Actions" />
          <BlurCard tint="light" noPadding>
            <SettingsRow variant="light" icon="🚪" label="Log Out" accent={COLORS.earth} onPress={handleLogout} />
            <SettingsDivider variant="light" />
            <SettingsRow variant="light" icon="🗑️" label="Delete Account" accent={COLORS.coral} dangerous onPress={handleDeleteAccount} />
          </BlurCard>

          <View style={styles.footer}>
            <Text style={styles.footerEmoji}>🌱</Text>
            <Text style={styles.footerText}>{appVersionLabel} — Made with love for the planet</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  profileCard: {
    borderRadius: RADIUS.xl,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  profileCardAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  profileCardLogo: { width: 52, height: 52 },
  profileCardEmoji: { fontSize: 26 },
  profileCardName: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  profileCardHandle: { fontSize: 13, color: COLORS.white, marginTop: 1 },
  editProfileButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  editProfileText: { fontSize: 13, fontWeight: '600', color: COLORS.white },
  themeSection: { gap: 12, marginTop: 8 },
  themeSectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  themeOptions: { flexDirection: 'row', gap: 8 },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    backgroundColor: 'rgba(0,0,0,0.03)',
    gap: 4,
  },
  themeOptionSelected: { borderColor: COLORS.sage, backgroundColor: 'rgba(135,168,120,0.18)' },
  themeOptionIcon: { fontSize: 22 },
  themeOptionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  themeOptionLabelSelected: { color: COLORS.sageDark },
  footer: { alignItems: 'center', gap: 6, paddingVertical: 16, marginTop: 8 },
  footerEmoji: { fontSize: 24 },
  footerText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
});
