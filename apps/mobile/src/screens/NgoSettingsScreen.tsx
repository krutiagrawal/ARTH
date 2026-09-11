import React, { useCallback, useEffect, useState } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { useNgoProfile, useUpdateNgoProfile } from '../hooks/useApiQueries';
import { PickedPhoto } from '../components/common/PhotoPickerField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { CityPickerField } from '../components/common/CityPickerField';
import { Toggle } from '../components/common/Toggle';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useSlideUp } from '../hooks/useAnimations';
import { useHaptics } from '../hooks/useHaptics';
import type { Award } from '../api/ngo';
import { ApiError, resolveMediaUrl } from '../api/client';
import { useConfirm } from '../context/ConfirmDialogContext';

export function NgoSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useNgoProfile();
  const updateMutation = useUpdateNgoProfile();
  const confirm = useConfirm();

  const [orgName, setOrgName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [city, setCity] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [volunteerCountEstimate, setVolunteerCountEstimate] = useState('');
  const [awards, setAwards] = useState<Award[]>([]);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [logo, setLogo] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardAnim = useSlideUp(0, 24);
  const { medium } = useHaptics();
  // A freshly picked photo is already an absolute `file://` URI — only the *stored* logo is a
  // host-relative `/uploads/...` path that needs resolving against the API host.
  const logoUri = logo?.uri ?? resolveMediaUrl(profile?.logoUrl) ?? null;

  useEffect(() => {
    if (!profile) return;
    setOrgName(profile.orgName);
    setDescription(profile.description);
    setWebsite(profile.website ?? '');
    setContactPhone(profile.contactPhone ?? '');
    setCity(profile.city || 'Pune');
    setFoundedYear(profile.foundedYear ? String(profile.foundedYear) : '');
    setVolunteerCountEstimate(profile.volunteerCountEstimate ? String(profile.volunteerCountEstimate) : '');
    setAwards(profile.awards ?? []);
    setApprovalRequired(profile.followPolicy === 'approval');
  }, [profile]);

  const handleToggleApprovalRequired = useCallback((value: boolean) => {
    setApprovalRequired(value);
    updateMutation.mutate({ followPolicy: value ? 'approval' : 'open' });
  }, [updateMutation]);

  /** The reference shows the logo as a round avatar well rather than the shared
   * rectangular drop zone, so this screen drives the picker itself. */
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
      setLogo({
        uri: asset.uri,
        name: asset.fileName ?? 'logo.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      });
    }
  }, [medium]);

  const addAward = () => setAwards((prev) => [...prev, { title: '', year: undefined, issuer: '' }]);
  const removeAward = (index: number) => setAwards((prev) => prev.filter((_, i) => i !== index));
  const updateAward = (index: number, patch: Partial<Award>) =>
    setAwards((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const handleSave = async () => {
    setError(null);
    try {
      await updateMutation.mutateAsync({
        orgName: orgName.trim(),
        description: description.trim(),
        website: website.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        city: city.trim() || undefined,
        foundedYear: foundedYear ? Number(foundedYear) : undefined,
        volunteerCountEstimate: volunteerCountEstimate ? Number(volunteerCountEstimate) : undefined,
        awards: awards.filter((a) => a.title.trim()),
        followPolicy: approvalRequired ? 'approval' : 'open',
        logo: logo ?? undefined,
      });
      confirm('Saved', 'Your NGO profile has been updated.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your profile. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="NGO Profile"
        subtitle="Tell people about your organization"
        onBack={() => navigation?.goBack?.()}
      />

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <Animated.View style={cardAnim}>
            {profile?.status !== 'approved' && (
              <View style={styles.statusBanner}>
                <Text style={styles.statusBannerText}>
                  Status: {profile?.status}
                  {profile?.status === 'rejected' && profile?.rejectionReason ? ` – ${profile.rejectionReason}` : ''}
                </Text>
              </View>
            )}

            <View style={styles.logoWrap}>
              <TouchableOpacity onPress={pickLogo} activeOpacity={0.85} style={styles.logoCircle}>
                {logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoImage} />
                ) : (
                  <Text style={styles.logoPlaceholder}>Logo</Text>
                )}
                <View style={styles.logoEditBadge}>
                  <Text style={styles.logoEditIcon}>✎</Text>
                </View>
              </TouchableOpacity>
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

            <FormField label="Organization Name" value={orgName} onChangeText={setOrgName} placeholder="Your organization" />
            <FormField label="Description" value={description} onChangeText={setDescription} multiline placeholder="We plant. We protect. We inspire." />
            <FormField label="Website" value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" placeholder="https://" />
            <FormField label="Contact Phone" value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="Phone number" />
            <CityPickerField value={city} onChange={setCity} />
            <FormField
              label="Founded Year"
              value={foundedYear}
              onChangeText={(v: string) => setFoundedYear(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="2018"
            />
            <FormField
              label="Volunteer Count (Approx.)"
              value={volunteerCountEstimate}
              onChangeText={(v: string) => setVolunteerCountEstimate(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="120"
            />

            <Text style={styles.sectionLabel}>Awards & recognition</Text>
            <View style={styles.subCard}>
              {awards.map((award, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.listItemTitle}>Award {i + 1}</Text>
                    <TouchableOpacity onPress={() => removeAward(i)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <FormField label="Title" value={award.title} onChangeText={(v: string) => updateAward(i, { title: v })} placeholder="Award title" />
                  <FormField
                    label="Year"
                    value={award.year ? String(award.year) : ''}
                    onChangeText={(v: string) => updateAward(i, { year: v ? Number(v.replace(/[^0-9]/g, '')) : undefined })}
                    keyboardType="number-pad"
                    placeholder="Year"
                  />
                  <FormField label="Issued by" value={award.issuer ?? ''} onChangeText={(v: string) => updateAward(i, { issuer: v })} placeholder="Issuing body" />
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addAward}>
                <Text style={styles.addButtonText}>+ Add award</Text>
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <AnimatedButton
              label={updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              onPress={handleSave}
              disabled={updateMutation.isPending}
              fullWidth
              gradientColors={[COLORS.forest, COLORS.forestDeep]}
              style={styles.submitButton}
            />

            <TouchableOpacity style={styles.staffLink} onPress={() => navigation.navigate('NgoStaff')}>
              <Text style={styles.staffLinkText}>Manage staff roster →</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 12,
  },
  policyText: { flex: 1 },
  policyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  policyBody: { fontSize: 12, lineHeight: 17, color: COLORS.textMuted, marginTop: 3 },

  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  statusBanner: { backgroundColor: 'rgba(232,168,75,0.18)', borderRadius: RADIUS.md, padding: 10, marginBottom: 8 },
  statusBannerText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },

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
    ...SHADOWS.sm,
  },
  logoEditIcon: { fontSize: 13, color: COLORS.white, fontWeight: '700' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginTop: 20 },
  // Transparent too: this only groups a run of FormFields, and a beige panel sitting directly
  // behind now-transparent fields would put the light block straight back where it was removed.
  subCard: { borderRadius: RADIUS.md, paddingHorizontal: 0, paddingVertical: 4, marginTop: 4, gap: 8 },
  listItem: { borderTopWidth: 1, borderTopColor: COLORS.sand, paddingTop: 8, marginTop: 4 },
  listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listItemTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  removeText: { fontSize: 12, color: COLORS.coral, fontWeight: '600' },
  addButton: { alignSelf: 'flex-start', marginTop: 4 },
  addButtonText: { fontSize: 13, color: COLORS.sage, fontWeight: '700' },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { marginTop: 20 },
  staffLink: { alignSelf: 'center', marginTop: 16, padding: 8 },
  staffLinkText: { fontSize: 13, color: COLORS.forest, fontWeight: '700' },
});
