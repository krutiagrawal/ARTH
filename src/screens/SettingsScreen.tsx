import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import Constants from 'expo-constants';
import { GlassCard } from '../components/common/GlassCard';
import { useFadeIn, useSlideUp } from '../hooks/useAnimations';
import { useReduceMotionContext } from '../context/ReduceMotionContext';
import { useAuth } from '../context/AuthContext';
import { useSettings, useUpdateSettings, useSessions } from '../hooks/useApiQueries';
import { deleteAccount } from '../api/auth';
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

interface SettingsRowProps {
  icon: string;
  label: string;
  sublabel?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  accent?: string;
  dangerous?: boolean;
}

function SettingsRow({ icon, label, sublabel, onPress, rightElement, accent = COLORS.sage, dangerous = false }: SettingsRowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={styles.settingsRow}>
        <View style={[styles.settingsRowIcon, { backgroundColor: `${accent}20` }]}>
          <Text style={styles.settingsRowIconText}>{icon}</Text>
        </View>
        <View style={styles.settingsRowContent}>
          <Text style={[styles.settingsRowLabelDark, dangerous && styles.dangerLabel]}>{label}</Text>
          {sublabel && <Text style={styles.settingsRowSublabelDark}>{sublabel}</Text>}
        </View>
        {rightElement ?? (onPress && <Text style={styles.settingsRowArrowDark}>›</Text>)}
      </View>
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeaderDark}>{title}</Text>;
}

export function SettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { data: fetchedSettings } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const settings = fetchedSettings ?? DEFAULT_SETTINGS;
  const { override: reduceMotionOverride, setOverride: setReduceMotionOverride } = useReduceMotionContext();

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
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
      Alert.alert('No email app found', 'Please email us directly at support@plantapp.example');
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
        <SectionHeader title="Experience" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow
            icon="🌟"
            label="Ambient Mode"
            sublabel="Immersive background sounds & animations"
            accent={COLORS.golden}
            rightElement={
              <Switch
                value={settings.ambientMode}
                onValueChange={() => toggle('ambientMode')}
                trackColor={{ false: COLORS.sand, true: COLORS.golden }}
                thumbColor={COLORS.white}
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="🔊"
            label="Nature Sounds"
            sublabel="Ambient forest & rain sounds"
            accent={COLORS.sage}
            rightElement={
              <Switch
                value={settings.sounds}
                onValueChange={() => toggle('sounds')}
                trackColor={{ false: COLORS.sand, true: COLORS.sage }}
                thumbColor={COLORS.white}
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="📳"
            label="Haptic Feedback"
            sublabel="Tactile responses on interactions"
            accent={COLORS.earth}
            rightElement={
              <Switch
                value={settings.haptics}
                onValueChange={() => toggle('haptics')}
                trackColor={{ false: COLORS.sand, true: COLORS.earth }}
                thumbColor={COLORS.white}
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="🧘"
            label="Reduce Motion"
            sublabel="Calmer visuals — pauses ambient animation"
            accent={COLORS.textMuted}
            rightElement={
              <Switch
                value={reduceMotionOverride === true}
                onValueChange={(v) => setReduceMotionOverride(v ? true : null)}
                trackColor={{ false: COLORS.sand, true: COLORS.textMuted }}
                thumbColor={COLORS.white}
              />
            }
          />
        </GlassCard>

        {/* Theme */}
        <SectionHeader title="Appearance" />
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
        <SectionHeader title="Notifications" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow
            icon="🔔"
            label="Push Notifications"
            sublabel="Daily reminders and achievements"
            accent={COLORS.xpBlue}
            rightElement={
              <Switch
                value={settings.notifications}
                onValueChange={() => toggle('notifications')}
                trackColor={{ false: COLORS.sand, true: COLORS.xpBlue }}
                thumbColor={COLORS.white}
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="🔥"
            label="Streak Reminders"
            sublabel="Get reminded before your streak breaks"
            accent={COLORS.streakFire}
            rightElement={
              <Switch
                value={settings.streakReminders}
                onValueChange={() => toggle('streakReminders')}
                trackColor={{ false: COLORS.sand, true: COLORS.streakFire }}
                thumbColor={COLORS.white}
              />
            }
          />
        </GlassCard>

        {/* Privacy */}
        <SectionHeader title="Privacy & Data" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow
            icon="📍"
            label="Location Tracking"
            sublabel="Tag your planted trees with location"
            accent={COLORS.earth}
            rightElement={
              <Switch
                value={settings.locationTracking}
                onValueChange={() => toggle('locationTracking')}
                trackColor={{ false: COLORS.sand, true: COLORS.earth }}
                thumbColor={COLORS.white}
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="👁️"
            label="Public Profile"
            sublabel="Let others see your forest and stats"
            accent={COLORS.sage}
            rightElement={
              <Switch
                value={settings.publicProfile}
                onValueChange={() => toggle('publicProfile')}
                trackColor={{ false: COLORS.sand, true: COLORS.sage }}
                thumbColor={COLORS.white}
              />
            }
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="📊"
            label="Usage Analytics"
            sublabel="Help improve the app"
            accent={COLORS.textMuted}
            rightElement={
              <Switch
                value={settings.analyticsEnabled}
                onValueChange={() => toggle('analyticsEnabled')}
                trackColor={{ false: COLORS.sand, true: COLORS.sage }}
                thumbColor={COLORS.white}
              />
            }
          />
        </GlassCard>

        {/* Account */}
        <SectionHeader title="Account" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow icon="📧" label="Email" sublabel={user?.email ?? ''} accent={COLORS.xpBlue} />
          <View style={styles.divider} />
          <SettingsRow icon="🔒" label="Change Password" accent={COLORS.earth} onPress={() => navigation.navigate('ChangePassword')} />
          <View style={styles.divider} />
          <SettingsRow
            icon="📱"
            label="Connected Devices"
            sublabel={sessions ? `${sessions.length} device${sessions.length === 1 ? '' : 's'}` : '...'}
            accent={COLORS.sage}
            onPress={() => navigation.navigate('Sessions')}
          />
        </GlassCard>

        {/* About */}
        <SectionHeader title="About" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow icon="ℹ️" label="App Version" sublabel={appVersionLabel} accent={COLORS.textMuted} />
          <View style={styles.divider} />
          <SettingsRow
            icon="📜"
            label="Privacy Policy"
            accent={COLORS.textMuted}
            onPress={() => navigation.navigate('StaticContent', { title: 'Privacy Policy', body: PRIVACY_POLICY_TEXT })}
          />
          <View style={styles.divider} />
          <SettingsRow
            icon="⚖️"
            label="Terms of Service"
            accent={COLORS.textMuted}
            onPress={() => navigation.navigate('StaticContent', { title: 'Terms of Service', body: TERMS_OF_SERVICE_TEXT })}
          />
          <View style={styles.divider} />
          <SettingsRow icon="💌" label="Send Feedback" accent={COLORS.sage} onPress={handleSendFeedback} />
        </GlassCard>

        {/* Danger zone */}
        <SectionHeader title="Account Actions" />
        <GlassCard variant="dark" noPadding>
          <SettingsRow icon="🚪" label="Log Out" accent={COLORS.earth} onPress={handleLogout} />
          <View style={styles.divider} />
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
  sectionHeaderDark: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: -4,
    paddingHorizontal: 4,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  settingsRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowIconText: {
    fontSize: 20,
  },
  settingsRowContent: {
    flex: 1,
  },
  settingsRowLabelDark: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  dangerLabel: {
    color: COLORS.coral,
  },
  settingsRowSublabelDark: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 1,
  },
  settingsRowArrowDark: {
    fontSize: 20,
    color: COLORS.white,
    fontWeight: '300',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginLeft: 66,
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
