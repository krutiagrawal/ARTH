import React, { useCallback, useEffect, useState } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { useCorporateProfile, useUpdateCorporateProfile, useResubmitCorporateProfile } from '../hooks/useApiQueries';
import { PickedPhoto } from '../components/common/PhotoPickerField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { useSlideUp } from '../hooks/useAnimations';
import { useHaptics } from '../hooks/useHaptics';
import { ApiError, resolveMediaUrl } from '../api/client';

export function CorporateSettingsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useCorporateProfile();
  const updateMutation = useUpdateCorporateProfile();
  const resubmitMutation = useResubmitCorporateProfile();

  const [companyName, setCompanyName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [logo, setLogo] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cardAnim = useSlideUp(0, 24);
  const { medium } = useHaptics();
  const logoUri = logo?.uri ?? resolveMediaUrl(profile?.logoUrl) ?? null;

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
      Alert.alert('Saved', 'Your company profile has been updated.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your profile. Please try again.');
    }
  };

  const handleResubmit = () => {
    Alert.alert('Resubmit for review?', 'Your account will go back into the review queue.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Resubmit', onPress: () => resubmitMutation.mutate() },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader
        title="Company Profile"
        subtitle="Tell people about your CSR program"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
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
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
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
});
