import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useStripe } from '@stripe/stripe-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { LocationActions } from '../components/common/LocationActions';
import { useHaptics } from '../hooks/useHaptics';
import { useDrive, useJoinDrive, useLeaveDrive, useSponsorPlant } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { ApiDrivePlant } from '../api/drives';

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

export function DriveDetailScreen({ navigation, route }: any) {
  const { driveId } = route.params as { driveId: string };
  const insets = useSafeAreaInsets();
  const { success, error: errorHaptic } = useHaptics();
  const { data: drive, isLoading } = useDrive(driveId);
  const joinMutation = useJoinDrive();
  const leaveMutation = useLeaveDrive();
  const sponsorMutation = useSponsorPlant();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState('');
  const [sponsoringId, setSponsoringId] = useState<string | null>(null);

  const isFull = !!drive && drive.capacity != null && drive.confirmedCount >= drive.capacity && !drive.isRsvped;
  const isCancelled = drive?.status === 'cancelled';

  const handleRsvp = async () => {
    if (!drive) return;
    setActionError('');
    try {
      if (drive.isRsvped) {
        await leaveMutation.mutateAsync(drive.id);
      } else {
        await joinMutation.mutateAsync(drive.id);
      }
      success();
    } catch (e) {
      errorHaptic();
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const handleSponsor = async (plant: ApiDrivePlant) => {
    if (!drive) return;
    setActionError('');
    setSponsoringId(plant.id);
    try {
      const intent = await sponsorMutation.mutateAsync({ driveId: drive.id, plantId: plant.id });

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'ARTH',
        paymentIntentClientSecret: intent.clientSecret,
      });
      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') throw new Error(presentError.message);
        return;
      }

      success();
      queryClient.invalidateQueries({ queryKey: ['drives', driveId] });
    } catch (e) {
      errorHaptic();
      if (e instanceof ApiError && e.code === 'SERVICE_UNAVAILABLE') {
        setActionError('Sponsorship payments aren’t live yet — please check back soon.');
      } else {
        setActionError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSponsoringId(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <BlurView intensity={25} tint="dark" style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </BlurView>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Drive Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !drive ? (
        <ActivityIndicator color={COLORS.sage} style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
          <GlassCard variant="warm" style={styles.card}>
            <Text style={styles.title}>{drive.title}</Text>
            <Text style={styles.ngoName}>Hosted by {drive.ngoName}</Text>

            <View style={styles.divider} />

            <Text style={styles.description}>{drive.description}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoText}>
                {new Date(drive.startsAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                {drive.durationMinutes ? ` · ${drive.durationMinutes} min` : ''}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>👥</Text>
              <Text style={styles.infoText}>
                {drive.confirmedCount} going{drive.capacity != null ? ` of ${drive.capacity} spots` : ' · open to everyone'}
              </Text>
            </View>
          </GlassCard>

          <LocationActions
            label={drive.transportMode === 'ngo_provided' ? 'Drive location' : 'Location'}
            address={[drive.address, drive.city].filter(Boolean).join(', ')}
          />

          {drive.transportMode === 'ngo_provided' && drive.pickupPoints.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Pickup points</Text>
              {drive.pickupPoints.map((p, i) => (
                <LocationActions
                  key={p.id}
                  label={`Stop ${i + 1} · Reach by ${new Date(p.arrivalBy).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  address={p.address}
                />
              ))}
            </>
          )}

          {drive.instructions && (
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsLabel}>Good to know</Text>
              <Text style={styles.instructionsText}>{drive.instructions}</Text>
            </View>
          )}

          {drive.plants.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Sponsor a plant</Text>
              {drive.plants.map((plant) => (
                <View key={plant.id} style={styles.plantRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.plantName}>{plant.speciesName}</Text>
                    <Text style={styles.plantMeta}>
                      {formatRupees(plant.priceCents)}
                      {plant.sponsoredCount > 0 ? ` · sponsored ${plant.sponsoredCount}×` : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.sponsorButton}
                    onPress={() => handleSponsor(plant)}
                    disabled={sponsoringId === plant.id}
                  >
                    <Text style={styles.sponsorButtonText}>{sponsoringId === plant.id ? 'Please wait…' : 'Sponsor'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

          {isCancelled ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This drive has been cancelled by the organizer.</Text>
            </View>
          ) : (
            <AnimatedButton
              label={
                joinMutation.isPending || leaveMutation.isPending
                  ? 'Please wait…'
                  : drive.isRsvped
                    ? 'Cancel my RSVP'
                    : isFull
                      ? 'Drive is full'
                      : "I'm in — RSVP"
              }
              onPress={handleRsvp}
              disabled={joinMutation.isPending || leaveMutation.isPending || (isFull && !drive.isRsvped)}
              variant={drive.isRsvped ? 'secondary' : 'primary'}
              size="lg"
              fullWidth
              style={styles.rsvpButton}
            />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(94,133,80,0.2)' },
  backIcon: { fontSize: 18, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  loader: { marginTop: 60 },
  scrollContent: { paddingHorizontal: 20 },
  card: { marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  ngoName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 14 },
  description: { fontSize: 14, lineHeight: 21, color: COLORS.textPrimary, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  infoIcon: { fontSize: 14 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, marginTop: 4 },
  instructionsCard: { backgroundColor: 'rgba(212,168,83,0.12)', borderRadius: RADIUS.lg, padding: 14, marginBottom: 16 },
  instructionsLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  instructionsText: { fontSize: 13, lineHeight: 19, color: COLORS.textPrimary },
  plantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 8,
  },
  plantName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  plantMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sponsorButton: { borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.sage, paddingHorizontal: 14, paddingVertical: 8 },
  sponsorButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  errorText: { fontSize: 13, color: COLORS.dangerDark, textAlign: 'center', marginBottom: 12 },
  rsvpButton: { marginTop: 4 },
  cancelledBanner: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  cancelledText: { fontSize: 13, color: COLORS.dangerDark, fontWeight: '600', textAlign: 'center' },
});
