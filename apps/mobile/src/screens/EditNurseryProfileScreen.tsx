import React, { useCallback, useEffect, useState } from 'react';
import { View, Image, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { useNurseryProfile, useUpdateNurseryProfile, useResubmitNurseryProfile } from '../hooks/useApiQueries';
import { BorderCard } from '../components/common/BorderCard';
import { PickedPhoto } from '../components/common/PhotoPickerField';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { Toggle } from '../components/common/Toggle';
import { useSlideUp } from '../hooks/useAnimations';
import { useHaptics } from '../hooks/useHaptics';
import { useConfirm } from '../context/ConfirmDialogContext';
import { ApiError, resolveMediaUrl } from '../api/client';

const STATUS_COPY: Record<string, { title: string; body: string }> = {
  pending: { title: 'Under review', body: "We're reviewing your nursery. Your stock will go live once approved." },
  suspended: { title: 'Account suspended', body: 'Contact support for details.' },
};

export function EditNurseryProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { data: profile, isLoading } = useNurseryProfile();
  const updateMutation = useUpdateNurseryProfile();
  const resubmitMutation = useResubmitNurseryProfile();

  const [nurseryName, setNurseryName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [offersDelivery, setOffersDelivery] = useState(true);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState('');
  const [logo, setLogo] = useState<PickedPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const cardAnim = useSlideUp(0, 24);
  const { medium } = useHaptics();
  const confirm = useConfirm();
  const logoUri = logo?.uri ?? resolveMediaUrl(profile?.logoUrl) ?? null;
  const hasLocation = profile?.lat != null && profile?.lng != null;
  const statusCopy = profile && profile.status !== 'approved' && profile.status !== 'rejected' ? STATUS_COPY[profile.status] : undefined;

  useEffect(() => {
    if (!profile) return;
    setNurseryName(profile.nurseryName);
    setDescription(profile.description);
    setCity(profile.city ?? '');
    setContactPhone(profile.contactPhone ?? '');
    setOffersDelivery(profile.offersDelivery);
    setDeliveryRadiusKm(profile.deliveryRadiusKm != null ? String(profile.deliveryRadiusKm) : '');
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

  const handleSetLocation = useCallback(async () => {
    medium();
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        confirm('Permission needed', 'Location permission is required to place your nursery on the map.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      await updateMutation.mutateAsync({ lat: position.coords.latitude, lng: position.coords.longitude });
      confirm('Location set', 'Your nursery will now appear on the map.');
    } catch (e) {
      confirm('Could not get location', 'Please try again.');
    } finally {
      setLocationLoading(false);
    }
  }, [medium, updateMutation]);

  const handleSave = async () => {
    setError(null);
    try {
      await updateMutation.mutateAsync({
        nurseryName: nurseryName.trim(),
        description: description.trim(),
        city: city.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        offersDelivery,
        deliveryRadiusKm: deliveryRadiusKm.trim() ? Number(deliveryRadiusKm.trim()) : undefined,
        logo: logo ?? undefined,
      });
      confirm('Saved', 'Your nursery profile has been updated.');
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
        title="Nursery Profile"
        subtitle="Tell planters about your nursery"
        onBack={navigation?.canGoBack?.() ? () => navigation.goBack() : undefined}
      />

      {isLoading ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          {statusCopy && (
            <BorderCard
              noPadding
              style={[styles.statusBanner, profile?.status === 'suspended' && styles.statusBannerDanger]}
            >
              <Text style={styles.statusTitle}>{statusCopy.title}</Text>
              <Text style={styles.statusBody}>{statusCopy.body}</Text>
            </BorderCard>
          )}

          <Animated.View style={cardAnim}>
            <View style={styles.logoWrap}>
              <TouchableOpacity onPress={pickLogo} activeOpacity={0.85} style={styles.logoCircle}>
                {logoUri ? <Image source={{ uri: logoUri }} style={styles.logoImage} /> : <Text style={styles.logoPlaceholder}>Logo</Text>}
                <View style={styles.logoEditBadge}>
                  <Text style={styles.logoEditIcon}>✎</Text>
                </View>
              </TouchableOpacity>
            </View>

            <FormField label="Nursery Name" value={nurseryName} onChangeText={setNurseryName} placeholder="Your nursery" />
            <FormField label="Description" value={description} onChangeText={setDescription} multiline placeholder="What does your nursery grow?" />
            <FormField label="City" value={city} onChangeText={setCity} placeholder="City" />
            <FormField label="Contact phone" value={contactPhone} onChangeText={setContactPhone} placeholder="Phone" keyboardType="phone-pad" />

            <BorderCard noPadding style={styles.deliveryCard}>
              <View style={styles.deliveryRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deliveryLabel}>Offer delivery</Text>
                  <Text style={styles.deliveryHint}>Show up when planters filter for delivery</Text>
                </View>
                <Toggle value={offersDelivery} onValueChange={setOffersDelivery} offColor={COLORS.sand} onColor={COLORS.forest} />
              </View>
              {offersDelivery && (
                <FormField
                  label="Delivery radius (km, optional)"
                  value={deliveryRadiusKm}
                  onChangeText={setDeliveryRadiusKm}
                  placeholder="e.g. 15"
                  keyboardType="number-pad"
                />
              )}
            </BorderCard>

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
              <BorderCard noPadding style={styles.rejectedCard}>
                <Text style={styles.rejectedTitle}>Application rejected</Text>
                {profile.rejectionReason && <Text style={styles.rejectedReason}>{profile.rejectionReason}</Text>}
                <TouchableOpacity onPress={handleResubmit} disabled={resubmitMutation.isPending}>
                  <Text style={styles.resubmitText}>{resubmitMutation.isPending ? 'Resubmitting…' : 'Resubmit for review'}</Text>
                </TouchableOpacity>
              </BorderCard>
            )}

            <BorderCard noPadding style={styles.locationCard}>
              <Text style={styles.locationLabel}>{hasLocation ? '📍 Location set' : '📍 No location set'}</Text>
              <Text style={styles.locationBody}>
                {hasLocation
                  ? "Your nursery appears on the map for nearby planters."
                  : 'Set your location so planters nearby can find you on the map.'}
              </Text>
              <TouchableOpacity onPress={handleSetLocation} disabled={locationLoading}>
                <Text style={styles.locationAction}>
                  {locationLoading ? 'Getting location…' : hasLocation ? 'Update my location' : 'Use my current location'}
                </Text>
              </TouchableOpacity>
            </BorderCard>
          </Animated.View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8, gap: 8 },
  statusBanner: { borderRadius: RADIUS.md, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: COLORS.golden },
  statusBannerDanger: { borderLeftColor: COLORS.coral },
  statusTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  statusBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
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
  deliveryCard: { padding: 14, borderRadius: RADIUS.md, marginTop: 4, marginBottom: 8, gap: 8 },
  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deliveryLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  deliveryHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  error: { fontSize: 13, color: COLORS.coral, marginTop: 12 },
  submitButton: { marginTop: 20 },
  rejectedCard: { marginTop: 20, padding: 16, borderRadius: RADIUS.md, borderLeftWidth: 4, borderLeftColor: COLORS.coral },
  rejectedTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  rejectedReason: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8 },
  resubmitText: { fontSize: 13, color: COLORS.forest, fontWeight: '700', textAlign: 'center' },
  locationCard: { marginTop: 24, padding: 16, borderRadius: RADIUS.md, alignItems: 'center' },
  locationLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  locationBody: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  locationAction: { fontSize: 13, color: COLORS.forest, fontWeight: '700', marginTop: 12 },
});
