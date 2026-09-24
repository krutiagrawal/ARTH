import React, { Suspense, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { LocationActions } from '../components/common/LocationActions';
import { useHaptics } from '../hooks/useHaptics';
import { useAuth } from '../context/AuthContext';
import { useDrive, useDriveAttendees, useJoinDrive, useLeaveDrive, useNgoProfile, useSponsorPlant, useSetDriveRsvpAttendance } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import type { ApiDrivePlant } from '../api/drives';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

// Loaded only once a sponsorship payment is actually in flight — see PaymentSheetRunner's own
// comment for why this keeps `@stripe/stripe-react-native` out of this screen's own module-scope
// imports.
const LazyPaymentSheetRunner = React.lazy(() => import('../components/payments/PaymentSheetRunner'));

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

export function DriveDetailScreen({ navigation, route }: any) {
  const { driveId } = route.params as { driveId: string };
  const insets = useSafeAreaInsets();
  const { success, error: errorHaptic } = useHaptics();
  const { data: drive, isLoading, refetch } = useDrive(driveId);
  const { user } = useAuth();
  // Only NGO-role viewers can possibly own this drive — an individual/nursery/other-NGO viewer
  // must never fire this (it hits an NGO-owner-only endpoint that would just fail for them,
  // burning a connection slot this screen's own useDrive() fetch is competing for).
  const ngoProfile = useNgoProfile(user?.role === 'ngo');
  const isOwnDrive = user?.role === 'ngo' && !!drive && ngoProfile.data?.id === drive.ngoId;
  const attendeesQuery = useDriveAttendees(driveId, isOwnDrive);
  const attendanceMutation = useSetDriveRsvpAttendance(driveId);
  const joinMutation = useJoinDrive();
  const leaveMutation = useLeaveDrive();
  const sponsorMutation = useSponsorPlant();
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = usePullToRefresh(isOwnDrive ? [refetch, attendeesQuery.refetch] : refetch);
  const [actionError, setActionError] = useState('');
  const [sponsoringId, setSponsoringId] = useState<string | null>(null);
  // Non-null only while a real payment sheet is in flight — mounts LazyPaymentSheetRunner below.
  const [activeClientSecret, setActiveClientSecret] = useState<string | null>(null);

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

      // No Stripe key configured on the backend (local/dev only) — the sponsorship already came
      // back succeeded, so there's no payment sheet to present. Skip straight to success.
      if (intent.clientSecret) {
        setActiveClientSecret(intent.clientSecret);
        return;
      }

      success();
      queryClient.invalidateQueries({ queryKey: ['drives', driveId] });
      // The Drives tab on an NGO's public profile embeds its own drive snapshots inside this
      // separate query — never invalidated otherwise, so it kept showing pre-sponsorship counts.
      queryClient.invalidateQueries({ queryKey: ['ngos', 'public'] });
      setSponsoringId(null);
    } catch (e) {
      errorHaptic();
      if (e instanceof ApiError && e.code === 'SERVICE_UNAVAILABLE') {
        setActionError('Sponsorship payments aren’t live yet – please check back soon.');
      } else {
        setActionError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      }
      setSponsoringId(null);
    }
  };

  const handlePaymentSuccess = () => {
    success();
    queryClient.invalidateQueries({ queryKey: ['drives', driveId] });
    queryClient.invalidateQueries({ queryKey: ['ngos', 'public'] });
    setActiveClientSecret(null);
    setSponsoringId(null);
  };

  const handlePaymentCancel = () => {
    setActiveClientSecret(null);
    setSponsoringId(null);
  };

  const handlePaymentError = (message: string) => {
    errorHaptic();
    setActionError(message);
    setActiveClientSecret(null);
    setSponsoringId(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Go back">
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Drive Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !drive ? (
        <ActivityIndicator color={COLORS.sage} style={styles.loader} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <BorderCard style={styles.card}>
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
          </BorderCard>

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

          {isOwnDrive ? (
            <>
              <Text style={styles.sectionLabel}>Who's coming ({drive.confirmedCount})</Text>
              {drive.status === 'completed' && (attendeesQuery.data?.attendees.length ?? 0) > 0 && (
                <Text style={styles.infoText}>Tap to check off who actually showed up.</Text>
              )}
              {attendeesQuery.isLoading ? (
                <ActivityIndicator color={COLORS.sage} style={{ marginVertical: 12 }} />
              ) : (attendeesQuery.data?.attendees.length ?? 0) === 0 ? (
                <Text style={styles.infoText}>No RSVPs yet.</Text>
              ) : (
                attendeesQuery.data!.attendees.map((a) => (
                  <View key={a.id} style={styles.attendeeRow}>
                    <View style={styles.attendeeLeft}>
                      {drive.status === 'completed' && (
                        <TouchableOpacity
                          style={[styles.attendeeCheckbox, a.attended && styles.attendeeCheckboxChecked]}
                          onPress={() => attendanceMutation.mutate({ rsvpId: a.id, attended: !a.attended })}
                          disabled={attendanceMutation.isPending}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: !!a.attended }}
                        >
                          {a.attended && <Text style={styles.attendeeCheckmark}>✓</Text>}
                        </TouchableOpacity>
                      )}
                      <View>
                        <Text style={styles.attendeeName}>{a.name}</Text>
                        <Text style={styles.attendeeHandle}>@{a.handle}</Text>
                      </View>
                    </View>
                    <Text style={styles.attendeeDate}>{new Date(a.rsvpedAt).toLocaleDateString()}</Text>
                  </View>
                ))
              )}
            </>
          ) : isCancelled ? (
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
                      : "I'm in – RSVP"
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

      {activeClientSecret && (
        <Suspense fallback={null}>
          <LazyPaymentSheetRunner
            clientSecret={activeClientSecret}
            onSuccess={handlePaymentSuccess}
            onCancel={handlePaymentCancel}
            onError={handlePaymentError}
          />
        </Suspense>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
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
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 8,
  },
  plantName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  plantMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sponsorButton: { borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.sage, paddingHorizontal: 14, paddingVertical: 8 },
  sponsorButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  errorText: { fontSize: 13, color: COLORS.dangerDark, textAlign: 'center', marginBottom: 12 },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94,133,80,0.12)',
  },
  attendeeLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  attendeeCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeCheckboxChecked: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  attendeeCheckmark: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  attendeeName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  attendeeHandle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  attendeeDate: { fontSize: 12, color: COLORS.textSecondary },
  rsvpButton: { marginTop: 4 },
  cancelledBanner: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  cancelledText: { fontSize: 13, color: COLORS.dangerDark, fontWeight: '600', textAlign: 'center' },
});
