import React, { useCallback, useEffect, useState } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { COLORS } from '../constants/colors';
import {
  useCorporateProfile,
  useUpdateCorporateProfile,
  useResubmitCorporateProfile,
  useSettings,
  useUpdateSettings,
  useSessions,
} from '../hooks/useApiQueries';
import { PickedPhoto } from '../components/common/PhotoPickerField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { Toggle } from '../components/common/Toggle';
import { SettingsRow, SettingsSectionHeader, SettingsDivider } from '../components/common/SettingsRow';
import { useSlideUp } from '../hooks/useAnimations';
import { useHaptics } from '../hooks/useHaptics';
import { useReduceMotionContext } from '../context/ReduceMotionContext';
import { useAuth } from '../context/AuthContext';
import { deleteAccount } from '../api/auth';
import { ApiError, resolveMediaUrl } from '../api/client';
import type { ApiUserSettings } from '../api/settings';
import { PRIVACY_POLICY_TEXT, TERMS_OF_SERVICE_TEXT } from '../constants/legalContent';
import { useConfirm } from '../context/ConfirmDialogContext';

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
  pinnedTimeTheme: null,
};

/** Sourced from app.json#expo.version via expo-constants — never hand-typed, so it can't drift. */
const appVersionLabel = Constants.expoConfig?.version ? `ARTH v${Constants.expoConfig.version}` : 'ARTH';

export function CorporateSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useCorporateProfile();
  const updateMutation = useUpdateCorporateProfile();
  const resubmitMutation = useResubmitCorporateProfile();
  // The corporate account's own login (email, logout, delete-account) is a regular User row (role
  // 'corporate') — these settings/session endpoints are already generic to any authenticated user,
  // so this screen reuses the exact same hooks the individual user's SettingsScreen does.
  const { user, logout } = useAuth();
  const { data: fetchedSettings } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const settings = fetchedSettings ?? DEFAULT_SETTINGS;
  const { override: reduceMotionOverride, setOverride: setReduceMotionOverride } = useReduceMotionContext();
  const { data: sessions } = useSessions();
  const confirm = useConfirm();

  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [logo, setLogo] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardAnim = useSlideUp(0, 24);
  const { medium } = useHaptics();
  const logoUri = logo?.uri ?? resolveMediaUrl(profile?.logoUrl) ?? null;

  const toggle = (key: keyof ApiUserSettings) => {
    updateSettingsMutation.mutate({ [key]: !settings[key] });
  };

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleDeleteAccount = () => {
    confirm(
      'Delete Account',
      'This permanently deletes your corporate account and cannot be undone. Are you sure?',
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

  useEffect(() => {
    if (!profile) return;
    setCompanyName(profile.companyName);
    setDescription(profile.description);
    setIndustry(profile.industry ?? '');
    setCity(profile.city ?? '');
  }, [profile]);

  const pickLogo = useCallback(async () => {
    medium();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const asset = !result.canceled ? result.assets[0] : undefined;
    if (asset) {
      setLogo({ uri: asset.uri, name: asset.fileName ?? 'logo.jpg', type: asset.mimeType ?? 'image/jpeg' });
    }
  }, [medium]);

  const handleSave = async () => {
    setError(null);
    try {
      await updateMutation.mutateAsync({
        companyName: companyName.trim(),
        description: description.trim(),
        industry: industry.trim() || undefined,
        city: city.trim() || undefined,
        logo: logo ?? undefined,
      });
      confirm('Saved', 'Your company profile has been updated.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your profile. Please try again.');
    }
  };

  const handleResubmit = () => {
    confirm('Resubmit for review?', 'Your account will go back into the review queue.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resubmit', onPress: () => resubmitMutation.mutate() },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Settings"
        subtitle="Company profile, preferences, and account"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <SettingsSectionHeader title="Company Profile" />
          <Animated.View style={cardAnim}>
            <View style={styles.logoWrap}>
              <TouchableOpacity onPress={pickLogo} activeOpacity={0.85} style={styles.logoCircle}>
                {logoUri ? <Image source={{ uri: logoUri }} style={styles.logoImage} /> : <Text style={styles.logoPlaceholder}>Logo</Text>}
                <View style={styles.logoEditBadge}>
                  <Text style={styles.logoEditIcon}>✎</Text>
                </View>
              </TouchableOpacity>
            </View>

            <FormField label="Company Name" value={companyName} onChangeText={setCompanyName} placeholder="Your company" />
            <FormField label="Description" value={description} onChangeText={setDescription} multiline placeholder="What does your company do?" />
            <FormField label="Industry" value={industry} onChangeText={setIndustry} placeholder="Industry" />
            <FormField label="City" value={city} onChangeText={setCity} placeholder="City" />

            {error && <Text style={styles.error}>{error}</Text>}

            <AnimatedButton
              label={updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              onPress={handleSave}
              disabled={updateMutation.isPending}
              fullWidth
              gradientColors={[COLORS.forest, COLORS.forestDeep]}
              style={styles.submitButton}
            />

            {profile?.status === 'rejected' && (
              <View style={styles.rejectedCard}>
                {profile.rejectionReason && <Text style={styles.rejectedReason}>{profile.rejectionReason}</Text>}
                <TouchableOpacity onPress={handleResubmit} disabled={resubmitMutation.isPending}>
                  <Text style={styles.resubmitText}>{resubmitMutation.isPending ? 'Resubmitting…' : 'Resubmit for review'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>

          {/* Experience */}
          <SettingsSectionHeader title="Experience" />
          <BorderCard noPadding>
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
              sublabel="Calmer visuals – pauses ambient animation"
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
          </BorderCard>

          {/* Notifications */}
          <SettingsSectionHeader title="Notifications" />
          <BorderCard noPadding>
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
              sublabel="Get reminded before your company's streak breaks"
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
          </BorderCard>

          {/* Privacy */}
          <SettingsSectionHeader title="Privacy & Data" />
          <BorderCard noPadding>
            <SettingsRow
              icon="👁️"
              label="Public Profile"
              sublabel="Let others see your company's forest and stats"
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
          </BorderCard>

          {/* Account */}
          <SettingsSectionHeader title="Account" />
          <BorderCard noPadding>
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
          </BorderCard>

          {/* Safety */}
          <SettingsSectionHeader title="Safety" />
          <BorderCard noPadding>
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
          </BorderCard>

          {/* About */}
          <SettingsSectionHeader title="About" />
          <BorderCard noPadding>
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
          </BorderCard>

          {/* Danger zone */}
          <SettingsSectionHeader title="Account Actions" />
          <BorderCard noPadding>
            <SettingsRow icon="🚪" label="Log Out" accent={COLORS.earth} onPress={handleLogout} />
            <SettingsDivider />
            <SettingsRow icon="🗑️" label="Delete Account" accent={COLORS.coral} dangerous onPress={handleDeleteAccount} />
          </BorderCard>

          <View style={styles.footer}>
            <Text style={styles.footerEmoji}>🌱</Text>
            <Text style={styles.footerText}>{appVersionLabel} – Made with love for the planet</Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  logoWrap: { alignItems: 'center', marginTop: 8, marginBottom: 4 },
  logoCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.beige,
    borderWidth: 1,
    borderColor: COLORS.sand,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  logoImage: { width: 104, height: 104, borderRadius: 52 },
  logoPlaceholder: { fontSize: 14, color: COLORS.textMuted, fontWeight: '600' },
  logoEditBadge: {
    position: 'absolute',
    right: 0,
    bottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.forest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.cream,
  },
  logoEditIcon: { fontSize: 13, color: COLORS.white, fontWeight: '700' },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { marginTop: 20 },
  rejectedCard: { marginTop: 20, padding: 16, borderRadius: 14, backgroundColor: 'rgba(226,90,80,0.1)' },
  rejectedReason: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  resubmitText: { fontSize: 13, color: COLORS.forest, fontWeight: '700', textAlign: 'center' },
  footer: { alignItems: 'center', gap: 6, paddingVertical: 16, marginTop: 8 },
  footerEmoji: { fontSize: 24 },
  footerText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
});
