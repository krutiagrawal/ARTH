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
import {
  useDrive,
  useDriveAttendees,
  useDriveSponsors,
  useJoinDrive,
  useLeaveDrive,
  useNgoProfile,
  useSponsorPlant,
  useSetDriveRsvpAttendance,
  useCancelDrive,
  useCompleteDrive,
  useSetDriveFeatured,
  useDeleteDrive,
  useDriveTreeSummary,
} from '../hooks/useApiQueries';
import { STATUS_META } from '../constants/treeHealth';
import { ApiError } from '../api/client';
import type { ApiDrivePlant } from '../api/drives';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useConfirm } from '../context/ConfirmDialogContext';
import { useConfirmDelete } from '../hooks/useConfirmDelete';
import { DriveRsvpSheet } from '../components/drives/DriveRsvpSheet';
import { AttendeeCard } from '../components/drives/AttendeeCard';
import { CancelDriveSheet } from '../components/drives/CancelDriveSheet';
import { RelaunchDriveSheet } from '../components/drives/RelaunchDriveSheet';
import {
  DriveStatusBanner,
  DriveGoingRow,
  DriveRequirementsRow,
  DriveForecastRow,
  DriveVolunteerInfo,
  DriveActionsRow,
} from '../components/drives/DriveDetailExtras';
import { CancelRsvpSheet } from '../components/drives/CancelRsvpSheet';
import type { DriveRsvpInput, RsvpCancelReason, ApiDrivePlantSponsor } from '../api/drives';

import { TEXT } from '../constants/typography';
// Loaded only once a sponsorship payment is actually in flight – see PaymentSheetRunner's own
// comment for why this keeps `@stripe/stripe-react-native` out of this screen's own module-scope
// imports.
const LazyPaymentSheetRunner = React.lazy(() => import('../components/payments/PaymentSheetRunner'));

function formatRupees(cents: number) {
  return `₹${(cents / 100).toLocaleString('en-IN')}`;
}

// One sponsor can fund the same plant several times; the API returns a row per sponsorship, so
// collapse them into a single line with a count and the combined amount.
function groupSponsors(sponsors: ApiDrivePlantSponsor[]) {
  const byHandle = new Map<string, { name: string; handle: string; count: number; totalCents: number }>();
  for (const s of sponsors) {
    const existing = byHandle.get(s.handle);
    if (existing) {
      existing.count += 1;
      existing.totalCents += s.amountCents;
    } else {
      byHandle.set(s.handle, { name: s.name, handle: s.handle, count: 1, totalCents: s.amountCents });
    }
  }
  return [...byHandle.values()];
}

export function DriveDetailScreen({ navigation, route }: any) {
  const { driveId } = route.params as { driveId: string };
  const insets = useSafeAreaInsets();
  const { success, error: errorHaptic } = useHaptics();
  const { data: drive, isLoading, refetch } = useDrive(driveId);
  const { user } = useAuth();
  // Only NGO-role viewers can possibly own this drive – an individual/nursery/other-NGO viewer
  // must never fire this (it hits an NGO-owner-only endpoint that would just fail for them,
  // burning a connection slot this screen's own useDrive() fetch is competing for).
  const ngoProfile = useNgoProfile(user?.role === 'ngo');
  const isOwnDrive = user?.role === 'ngo' && !!drive && ngoProfile.data?.id === drive.ngoId;
  const attendeesQuery = useDriveAttendees(driveId, isOwnDrive);
  const sponsorsQuery = useDriveSponsors(driveId, isOwnDrive);
  const { data: treeSummary } = useDriveTreeSummary(driveId);
  const attendanceMutation = useSetDriveRsvpAttendance(driveId);
  const joinMutation = useJoinDrive();
  const leaveMutation = useLeaveDrive();
  const sponsorMutation = useSponsorPlant();
  const cancelDriveMutation = useCancelDrive();
  const completeDriveMutation = useCompleteDrive();
  const featuredMutation = useSetDriveFeatured();
  const deleteDriveMutation = useDeleteDrive();
  const confirmDelete = useConfirmDelete();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { refreshing, onRefresh } = usePullToRefresh(isOwnDrive ? [refetch, attendeesQuery.refetch, sponsorsQuery.refetch] : refetch);
  const [actionError, setActionError] = useState('');
  const [rsvpSheetOpen, setRsvpSheetOpen] = useState(false);
  const [rsvpError, setRsvpError] = useState('');
  const [cancelDriveOpen, setCancelDriveOpen] = useState(false);
  const [relaunchOpen, setRelaunchOpen] = useState(false);
  const [cancelDriveError, setCancelDriveError] = useState('');
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [sponsoringId, setSponsoringId] = useState<string | null>(null);
  // Non-null only while a real payment sheet is in flight – mounts LazyPaymentSheetRunner below.
  const [activeClientSecret, setActiveClientSecret] = useState<string | null>(null);

  const isFull = !!drive && drive.capacity != null && drive.confirmedCount >= drive.capacity && !drive.isRsvped;
  const isCancelled = drive?.status === 'cancelled';
  const isCompleted = drive?.status === 'completed';
  // Past drives stay viewable but locked: no RSVP, no sponsoring.
  const isEnded = isCompleted || !!drive?.hasEnded;

  const handleCancelDrive = () => {
    if (!drive) return;
    setCancelDriveError('');
    setCancelDriveOpen(true);
  };

  const handleCancelDriveSubmit = async (reason: string) => {
    if (!drive) return;
    setCancelDriveError('');
    try {
      await cancelDriveMutation.mutateAsync({ id: drive.id, reason });
      setCancelDriveOpen(false);
    } catch (e) {
      setCancelDriveError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const handleCompleteDrive = () => {
    if (!drive) return;
    confirm('Mark this drive completed?', 'This unlocks attendance check-off for who actually showed up.', [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Mark completed',
        onPress: () => completeDriveMutation.mutate(drive.id, { onError: (e) => setActionError(e instanceof ApiError ? e.message : 'Something went wrong.') }),
      },
    ]);
  };

  const toggleFeatured = () => {
    if (!drive) return;
    featuredMutation.mutate(
      { id: drive.id, featured: !drive.featured },
      { onError: (e) => setActionError(e instanceof ApiError ? e.message : 'Something went wrong.') },
    );
  };

  // Joining and cancelling both go through a short form (see DriveRsvpSheet / CancelRsvpSheet).
  const handleRsvp = async () => {
    if (!drive) return;
    setActionError('');
    if (!drive.isRsvped) {
      setRsvpSheetOpen(true);
      return;
    }
    setCancelError('');
    setCancelSheetOpen(true);
  };

  const handleCancelSubmit = async (input: { reason: RsvpCancelReason; note?: string }) => {
    if (!drive) return;
    setCancelError('');
    try {
      await leaveMutation.mutateAsync({ id: drive.id, ...input });
      setCancelSheetOpen(false);
      success();
    } catch (e) {
      errorHaptic();
      setCancelError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const handleRsvpSubmit = async (input: DriveRsvpInput) => {
    if (!drive) return;
    setRsvpError('');
    try {
      await joinMutation.mutateAsync({ id: drive.id, ...input });
      setRsvpSheetOpen(false);
      success();
    } catch (e) {
      errorHaptic();
      setRsvpError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const handleSponsor = async (plant: ApiDrivePlant) => {
    if (!drive) return;
    setActionError('');
    setSponsoringId(plant.id);
    try {
      const intent = await sponsorMutation.mutateAsync({ driveId: drive.id, plantId: plant.id });

      // No Stripe key configured on the backend (local/dev only) – the sponsorship already came
      // back succeeded, so there's no payment sheet to present. Skip straight to success.
      if (intent.clientSecret) {
        setActiveClientSecret(intent.clientSecret);
        return;
      }

      success();
      queryClient.invalidateQueries({ queryKey: ['drives', driveId] });
      // The Drives tab on an NGO's public profile embeds its own drive snapshots inside this
      // separate query – never invalidated otherwise, so it kept showing pre-sponsorship counts.
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
          <DriveStatusBanner drive={drive} />

          <BorderCard style={styles.card}>
            <Text style={styles.title}>{drive.title}</Text>
            <Text style={styles.ngoName}>Hosted by {drive.ngoName}</Text>

            <View style={styles.divider} />

            <Text style={styles.description}>{drive.description}</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📅</Text>
              <Text style={styles.infoText}>
                {new Date(drive.startsAt).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                {drive.durationMinutes ? ` · ${drive.durationMinutes} min` : ''}
              </Text>
            </View>
            <DriveGoingRow drive={drive} />
            <DriveRequirementsRow drive={drive} />
            <DriveForecastRow drive={drive} />
          </BorderCard>

          <DriveActionsRow drive={drive} />

          <LocationActions
            label={drive.transportMode === 'ngo_provided' ? 'Drive location' : 'Location'}
            address={[drive.address, drive.city].filter(Boolean).join(', ')}
          />

          {treeSummary && treeSummary.total > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Impact so far</Text>
              <BorderCard style={styles.card}>
                <Text style={styles.infoText}>
                  {treeSummary.total} tree{treeSummary.total === 1 ? '' : 's'} logged · {treeSummary.survivalRate}% survival rate
                </Text>
                <View style={styles.treeCountsRow}>
                  {(['healthy', 'struggling', 'dead', 'not_checked'] as const)
                    .filter((status) => treeSummary.counts[status] > 0)
                    .map((status) => (
                      <View key={status} style={[styles.treeCountPill, { borderColor: STATUS_META[status].color }]}>
                        <Text style={[styles.treeCountPillText, { color: STATUS_META[status].color }]}>
                          {treeSummary.counts[status]} {STATUS_META[status].label}
                        </Text>
                      </View>
                    ))}
                </View>
              </BorderCard>
            </>
          ) : null}

          {drive.transportMode === 'ngo_provided' && drive.pickupPoints.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Pickup points</Text>
              {drive.pickupPoints.map((p, i) => (
                <LocationActions
                  key={p.id}
                  label={`Stop ${i + 1} · Reach by ${new Date(p.arrivalBy).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}`}
                  address={p.address}
                />
              ))}
            </>
          )}

          <DriveVolunteerInfo drive={drive} />

          {drive.instructions && (
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsLabel}>Good to know</Text>
              <Text style={styles.instructionsText}>{drive.instructions}</Text>
            </View>
          )}

          {drive.plants.length > 0 && !isOwnDrive && (
            <>
              <Text style={styles.sectionLabel}>{isEnded || isCancelled ? 'Plants' : 'Sponsor a plant'}</Text>
              {drive.plants.map((plant) => (
                <View key={plant.id} style={styles.plantRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.plantName}>{plant.speciesName}</Text>
                    <Text style={styles.plantMeta}>
                      {formatRupees(plant.priceCents)}
                      {plant.sponsoredCount > 0 ? ` · sponsored ${plant.sponsoredCount}×` : ''}
                    </Text>
                  </View>
                  {!isEnded && !isCancelled && (
                    <TouchableOpacity
                      style={styles.sponsorButton}
                      onPress={() => handleSponsor(plant)}
                      disabled={sponsoringId === plant.id}
                    >
                      <Text style={styles.sponsorButtonText}>{sponsoringId === plant.id ? 'Please wait…' : 'Sponsor'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </>
          )}

          {drive.plants.length > 0 && isOwnDrive && (
            <>
              <Text style={styles.sectionLabel}>Sponsors</Text>
              {sponsorsQuery.isLoading ? (
                <ActivityIndicator color={COLORS.sage} style={{ marginVertical: 12 }} />
              ) : (
                (sponsorsQuery.data?.plants ?? drive.plants).map((plant: any) => (
                  <View key={plant.id} style={styles.plantRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.plantName}>{plant.speciesName}</Text>
                      <Text style={styles.plantMeta}>{formatRupees(plant.priceCents)}</Text>
                      {plant.sponsors?.length ? (
                        groupSponsors(plant.sponsors).map((s) => (
                          <Text key={s.handle} style={styles.sponsorEntry}>
                            {s.name} (@{s.handle}){s.count > 1 ? ` · ×${s.count}` : ''} · {formatRupees(s.totalCents)}
                          </Text>
                        ))
                      ) : (
                        <Text style={styles.plantMeta}>Not sponsored yet</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </>
          )}

          {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}

          {isOwnDrive ? (
            <>
              <View style={styles.ownerActionsRow}>
                {drive.status === 'upcoming' && !drive.hasEnded && (
                  <TouchableOpacity onPress={() => navigation.navigate('NgoCreateDrive', { drive })}>
                    <Text style={styles.ownerActionText}>Edit drive</Text>
                  </TouchableOpacity>
                )}
                {drive.status === 'cancelled' && (
                  drive.relaunchedToId ? (
                    <TouchableOpacity onPress={() => navigation.push('DriveDetail', { driveId: drive.relaunchedToId })}>
                      <Text style={styles.ownerActionText}>Relaunched → View new drive</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity onPress={() => setRelaunchOpen(true)}>
                      <Text style={styles.ownerActionText}>Relaunch drive</Text>
                    </TouchableOpacity>
                  )
                )}
                {drive.status === 'upcoming' && (
                  <>
                    <TouchableOpacity onPress={handleCompleteDrive} disabled={completeDriveMutation.isPending}>
                      <Text style={styles.ownerActionText}>Mark completed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCancelDrive} disabled={cancelDriveMutation.isPending}>
                      <Text style={[styles.ownerActionText, styles.ownerActionTextDanger]}>Cancel drive</Text>
                    </TouchableOpacity>
                  </>
                )}
                <TouchableOpacity
                  onPress={() =>
                    confirmDelete('drive', drive.title, () => deleteDriveMutation.mutateAsync(drive.id), () => navigation.goBack())
                  }
                >
                  <Text style={[styles.ownerActionText, styles.ownerActionTextDanger]}>Delete drive</Text>
                </TouchableOpacity>
                {/* Featuring only reorders the completed-drives list on the public profile (pinned
                    first); every drive is listed there regardless, so it's meaningless before then. */}
                {drive.status === 'completed' && (
                  <TouchableOpacity onPress={toggleFeatured} disabled={featuredMutation.isPending}>
                    <Text style={styles.ownerActionText}>{drive.featured ? '★ Pinned to top' : '☆ Pin to top of profile'}</Text>
                  </TouchableOpacity>
                )}
              </View>
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
                  <AttendeeCard
                    key={a.id}
                    attendee={a}
                    showBoarding={drive.transportMode === 'ngo_provided'}
                    checkable={drive.status === 'completed'}
                    disabled={attendanceMutation.isPending}
                    onToggleAttended={() => attendanceMutation.mutate({ rsvpId: a.id, attended: !a.attended })}
                  />
                ))
              )}
            </>
          ) : isCancelled ? null : isEnded ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This drive has already happened.</Text>
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

      {drive && (
        <DriveRsvpSheet
          visible={rsvpSheetOpen}
          drive={drive}
          defaultPhone={user?.phone}
          submitting={joinMutation.isPending}
          error={rsvpError}
          onClose={() => setRsvpSheetOpen(false)}
          onSubmit={handleRsvpSubmit}
        />
      )}

      <RelaunchDriveSheet
        drive={relaunchOpen ? drive ?? null : null}
        onClose={() => setRelaunchOpen(false)}
        onRelaunched={(created) => {
          setRelaunchOpen(false);
          navigation.replace('DriveDetail', { driveId: created.id });
        }}
      />

      {drive && (
        <CancelDriveSheet
          visible={cancelDriveOpen}
          driveTitle={drive.title}
          confirmedCount={drive.confirmedCount}
          submitting={cancelDriveMutation.isPending}
          error={cancelDriveError}
          onClose={() => setCancelDriveOpen(false)}
          onSubmit={handleCancelDriveSubmit}
        />
      )}

      {drive && (
        <CancelRsvpSheet
          visible={cancelSheetOpen}
          driveTitle={drive.title}
          submitting={leaveMutation.isPending}
          error={cancelError}
          onClose={() => setCancelSheetOpen(false)}
          onSubmit={handleCancelSubmit}
        />
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
  headerTitle: { flex: 1,...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  loader: { marginTop: 60 },
  scrollContent: { paddingHorizontal: 20 },
  card: { marginBottom: 20 },
  title: { ...TEXT.heading, color: COLORS.textPrimary },
  ngoName: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  divider: { height: 1, backgroundColor: 'rgba(94,133,80,0.15)', marginVertical: 14 },
  description: { fontSize: 14, lineHeight: 21, color: COLORS.textPrimary, marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  infoIcon: { fontSize: 14 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, marginTop: 4 },
  treeCountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  treeCountPill: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1.5 },
  treeCountPillText: { fontSize: 11, fontWeight: '700' },
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
  sponsorEntry: { fontSize: 12, color: COLORS.textPrimary, marginTop: 4 },
  sponsorButton: { borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.sage, paddingHorizontal: 14, paddingVertical: 8 },
  sponsorButtonText: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  errorText: { fontSize: 13, color: COLORS.dangerDark, textAlign: 'center', marginBottom: 12 },
  ownerActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 14 },
  ownerActionText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  ownerActionTextDanger: { color: COLORS.dangerDark },
  rsvpButton: { marginTop: 4 },
  cancelledBanner: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  cancelledText: { fontSize: 13, color: COLORS.dangerDark, fontWeight: '600', textAlign: 'center' },
});
