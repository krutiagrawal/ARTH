import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image } from 'react-native';
import Animated from 'react-native-reanimated';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { StatDisplay } from '../components/common/StatDisplay';
import { useTreePassport, useLogOwnObservation } from '../hooks/useApiQueries';
import { useAuth } from '../context/AuthContext';
import { useHaptics } from '../hooks/useHaptics';
import { useSlideUp, useFadeIn } from '../hooks/useAnimations';
import { resolveMediaUrl } from '../api/client';
import { STATUS_META, ACTIONABLE_STATUSES } from '../constants/treeHealth';
import type { TreePassport, PassportTimelineEntry } from '../api/trees';

// Caps the per-row stagger so a long timeline still finishes revealing quickly rather than
// crawling in one row at a time.
const MAX_TIMELINE_STAGGER_MS = 300;
const TIMELINE_STAGGER_STEP_MS = 60;

const VERIFICATION_META: Record<string, { color: string; label: string }> = {
  verified: { color: COLORS.sage, label: 'AI Verified' },
  unverified: { color: COLORS.amber, label: 'Pending review' },
  rejected: { color: COLORS.danger, label: 'Needs review' },
};

const OBSERVER_LABEL: Record<string, string> = {
  owner: '🌱 You',
  ngo: '🏢 NGO staff',
  community: '👋 Community',
};

const SOURCE_LABEL: Record<PassportTimelineEntry['source'], string> = {
  planted: 'Planted',
  verified: 'Verified',
  health_check: 'Health check',
  observation: 'Observation',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{title}</Text>
      {children}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

function TimelineRow({ entry, index }: { entry: PassportTimelineEntry; index: number }) {
  const meta = entry.status && entry.status in STATUS_META ? STATUS_META[entry.status as keyof typeof STATUS_META] : null;
  const slideStyle = useSlideUp(Math.min(index * TIMELINE_STAGGER_STEP_MS, MAX_TIMELINE_STAGGER_MS), 14);
  return (
    <Animated.View style={slideStyle}>
    <BorderCard noPadding style={styles.timelineRow}>
      <View style={styles.timelineRowInner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.timelineSource}>
            {meta ? `${meta.emoji} ` : ''}{meta ? meta.label : SOURCE_LABEL[entry.source]}
          </Text>
          {entry.observerRole ? (
            <Text style={styles.timelineObserver}>{OBSERVER_LABEL[entry.observerRole]}</Text>
          ) : null}
          {entry.note ? <Text style={styles.timelineNote}>{entry.note}</Text> : null}
        </View>
        <Text style={styles.timelineDate}>{formatDate(entry.at)}</Text>
      </View>
    </BorderCard>
    </Animated.View>
  );
}

// A dedicated component so it can be `key`ed on status at the call site below — that forces a
// fresh mount (and so a fresh fade-in) whenever the status actually changes between refetches, a
// cheap stand-in for a true crossfade without hand-tracking the previous value.
function HealthBadge({ status }: { status: keyof typeof STATUS_META }) {
  const fadeStyle = useFadeIn(0, 350);
  const meta = STATUS_META[status];
  return (
    <Animated.View style={[styles.healthPill, { borderColor: meta.color }, fadeStyle]}>
      <Text style={[styles.healthPillText, { color: meta.color }]}>
        {meta.emoji} {meta.label}
      </Text>
    </Animated.View>
  );
}

function CheckInControl({ treeId }: { treeId: string }) {
  const [expanded, setExpanded] = useState(false);
  const logMutation = useLogOwnObservation();
  const { medium, success } = useHaptics();

  const handleCheckIn = useCallback(
    async (status: (typeof ACTIONABLE_STATUSES)[number]) => {
      medium();
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      const photo = result.canceled
        ? undefined
        : (() => {
            const uri = result.assets[0].uri;
            const filename = uri.split('/').pop() || 'observation.jpg';
            const extension = filename.split('.').pop()?.toLowerCase();
            const type = extension === 'png' ? 'image/png' : 'image/jpeg';
            return { uri, name: filename, type };
          })();

      await logMutation.mutateAsync({ treeId, status, photo });
      success();
      setExpanded(false);
    },
    [treeId, logMutation, medium, success],
  );

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.checkInButton} onPress={() => setExpanded(true)}>
        <Text style={styles.checkInButtonText}>How's it doing? Check in 🌱</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.checkInRow}>
      {ACTIONABLE_STATUSES.map((status) => (
        <TouchableOpacity
          key={status}
          style={[styles.markButton, { borderColor: STATUS_META[status].color }]}
          disabled={logMutation.isPending}
          onPress={() => handleCheckIn(status)}
        >
          <Text style={styles.markButtonText}>
            {logMutation.isPending ? '…' : `${STATUS_META[status].emoji} ${STATUS_META[status].label}`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PassportBody({ passport, navigation }: { passport: TreePassport; navigation: any }) {
  const { user } = useAuth();
  const isIndividual = passport.kind === 'individual';
  const isOwner = isIndividual && passport.owner.id === user?.id;
  const nickname = isIndividual ? passport.nickname : (passport.label ?? passport.speciesName);
  const speciesLabel = isIndividual ? `${passport.species.emoji} ${passport.species.commonName}` : `🌳 ${passport.speciesName}`;
  const verification = isIndividual ? VERIFICATION_META[passport.aiVerificationStatus] : null;
  const isDead = passport.healthStatus === 'dead';

  return (
    <>
      {passport.photoUrl ? (
        <Image
          source={{ uri: resolveMediaUrl(passport.photoUrl) }}
          style={[styles.heroPhoto, isDead && styles.heroPhotoMemorial]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.heroPlaceholder, isDead && styles.heroPhotoMemorial]}>
          <Text style={styles.heroPlaceholderEmoji}>{speciesLabel.split(' ')[0]}</Text>
        </View>
      )}

      <View style={styles.heroTextBlock}>
        <Text style={styles.heroSpecies}>{speciesLabel}</Text>
        <Text style={styles.heroName}>{nickname}</Text>
        <View style={styles.publicIdChip}>
          <Text style={styles.publicIdChipText}>ARTH #{passport.publicId}</Text>
        </View>
      </View>

      <Section title="Origin">
        <BorderCard>
          {isIndividual ? (
            passport.nursery ? (
              <InfoRow label="Nursery" value={passport.nursery.nurseryName} />
            ) : (
              <InfoRow label="Source" value="Self-sourced planting" />
            )
          ) : (
            <>
              <InfoRow label="NGO" value={passport.ngo.orgName} />
              {passport.drive ? <InfoRow label="Drive" value={passport.drive.title} /> : null}
              {passport.zone ? <InfoRow label="Zone" value={passport.zone.name} /> : null}
            </>
          )}
          {passport.sourceUnit ? (
            <>
              <InfoRow label="Sapling" value={passport.sourceUnit.speciesNameSnapshot} />
              {passport.sourceUnit.ageAtSupplyLabel ? (
                <InfoRow label="Age at supply" value={passport.sourceUnit.ageAtSupplyLabel} />
              ) : null}
            </>
          ) : null}
        </BorderCard>
      </Section>

      <Section title="Planting">
        <BorderCard>
          <InfoRow label="Planted" value={formatDate(passport.plantedAt)} />
          {passport.locationLabel ? <InfoRow label="Location" value={passport.locationLabel} /> : null}
          {passport.lat != null && passport.lng != null ? (
            <InfoRow label="GPS" value={`${passport.lat.toFixed(5)}, ${passport.lng.toFixed(5)}`} />
          ) : null}
        </BorderCard>
      </Section>

      {verification ? (
        <Section title="Verification">
          <View style={[styles.verificationPill, { borderColor: verification.color }]}>
            <Text style={[styles.verificationText, { color: verification.color }]}>{verification.label}</Text>
          </View>
        </Section>
      ) : null}

      <Section title={isDead ? 'This tree’s journey has ended' : 'Current health'}>
        {isDead ? (
          <BorderCard style={styles.memorialCard}>
            <Text style={styles.memorialBody}>
              You gave {nickname} a beginning. Its story stays part of your forest.
            </Text>
            <TouchableOpacity
              style={styles.memorialButton}
              onPress={() =>
                navigation.navigate('PlantTree', isIndividual ? { preselectSpeciesId: passport.species.id } : undefined)
              }
            >
              <Text style={styles.memorialButtonText}>Plant a replacement 🌱</Text>
            </TouchableOpacity>
          </BorderCard>
        ) : (
          <>
            <HealthBadge key={passport.healthStatus} status={passport.healthStatus} />
            {isOwner ? <CheckInControl treeId={passport.id} /> : null}
          </>
        )}
      </Section>

      {isIndividual ? (
        <Section title="Impact">
          <View style={styles.statsRow}>
            <StatDisplay value={passport.co2Absorbed.toFixed(1)} label="kg CO₂" size="md" />
            <StatDisplay value={passport.xpEarned} label="XP earned" size="md" />
          </View>
        </Section>
      ) : null}

      <Section title="People">
        <BorderCard>
          {isIndividual ? (
            <InfoRow label="Planted by" value={`${passport.owner.name} (@${passport.owner.handle})`} />
          ) : (
            <>
              <InfoRow label="NGO" value={passport.ngo.orgName} />
              {passport.adopter ? (
                <InfoRow label="Adopted by" value={`${passport.adopter.name} (@${passport.adopter.handle})`} />
              ) : null}
            </>
          )}
        </BorderCard>
      </Section>

      <Section title="Life timeline">
        {passport.timeline.length === 0 ? (
          <Text style={styles.emptyTimeline}>No history yet.</Text>
        ) : (
          passport.timeline.map((entry, index) => <TimelineRow key={entry.id} entry={entry} index={index} />)
        )}
      </Section>
    </>
  );
}

export function TreePassportScreen({ navigation, route }: any) {
  const { kind, id } = route.params as { kind: 'tree' | 'planted-tree'; id: string };
  const insets = useSafeAreaInsets();
  const { data: passport, isLoading } = useTreePassport(kind, id);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Tree Passport</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading || !passport ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          <PassportBody passport={passport} navigation={navigation} />
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  heroPhoto: { width: '100%', height: 220, borderRadius: RADIUS.lg, marginBottom: 4 },
  heroPhotoMemorial: { opacity: 0.55 },
  heroPlaceholder: { width: '100%', height: 220, borderRadius: RADIUS.lg, marginBottom: 4, backgroundColor: COLORS.beigeLight, alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderEmoji: { fontSize: 64 },
  heroTextBlock: { alignItems: 'center', marginTop: 10, marginBottom: 18 },
  heroSpecies: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  heroName: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  publicIdChip: { marginTop: 8, paddingVertical: 5, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: COLORS.warmBrown },
  publicIdChipText: { fontSize: 12, fontWeight: '700', color: COLORS.warmBrown, letterSpacing: 0.5 },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 6, gap: 12 },
  infoLabel: { fontSize: 12, color: COLORS.textSecondary },
  infoValue: { fontSize: 13, color: COLORS.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right' },
  verificationPill: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1.5 },
  verificationText: { fontSize: 12, fontWeight: '700' },
  healthPill: { alignSelf: 'flex-start', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5 },
  healthPillText: { fontSize: 14, fontWeight: '700' },
  checkInButton: { marginTop: 12, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.md, backgroundColor: COLORS.sage },
  checkInButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.cream },
  checkInRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  markButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: RADIUS.full, borderWidth: 1.5, backgroundColor: 'transparent' },
  markButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  memorialCard: { gap: 12 },
  memorialBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  memorialButton: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.md, backgroundColor: COLORS.sage },
  memorialButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.cream },
  statsRow: { flexDirection: 'row', gap: 32 },
  emptyTimeline: { fontSize: 12, color: COLORS.textSecondary },
  timelineRow: { marginBottom: 8 },
  timelineRowInner: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  timelineSource: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  timelineObserver: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  timelineNote: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  timelineDate: { fontSize: 11, color: COLORS.textMuted },
});
