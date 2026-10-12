import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { LocationActions } from '../components/common/LocationActions';
import { useHaptics } from '../hooks/useHaptics';
import { useAdoptableTree, useAdoptTree, useNgoProfile, useAdoptionStatus } from '../hooks/useApiQueries';
import { AdoptionStatusPill } from '../components/adopt/AdoptionStatusPill';
import { AdopterCheckIn } from '../components/adopt/AdopterCheckIn';
import { PendingCommunityUpdates } from '../components/adopt/PendingCommunityUpdates';
import { TreeUpdatesTimeline } from '../components/adopt/TreeUpdatesTimeline';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';

import { TEXT } from '../constants/typography';
export function AdoptTreeDetailScreen({ navigation, route }: any) {
  const { treeId } = route.params as { treeId: string };
  const insets = useSafeAreaInsets();
  const { success, error: errorHaptic } = useHaptics();
  const { data: tree, isLoading, refetch } = useAdoptableTree(treeId);
  const { user } = useAuth();
  const ngoProfile = useNgoProfile(user?.role === 'ngo');
  const isOwnTree = user?.role === 'ngo' && !!tree && ngoProfile.data?.id === tree.ngoId;
  const adoptMutation = useAdoptTree();
  const statusQuery = useAdoptionStatus(tree ? tree.id : undefined);
  const adoptionStatus = statusQuery.data;
  const isAdopter = !!adoptionStatus?.isAdopter;
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const [message, setMessage] = useState('');
  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef<ScrollView>(null);
  const [actionError, setActionError] = useState('');
  const [adopted, setAdopted] = useState(false);

  const handleAdopt = async () => {
    if (!tree) return;
    setActionError('');
    try {
      await adoptMutation.mutateAsync({ id: tree.id, message: message.trim() || undefined });
      success();
      setAdopted(true);
    } catch (e) {
      errorHaptic();
      setActionError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    }
  };

  const alreadyTaken = tree?.isAdopted && !adopted;
  const isRemoved = tree?.status === 'removed';

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
        <Text style={styles.headerTitle} numberOfLines={1}>Tree Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !tree ? (
        <ActivityIndicator color={COLORS.sage} style={styles.loader} />
      ) : (
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 + keyboardHeight }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
        >
          <BorderCard style={styles.card}>
            <Text style={styles.title}>{tree.nickname}</Text>
            <Text style={styles.ngoName}>{tree.speciesName} · listed by {tree.ngoName}</Text>

            <AdoptionStatusPill status={tree.healthStatus} lastCheckedAt={tree.lastCheckedAt} />

            <View style={styles.divider} />

            <Text style={styles.description}>{tree.description}</Text>
          </BorderCard>

          <LocationActions label="Location" address={[tree.location, tree.city].filter(Boolean).join(', ')} />

          {tree.instructions && (
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsLabel}>What adopting this tree involves</Text>
              <Text style={styles.instructionsText}>{tree.instructions}</Text>
            </View>
          )}

          {!isRemoved && (
            <BorderCard style={styles.card}>
              <Text style={styles.sectionTitle}>Status updates</Text>
              {adoptionStatus ? <TreeUpdatesTimeline timeline={adoptionStatus.timeline} /> : <ActivityIndicator color={COLORS.sage} />}
              {isAdopter ? (
                <View style={styles.updateActions}>
                  <AdopterCheckIn adoptableTreeId={tree.id} />
                  <PendingCommunityUpdates adoptableTreeId={tree.id} />
                </View>
              ) : !isOwnTree ? (
                <View style={styles.updateActions}>
                  <TouchableOpacity
                    style={styles.outlineBtn}
                    accessibilityRole="button"
                    onPress={() =>
                      navigation.navigate('LogCommunityObservation', {
                        kind: 'adoptable-tree',
                        id: tree.id,
                        species: tree.speciesName,
                        photoUrl: tree.photoUri,
                        publicId: adoptionStatus?.publicId ?? undefined,
                      })
                    }
                  >
                    <Text style={styles.outlineBtnText}>📸  Send an update on this tree</Text>
                  </TouchableOpacity>
                  <Text style={styles.updateHint}>You need to be standing next to the tree. The adopter decides whether it joins the timeline.</Text>
                </View>
              ) : null}
              {tree.plantedTreeId ? (
                <TouchableOpacity
                  style={styles.passportLink}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate('TreePassport', { kind: 'planted-tree', id: tree.plantedTreeId })}
                >
                  <Text style={styles.passportLinkText}>🪪 View full Tree Passport ›</Text>
                </TouchableOpacity>
              ) : null}
            </BorderCard>
          )}

          {isOwnTree ? (
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsLabel}>Adoption activity</Text>
              {tree.adopter ? (
                <Text style={styles.instructionsText}>
                  Adopted by {tree.adopter.name} (@{tree.adopter.handle}) on {new Date(tree.adopter.adoptedAt).toLocaleDateString()}
                  {tree.adopter.message ? `\n\n"${tree.adopter.message}"` : ''}
                </Text>
              ) : (
                <Text style={styles.instructionsText}>Not adopted yet.</Text>
              )}
            </View>
          ) : adopted ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>🌳 You've adopted {tree.nickname}! Thank you for caring for it.</Text>
            </View>
          ) : isRemoved ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This listing has been removed and is no longer available for adoption.</Text>
            </View>
          ) : alreadyTaken ? (
            <View style={styles.cancelledBanner}>
              <Text style={styles.cancelledText}>This tree has already been adopted by someone else.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Message (optional)</Text>
              <TextInput maxLength={500}
                value={message}
                onChangeText={setMessage}
                onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)}
                placeholder="eg - Why does this tree matter to you?"
                placeholderTextColor={COLORS.textLight}
                multiline
                style={styles.input}
              />
              {actionError ? <Text style={styles.errorText}>{actionError}</Text> : null}
              <AnimatedButton
                label={adoptMutation.isPending ? 'Adopting…' : 'Adopt this tree'}
                onPress={handleAdopt}
                disabled={adoptMutation.isPending}
                variant="primary"
                size="lg"
                fullWidth
                style={styles.adoptButton}
              />
            </>
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
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoIcon: { fontSize: 14 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  instructionsCard: { backgroundColor: 'rgba(212,168,83,0.12)', borderRadius: RADIUS.lg, padding: 14, marginBottom: 16 },
  instructionsLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  instructionsText: { fontSize: 13, lineHeight: 19, color: COLORS.textPrimary },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 12 },
  updateActions: { marginTop: 4 },
  outlineBtn: { height: 40, borderRadius: 12, borderWidth: 2, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  updateHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 6 },
  passportLink: { marginTop: 14, alignSelf: 'flex-start' },
  passportLinkText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: 'transparent',
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    padding: 14,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: COLORS.dangerDark, textAlign: 'center', marginBottom: 12 },
  adoptButton: { marginTop: 4 },
  successBanner: { backgroundColor: COLORS.mintLight, borderRadius: RADIUS.lg, padding: 16 },
  successText: { fontSize: 14, color: COLORS.forest, fontWeight: '600', textAlign: 'center' },
  cancelledBanner: { backgroundColor: COLORS.dangerLight, borderRadius: RADIUS.lg, padding: 16 },
  cancelledText: { fontSize: 13, color: COLORS.dangerDark, fontWeight: '600', textAlign: 'center' },
});
