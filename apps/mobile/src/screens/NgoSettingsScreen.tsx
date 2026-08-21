import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { useNgoProfile, useUpdateNgoProfile } from '../hooks/useApiQueries';
import { PhotoPickerField, PickedPhoto } from '../components/common/PhotoPickerField';
import type { Award } from '../api/ngo';
import { ApiError } from '../api/client';

export function NgoSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useNgoProfile();
  const updateMutation = useUpdateNgoProfile();

  const [orgName, setOrgName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [city, setCity] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [volunteerCountEstimate, setVolunteerCountEstimate] = useState('');
  const [awards, setAwards] = useState<Award[]>([]);
  const [logo, setLogo] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setOrgName(profile.orgName);
    setDescription(profile.description);
    setWebsite(profile.website ?? '');
    setContactPhone(profile.contactPhone ?? '');
    setCity(profile.city ?? '');
    setFoundedYear(profile.foundedYear ? String(profile.foundedYear) : '');
    setVolunteerCountEstimate(profile.volunteerCountEstimate ? String(profile.volunteerCountEstimate) : '');
    setAwards(profile.awards ?? []);
  }, [profile]);

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
        logo: logo ?? undefined,
      });
      Alert.alert('Saved', 'Your NGO profile has been updated.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your profile. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation?.goBack?.()} style={styles.backButton}>
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NGO Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {profile?.status !== 'approved' && (
              <View style={styles.statusBanner}>
                <Text style={styles.statusBannerText}>
                  Status: {profile?.status}
                  {profile?.status === 'rejected' && profile?.rejectionReason ? ` — ${profile.rejectionReason}` : ''}
                </Text>
              </View>
            )}

            <Text style={styles.label}>Logo</Text>
            <PhotoPickerField photo={logo ?? (profile?.logoUrl ? { uri: profile.logoUrl, name: 'logo.jpg', type: 'image/jpeg' } : null)} onChange={setLogo} mode="gallery" />

            <Text style={styles.label}>Organization name</Text>
            <TextInput style={styles.input} value={orgName} onChangeText={setOrgName} placeholderTextColor="rgba(255,255,255,0.4)" />

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline placeholderTextColor="rgba(255,255,255,0.4)" />

            <Text style={styles.label}>Website</Text>
            <TextInput style={styles.input} value={website} onChangeText={setWebsite} autoCapitalize="none" keyboardType="url" placeholder="https://" placeholderTextColor="rgba(255,255,255,0.4)" />

            <Text style={styles.label}>Contact phone</Text>
            <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholderTextColor="rgba(255,255,255,0.4)" />

            <Text style={styles.label}>City</Text>
            <TextInput style={styles.input} value={city} onChangeText={setCity} placeholderTextColor="rgba(255,255,255,0.4)" />

            <Text style={styles.label}>Founded year</Text>
            <TextInput style={styles.input} value={foundedYear} onChangeText={(v: string) => setFoundedYear(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholderTextColor="rgba(255,255,255,0.4)" />

            <Text style={styles.label}>Volunteer count (approx.)</Text>
            <TextInput style={styles.input} value={volunteerCountEstimate} onChangeText={(v: string) => setVolunteerCountEstimate(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholderTextColor="rgba(255,255,255,0.4)" />

            <Text style={styles.label}>Awards & recognition</Text>
            <View style={styles.subCard}>
              {awards.map((award, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.listItemTitle}>Award {i + 1}</Text>
                    <TouchableOpacity onPress={() => removeAward(i)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput style={styles.input} value={award.title} onChangeText={(v: string) => updateAward(i, { title: v })} placeholder="Award title" placeholderTextColor="rgba(255,255,255,0.4)" />
                  <TextInput style={styles.input} value={award.year ? String(award.year) : ''} onChangeText={(v: string) => updateAward(i, { year: v ? Number(v.replace(/[^0-9]/g, '')) : undefined })} placeholder="Year" keyboardType="number-pad" placeholderTextColor="rgba(255,255,255,0.4)" />
                  <TextInput style={styles.input} value={award.issuer ?? ''} onChangeText={(v: string) => updateAward(i, { issuer: v })} placeholder="Issued by" placeholderTextColor="rgba(255,255,255,0.4)" />
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addAward}>
                <Text style={styles.addButtonText}>+ Add award</Text>
              </TouchableOpacity>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitButton, updateMutation.isPending && styles.submitButtonDisabled]}
              onPress={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.submitText}>Save changes</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.staffLink} onPress={() => navigation.navigate('NgoStaff')}>
              <Text style={styles.staffLinkText}>Manage staff roster →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 16 },
  card: { backgroundColor: 'rgba(13,35,24,0.45)', borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', padding: 18, gap: 6 },
  statusBanner: { backgroundColor: 'rgba(232,168,75,0.18)', borderRadius: RADIUS.md, padding: 10, marginBottom: 8 },
  statusBannerText: { color: COLORS.amberLight, fontSize: 12, fontWeight: '600' },
  subCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: RADIUS.md, padding: 12, marginTop: 8, gap: 8 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.white, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.white, marginTop: 4 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  listItem: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 8, marginTop: 4 },
  listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listItemTitle: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' },
  removeText: { fontSize: 12, color: COLORS.coral, fontWeight: '600' },
  addButton: { alignSelf: 'flex-start', marginTop: 4 },
  addButtonText: { fontSize: 13, color: COLORS.sage, fontWeight: '700' },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { backgroundColor: COLORS.forest, borderRadius: RADIUS.full, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  staffLink: { alignSelf: 'center', marginTop: 16, padding: 8 },
  staffLinkText: { fontSize: 13, color: COLORS.mint, fontWeight: '700' },
});
