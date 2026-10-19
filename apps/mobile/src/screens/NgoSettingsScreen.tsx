import React, { useCallback, useMemo, useState } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { useNgoProfile, useUpdateNgoProfile, useSettings } from '../hooks/useApiQueries';
import { getThemeForHour, PERIOD_HOUR, type TimePeriod } from '../hooks/useTimeTheme';
import { SettingsRow, SettingsDivider } from '../components/common/SettingsRow';
import { BorderCard } from '../components/common/BorderCard';
import { Toggle } from '../components/common/Toggle';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useHaptics } from '../hooks/useHaptics';
import { ApiError, resolveMediaUrl } from '../api/client';
import { useConfirm } from '../context/ConfirmDialogContext';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { NGO_PROFILE_SECTIONS, type NgoProfileSectionId } from '../constants/ngoProfileSections';
import { sectionProgress } from '../utils/ngoProfileForm';

const STATUS_PILL: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: COLORS.forest },
  pending: { label: 'Under review', color: COLORS.golden },
  rejected: { label: 'Not approved', color: COLORS.danger },
  suspended: { label: 'Suspended', color: COLORS.danger },
};

// Rows on the profile hub, grouped the way people think about their organisation. Each opens its own
// screen (NgoProfileSectionScreen) with just those fields and its own Save.
const GROUPS: { title: string; sections: NgoProfileSectionId[] }[] = [
  { title: 'Your organisation', sections: ['basic', 'organisation', 'people'] },
  { title: 'Credentials', sections: ['legal', 'awards'] },
  { title: 'Work & impact', sections: ['work', 'plantation', 'links', 'arth'] },
];

export function NgoSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: profile, refetch } = useNgoProfile();
  const updateMutation = useUpdateNgoProfile();
  const { data: settings } = useSettings();
  const confirm = useConfirm();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const { medium } = useHaptics();

  // Preview of a just-picked logo while it uploads; the stored one is a host-relative `/uploads/...`
  // path that needs resolving against the API host.
  const [pickedLogoUri, setPickedLogoUri] = useState<string | null>(null);
  const logoUri = pickedLogoUri ?? resolveMediaUrl(profile?.logoUrl) ?? null;
  const approvalRequired = profile?.followPolicy === 'approval';
  const legalLocked = profile?.status === 'approved' || profile?.status === 'suspended';

  const progress = useMemo(() => {
    if (!profile) return null;
    const ids = Object.keys(NGO_PROFILE_SECTIONS) as NgoProfileSectionId[];
    const per = ids.map((id) => ({ id, ...sectionProgress(profile, id) }));
    const filled = per.reduce((n, s) => n + s.filled, 0) + (logoUri ? 1 : 0);
    const total = per.reduce((n, s) => n + s.total, 0) + 1;
    return { bySection: Object.fromEntries(per.map((s) => [s.id, s])), percent: Math.round((filled / total) * 100) };
  }, [profile, logoUri]);

  const handleToggleApprovalRequired = useCallback(
    (value: boolean) => updateMutation.mutate({ followPolicy: value ? 'approval' : 'open' }),
    [updateMutation],
  );

  /** The logo saves as soon as it's picked - it's a photo, not a field you'd want to batch up and forget. */
  const pickLogo = useCallback(async () => {
    medium();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    const asset = !result.canceled ? result.assets[0] : undefined;
    if (!asset) return;
    setPickedLogoUri(asset.uri);
    try {
      await updateMutation.mutateAsync({
        logo: { uri: asset.uri, name: asset.fileName ?? 'logo.jpg', type: asset.mimeType ?? 'image/jpeg' },
      });
      confirm('Saved', 'Your logo has been updated.');
    } catch (e) {
      setPickedLogoUri(null);
      confirm('Could not update logo', e instanceof ApiError ? e.message : 'Please try again.');
    } finally {
      // Whether it worked or not, fall back to the stored logo (refetched by the mutation on success).
      setPickedLogoUri(null);
    }
  }, [medium, updateMutation, confirm]);

  const pill = profile ? STATUS_PILL[profile.status] ?? STATUS_PILL.pending : STATUS_PILL.pending;

  const rowHint = (id: NgoProfileSectionId) => {
    const p = progress?.bySection[id] as { filled: number; total: number } | undefined;
    if (id === 'legal' && legalLocked) return 'Verified – locked after approval';
    if (!p) return NGO_PROFILE_SECTIONS[id].subtitle;
    return p.filled >= p.total ? 'Complete' : `${p.filled} of ${p.total} filled`;
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="NGO Profile"
        subtitle="Tell people about your organization"
        onBack={() => navigation?.goBack?.()}
        right={
          <TouchableOpacity onPress={() => navigation?.navigate('Settings')} style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        }
      />

      {!profile ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          {profile.status === 'rejected' && !!profile.rejectionReason && (
            <View style={styles.statusBanner}>
              <Text style={styles.statusBannerText}>Status: rejected – {profile.rejectionReason}</Text>
            </View>
          )}

          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={pickLogo} activeOpacity={0.85} style={styles.logoCircle} disabled={updateMutation.isPending}>
              {logoUri ? <Image source={{ uri: logoUri }} style={styles.logoImage} /> : <Text style={styles.logoPlaceholder}>Logo</Text>}
              <View style={styles.logoEditBadge}>
                <Text style={styles.logoEditIcon}>✎</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>{profile.orgName.trim() || 'Your organisation'}</Text>
              <View style={[styles.statusPill, { borderColor: pill.color }]}>
                <View style={[styles.statusDot, { backgroundColor: pill.color }]} />
                <Text style={[styles.statusPillText, { color: pill.color }]}>{pill.label}</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progress?.percent ?? 0}%` }]} />
              </View>
              <Text style={styles.progressText}>Profile {progress?.percent ?? 0}% complete</Text>
            </View>
          </View>

          <View style={styles.policyCard}>
            <View style={styles.policyText}>
              <Text style={styles.policyTitle}>Approve each follower</Text>
              <Text style={styles.policyBody}>
                {approvalRequired
                  ? 'People have to ask before they can follow you. Requests appear in Community → Requests.'
                  : 'Anyone can follow you straight away and start seeing your updates.'}
              </Text>
            </View>
            <Toggle value={approvalRequired} onValueChange={handleToggleApprovalRequired} />
          </View>

          <Text style={styles.appearanceLabel}>Appearance</Text>
          <BorderCard noPadding style={styles.appearanceCard}>
            <SettingsRow
              variant="light"
              icon="🎨"
              label="Homepage Theme"
              sublabel={
                settings?.pinnedTimeTheme
                  ? `${getThemeForHour(PERIOD_HOUR[settings.pinnedTimeTheme as TimePeriod]).label} – always`
                  : 'Auto – changes with time of day'
              }
              accent={COLORS.golden}
              onPress={() => navigation.navigate('HomeThemePicker', { current: settings?.pinnedTimeTheme ?? null, role: 'ngo' })}
            />
          </BorderCard>

          {GROUPS.map((group) => (
            <View key={group.title}>
              <Text style={styles.sectionLabel}>{group.title}</Text>
              <BorderCard noPadding style={styles.groupCard}>
                {group.sections.map((id, i) => (
                  <React.Fragment key={id}>
                    {i > 0 && <SettingsDivider variant="light" />}
                    <SettingsRow
                      variant="light"
                      icon={NGO_PROFILE_SECTIONS[id].emoji}
                      label={NGO_PROFILE_SECTIONS[id].title}
                      sublabel={rowHint(id)}
                      accent={progress?.bySection[id] && progress.bySection[id].filled >= progress.bySection[id].total ? COLORS.forest : COLORS.golden}
                      onPress={() => navigation.navigate('NgoProfileSection', { section: id })}
                    />
                  </React.Fragment>
                ))}
              </BorderCard>
            </View>
          ))}

          <Text style={styles.sectionLabel}>Team</Text>
          <BorderCard noPadding style={styles.groupCard}>
            <SettingsRow
              variant="light"
              icon="🧑‍🤝‍🧑"
              label="Staff roster"
              sublabel="Your team, shown on your public profile"
              accent={COLORS.forest}
              onPress={() => navigation.navigate('NgoStaff')}
            />
          </BorderCard>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  settingsButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  settingsIcon: { fontSize: 18 },
  statusBanner: { backgroundColor: 'rgba(232,168,75,0.18)', borderRadius: RADIUS.md, padding: 10, marginBottom: 8 },
  statusBannerText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },

  profileHeader: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
  logoCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: COLORS.beige,
    borderWidth: 1,
    borderColor: COLORS.sand,
    alignItems: 'center',
    justifyContent: 'center',
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
  headerInfo: { alignSelf: 'stretch', alignItems: 'center', gap: 8, marginTop: 14 },
  headerName: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  progressTrack: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: COLORS.sand, overflow: 'hidden', marginTop: 4 },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: COLORS.sage },
  progressText: { fontSize: 11, color: COLORS.textMuted },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 22, marginBottom: 8, paddingHorizontal: 4 },
  groupCard: { marginTop: 0 },
  appearanceLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginTop: 20 },
  appearanceCard: { marginTop: 8 },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 12,
  },
  policyText: { flex: 1 },
  policyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  policyBody: { fontSize: 12, lineHeight: 17, color: COLORS.textMuted, marginTop: 3 },
});
