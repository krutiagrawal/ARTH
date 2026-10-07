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
import { useTreePassport, useLogOwnObservation, useReviewTreeUpdate } from '../hooks/useApiQueries';
import { useLiveDistance } from '../hooks/useLiveDistance';
import { formatMeters } from '../utils/geo';
import { useAuth } from '../context/AuthContext';
import { useHaptics } from '../hooks/useHaptics';
import { useSlideUp, useFadeIn } from '../hooks/useAnimations';
import { resolveMediaUrl } from '../api/client';
import { STATUS_META, ACTIONABLE_STATUSES } from '../constants/treeHealth';
import type { TreePassport, PassportTimelineEntry } from '../api/trees';
import { formatKg, formatTreeAge } from '../utils/impact';

import { TEXT } from '../constants/typography';
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
  community: '📣 External update',
};

const SOURCE_LABEL: Record<PassportTimelineEntry['source'], string> = {
  planted: 'Planted',
  verified: 'Verified',
  health_check: 'Health check',
  observation: 'Observation',
};

// Translucent tints (never white) cycled across the detail tiles so the grid reads as a
// colourful patchwork rather than a stack of identical boxes.
const TILE_TONES = [
  { bg: 'rgba(135,168,120,0.20)', border: 'rgba(135,168,120,0.45)' },
  { bg: 'rgba(212,168,83,0.18)', border: 'rgba(212,168,83,0.45)' },
  { bg: 'rgba(232,137,106,0.16)', border: 'rgba(232,137,106,0.40)' },
  { bg: 'rgba(120,170,210,0.20)', border: 'rgba(120,170,210,0.45)' },
];

interface Tile {
  icon: string;
  label: string;
  value: string;
  wide?: boolean;
  big?: boolean;
  onPress?: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function DetailTile({ tile, tone }: { tile: Tile; tone: (typeof TILE_TONES)[number] }) {
  const style = [styles.tile, tile.wide && styles.tileWide, { backgroundColor: tone.bg, borderColor: tone.border }];
  const content = (
    <>
      <View style={styles.tileTop}>
        <Text style={styles.tileIcon}>{tile.icon}</Text>
        {tile.onPress ? <Text style={styles.tileChevron}>↗</Text> : null}
      </View>
      <Text style={styles.tileLabel}>{tile.label}</Text>
      <Text style={[styles.tileValue, tile.big && styles.tileValueBig, tile.onPress && styles.tileValueLink]} numberOfLines={2}>
        {tile.value}
      </Text>
    </>
  );
  if (!tile.onPress) return <View style={style}>{content}</View>;
  return (
    <TouchableOpacity style={style} activeOpacity={0.7} onPress={tile.onPress}>
      {content}
    </TouchableOpacity>
  );
}

function TimelineRow({ entry, index }: { entry: PassportTimelineEntry; index: number }) {
  const meta = entry.status && entry.status in STATUS_META ? STATUS_META[entry.status as keyof typeof STATUS_META] : null;
  const slideStyle = useSlideUp(Math.min(index * TIMELINE_STAGGER_STEP_MS, MAX_TIMELINE_STAGGER_MS), 14);
  const color = meta ? meta.color : COLORS.sage;
  return (
    <Animated.View style={[styles.timelineItem, slideStyle]}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineDot, { backgroundColor: color }]} />
        <View style={styles.timelineLine} />
      </View>
      <View style={[styles.timelineRow, { borderLeftColor: color }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.timelineSource}>
            {meta ? `${meta.emoji} ` : ''}{meta ? meta.label : SOURCE_LABEL[entry.source]}
          </Text>
          {entry.observerRole ? (
            <Text style={styles.timelineObserver}>
              {OBSERVER_LABEL[entry.observerRole]}
              {entry.observerRole === 'community' && entry.observer ? ` · from @${entry.observer.handle}` : ''}
            </Text>
          ) : null}
          {entry.photoUrl && entry.observerRole === 'community' ? (
            <Image source={{ uri: resolveMediaUrl(entry.photoUrl) }} style={styles.timelinePhoto} />
          ) : null}
          {entry.note ? <Text style={styles.timelineNote}>{entry.note}</Text> : null}
        </View>
        <Text style={styles.timelineDate}>{formatDate(entry.at)}</Text>
      </View>
    </Animated.View>
  );
}

function CheckInControl({ treeId }: { treeId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const logMutation = useLogOwnObservation();
  const { medium, success } = useHaptics();

  const handleCheckIn = useCallback(
    async (status: (typeof ACTIONABLE_STATUSES)[number]) => {
      medium();
      setHint(null);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setHint('Camera access is needed to take the live photo for a health check-in.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      // Health only changes once a live photo is actually captured.
      if (result.canceled || !result.assets?.[0]) {
        setHint('No photo taken — health was not updated.');
        return;
      }
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop() || 'observation.jpg';
      const extension = filename.split('.').pop()?.toLowerCase();
      const type = extension === 'png' ? 'image/png' : 'image/jpeg';

      try {
        await logMutation.mutateAsync({ treeId, status, photo: { uri, name: filename, type } });
        success();
        setExpanded(false);
      } catch {
        setHint('Could not save the check-in. Please try again.');
      }
    },
    [treeId, logMutation, medium, success],
  );

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.checkInButton} onPress={() => setExpanded(true)}>
        <Text style={styles.checkInButtonText}>📸  How's it doing? Check in</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <View style={styles.checkInRow}>
        {ACTIONABLE_STATUSES.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.markButton, { borderColor: STATUS_META[status].color, backgroundColor: `${STATUS_META[status].color}22` }]}
            disabled={logMutation.isPending}
            onPress={() => handleCheckIn(status)}
          >
            <Text style={styles.markButtonText}>
              {logMutation.isPending ? '…' : `${STATUS_META[status].emoji} ${STATUS_META[status].label}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.checkInHint, hint ? styles.checkInHintWarn : null]}>
        {hint ?? '📸 A live photo is required to update health.'}
      </Text>
    </View>
  );
}

// Keyed on status at the call site so a status change remounts it and replays the fade-in.
function HealthBanner({ status, children }: { status: keyof typeof STATUS_META; children?: React.ReactNode }) {
  const fadeStyle = useFadeIn(0, 350);
  const meta = STATUS_META[status];
  return (
    <Animated.View style={fadeStyle}>
      <View style={styles.healthBanner}>
        <View style={styles.healthTop}>
          <Text style={styles.healthEmoji}>{meta.emoji}</Text>
          <Text style={styles.healthCaption}>CURRENT HEALTH</Text>
          <Text style={[styles.healthLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
        {children}
      </View>
    </Animated.View>
  );
}

function navigateToTree(navigation: any, passport: TreePassport, lat: number, lng: number) {
  navigation.navigate('TreeNavigation', {
    kind: passport.kind === 'individual' ? 'tree' : 'planted-tree',
    id: passport.id,
    lat,
    lng,
    species: passport.kind === 'individual' ? passport.species.commonName : passport.speciesName,
    speciesEmoji: passport.kind === 'individual' ? passport.species.emoji : null,
    publicId: passport.publicId,
    latestPhotoUrl: passport.latestPhotoUrl,
  });
}

// Live distance strip for visitors, with shortcuts into navigation and sending an update.
function FindTreeBar({ passport, navigation }: { passport: TreePassport; navigation: any }) {
  const { lat, lng } = passport;
  const target = lat != null && lng != null ? { lat, lng } : null;
  const { distanceM } = useLiveDistance(target);
  if (!target) return null;
  const isTree = passport.kind === 'individual';
  return (
    <View style={styles.findBar}>
      <View style={{ flex: 1 }}>
        <Text style={styles.findBarCaption}>YOU ARE</Text>
        <Text style={styles.findBarDistance}>{distanceM == null ? '…' : `${formatMeters(distanceM)} away`}</Text>
      </View>
      <TouchableOpacity style={styles.findBarButton} onPress={() => navigateToTree(navigation, passport, target.lat, target.lng)}>
        <Text style={styles.findBarButtonText}>🧭 Navigate</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.findBarButton, styles.findBarButtonAlt]}
        onPress={() =>
          navigation.navigate('LogCommunityObservation', {
            kind: isTree ? 'tree' : 'planted-tree',
            id: passport.id,
            species: isTree ? passport.species.commonName : passport.speciesName,
            speciesEmoji: isTree ? passport.species.emoji : null,
            photoUrl: passport.latestPhotoUrl,
            publicId: passport.publicId,
          })
        }
      >
        <Text style={styles.findBarButtonText}>📸 Send update</Text>
      </TouchableOpacity>
    </View>
  );
}

// Owner-only: community updates waiting for a decision. Accepting adds it to the timeline,
// labelled as an external update; declining discards it. Neither changes the tree's health.
function PendingUpdates({ updates }: { updates: TreePassport['pendingUpdates'] }) {
  const review = useReviewTreeUpdate();
  if (updates.length === 0) return null;
  return (
    <View style={styles.pendingWrap}>
      <Text style={styles.gridHeading}>📬 UPDATES AWAITING YOUR DECISION</Text>
      {updates.map((u) => (
        <View key={u.id} style={styles.pendingCard}>
          {u.photoUrl ? <Image source={{ uri: resolveMediaUrl(u.photoUrl) }} style={styles.pendingPhoto} /> : null}
          <Text style={styles.pendingFrom}>
            From {u.observer ? `${u.observer.name} (@${u.observer.handle})` : 'a visitor'} · {formatDate(u.at)}
          </Text>
          {u.note ? <Text style={styles.pendingNote}>{u.note}</Text> : null}
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={[styles.pendingButton, styles.pendingAccept]}
              disabled={review.isPending}
              onPress={() => review.mutate({ observationId: u.id, decision: 'accept' })}
            >
              <Text style={styles.pendingAcceptText}>✓ Add to timeline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pendingButton, styles.pendingReject]}
              disabled={review.isPending}
              onPress={() => review.mutate({ observationId: u.id, decision: 'reject' })}
            >
              <Text style={styles.pendingRejectText}>✕ Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

function buildTiles(passport: TreePassport, navigation: any): Tile[] {
  const tiles: Tile[] = [{ icon: '📅', label: 'Planted', value: formatDate(passport.plantedAt) }];
  const openUser = (userId: string) => () => navigation.navigate('UserPublicProfile', { userId });

  if (passport.kind === 'individual') {
    const nursery = passport.nursery;
    tiles.push({
      icon: nursery ? '🏡' : '🌱',
      label: nursery ? 'Nursery' : 'Source',
      value: nursery ? nursery.nurseryName : 'Self-sourced',
      onPress: nursery ? () => navigation.navigate('NurseryPublicProfile', { nurseryId: nursery.id }) : undefined,
    });
    tiles.push({ icon: '🌍', label: 'CO₂ stored (est.)', value: `${formatKg(passport.co2Absorbed)} kg`, big: true });
    if (passport.oxygenKg !== undefined) tiles.push({ icon: '💨', label: 'Oxygen released (est.)', value: `${formatKg(passport.oxygenKg)} kg`, big: true });
    if (passport.ageDays !== undefined) tiles.push({ icon: '📅', label: 'Age', value: formatTreeAge(passport.ageDays) });
    if (passport.estimatedHeightM !== undefined) tiles.push({ icon: '📏', label: 'Height (est.)', value: `${passport.estimatedHeightM.toFixed(1)} m` });
    tiles.push({ icon: '⭐', label: 'XP earned', value: String(passport.xpEarned), big: true });
  } else {
    tiles.push({ icon: '🏢', label: 'NGO', value: passport.ngo.orgName, onPress: () => navigation.navigate('NgoPublicProfile', { ngoId: passport.ngo.id }) });
    if (passport.drive) tiles.push({ icon: '🚩', label: 'Drive', value: passport.drive.title });
    if (passport.zone) tiles.push({ icon: '🗺️', label: 'Zone', value: passport.zone.name });
  }

  if (passport.sourceUnit) {
    tiles.push({ icon: '🪴', label: 'Sapling', value: passport.sourceUnit.speciesNameSnapshot });
    if (passport.sourceUnit.ageAtSupplyLabel) tiles.push({ icon: '⏳', label: 'Age at supply', value: passport.sourceUnit.ageAtSupplyLabel });
  }
  if (passport.locationLabel) tiles.push({ icon: '📌', label: 'Location', value: passport.locationLabel, wide: true });
  const { lat, lng } = passport;
  if (lat != null && lng != null) {
    tiles.push({ icon: '🧭', label: 'GPS · tap to navigate', value: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, wide: true, onPress: () => navigateToTree(navigation, passport, lat, lng) });
  }
  if (passport.kind === 'individual') {
    tiles.push({ icon: '🧑‍🌾', label: 'Planted by', value: `${passport.owner.name} (@${passport.owner.handle})`, wide: true, onPress: openUser(passport.owner.id) });
  } else if (passport.adopter) {
    tiles.push({ icon: '💛', label: 'Adopted by', value: `${passport.adopter.name} (@${passport.adopter.handle})`, wide: true, onPress: openUser(passport.adopter.id) });
  }
  return tiles;
}

function PassportBody({ passport, navigation }: { passport: TreePassport; navigation: any }) {
  const { user } = useAuth();
  const isIndividual = passport.kind === 'individual';
  const isOwner = isIndividual && passport.owner.id === user?.id;
  const isTreeOwner = isOwner || (!isIndividual && !!user && passport.adopter?.id === user.id);
  const nickname = isIndividual ? passport.nickname : (passport.label ?? passport.speciesName);
  const speciesLabel = isIndividual ? `${passport.species.emoji} ${passport.species.commonName}` : `🌳 ${passport.speciesName}`;
  const verification = isIndividual ? VERIFICATION_META[passport.aiVerificationStatus] : null;
  const isDead = passport.healthStatus === 'dead';
  const tiles = buildTiles(passport, navigation);

  return (
    <>
      <View style={styles.hero}>
        {passport.photoUrl ? (
          <Image
            source={{ uri: resolveMediaUrl(passport.photoUrl) }}
            style={[styles.heroPhoto, isDead && styles.heroPhotoMemorial]}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient colors={[COLORS.mint, COLORS.sage]} style={[styles.heroPhoto, styles.heroPlaceholder]}>
            <Text style={styles.heroPlaceholderEmoji}>{speciesLabel.split(' ')[0]}</Text>
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', 'rgba(13,35,24,0.88)']} style={styles.heroOverlay} />
        {verification ? (
          <View style={[styles.heroBadge, { backgroundColor: verification.color }]}>
            <Text style={styles.heroBadgeText}>✓ {verification.label}</Text>
          </View>
        ) : null}
        <View style={styles.heroTextBlock}>
          <Text style={styles.heroSpecies}>{speciesLabel}</Text>
          <Text style={styles.heroName} numberOfLines={2}>{nickname}</Text>
          <View style={styles.publicIdChip}>
            <Text style={styles.publicIdChipText}>ARTH #{passport.publicId}</Text>
          </View>
        </View>
      </View>

      {isDead ? (
        <View style={styles.memorialCard}>
          <Text style={styles.memorialTitle}>🕊️ This tree’s journey has ended</Text>
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
        </View>
      ) : (
        <HealthBanner key={passport.healthStatus} status={passport.healthStatus}>
          {isOwner ? <CheckInControl treeId={passport.id} /> : null}
        </HealthBanner>
      )}

      <PendingUpdates updates={passport.pendingUpdates} />
      {!isTreeOwner ? <FindTreeBar passport={passport} navigation={navigation} /> : null}

      <Text style={styles.gridHeading}>PASSPORT DETAILS</Text>
      <View style={styles.grid}>
        {tiles.map((tile, i) => (
          <DetailTile key={tile.label} tile={tile} tone={TILE_TONES[i % TILE_TONES.length]} />
        ))}
      </View>

      <Text style={styles.gridHeading}>LIFE TIMELINE</Text>
      {passport.timeline.length === 0 ? (
        <Text style={styles.emptyTimeline}>No history yet.</Text>
      ) : (
        passport.timeline.map((entry, index) => <TimelineRow key={entry.id} entry={entry} index={index} />)
      )}
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
      <LinearGradient colors={[COLORS.mintLight, COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

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
  headerTitle: { flex: 1,...TEXT.heading, color: COLORS.textPrimary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },

  hero: { width: '100%', height: 300, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 14 },
  heroPhoto: { width: '100%', height: '100%' },
  heroPhotoMemorial: { opacity: 0.55 },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  heroPlaceholderEmoji: { fontSize: 88 },
  heroOverlay: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 170 },
  heroBadge: { position: 'absolute', top: 14, right: 14, paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  heroBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.white },
  heroTextBlock: { position: 'absolute', left: 18, right: 18, bottom: 16 },
  heroSpecies: { fontSize: 13, color: COLORS.mint, fontWeight: '700' },
  heroName: { ...TEXT.title, color: COLORS.white, marginTop: 2 },
  publicIdChip: { alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: COLORS.sageLight },
  publicIdChipText: { fontSize: 12, fontWeight: '700', color: COLORS.mint, letterSpacing: 0.8 },

  healthBanner: { marginBottom: 20 },
  healthTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  healthEmoji: { fontSize: 18 },
  healthCaption: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1 },
  healthLabel: { fontSize: 14, fontWeight: '800' },
  checkInButton: { marginTop: 10, alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 18, borderRadius: RADIUS.full, backgroundColor: COLORS.forest },
  checkInButtonText: { fontSize: 14, fontWeight: '800', color: COLORS.mint },
  checkInRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  markButton: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: RADIUS.full, borderWidth: 1.5 },
  markButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  checkInHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 10 },
  checkInHintWarn: { color: COLORS.danger, fontWeight: '700' },

  memorialCard: { borderRadius: RADIUS.lg, padding: 16, marginBottom: 22, gap: 10, backgroundColor: 'rgba(110,99,85,0.14)', borderWidth: 1.5, borderColor: 'rgba(110,99,85,0.4)' },
  memorialTitle: { ...TEXT.subheading, color: COLORS.textPrimary },
  memorialBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  memorialButton: { alignSelf: 'flex-start', paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.md, backgroundColor: COLORS.forest },
  memorialButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.mint },

  gridHeading: { fontSize: 12, fontWeight: '800', color: COLORS.forest, letterSpacing: 1.5, marginBottom: 10, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  tile: { width: '48.2%', borderRadius: RADIUS.lg, borderWidth: 1.5, padding: 14, minHeight: 104 },
  tileWide: { width: '100%', minHeight: 0 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileChevron: { fontSize: 16, fontWeight: '800', color: COLORS.forest },
  tileValueLink: { textDecorationLine: 'underline' },
  tileIcon: { fontSize: 24 },
  tileLabel: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8 },
  tileValue: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginTop: 2 },
  tileValueBig: { ...TEXT.statSmall, fontSize: 22, color: COLORS.forest },

  emptyTimeline: { fontSize: 12, color: COLORS.textSecondary },
  timelineItem: { flexDirection: 'row', gap: 10 },
  timelineRail: { width: 14, alignItems: 'center' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 14 },
  timelineLine: { flex: 1, width: 2, backgroundColor: 'rgba(135,168,120,0.4)', marginTop: 2 },
  timelineRow: { flex: 1, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, gap: 10, marginBottom: 8, borderRadius: RADIUS.md, borderLeftWidth: 4, backgroundColor: 'rgba(135,168,120,0.12)' },
  timelineSource: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  timelinePhoto: { width: '100%', height: 140, borderRadius: RADIUS.md, marginTop: 8 },
  findBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 22, padding: 12, borderRadius: RADIUS.lg, backgroundColor: 'rgba(120,170,210,0.18)', borderWidth: 1.5, borderColor: 'rgba(120,170,210,0.45)' },
  findBarCaption: { fontSize: 10, fontWeight: '800', color: COLORS.textSecondary, letterSpacing: 1 },
  findBarDistance: { ...TEXT.subheading, color: COLORS.forest },
  findBarButton: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: RADIUS.full, backgroundColor: COLORS.forest },
  findBarButtonAlt: { backgroundColor: COLORS.sageDark },
  findBarButtonText: { fontSize: 12, fontWeight: '800', color: COLORS.mint },
  pendingWrap: { marginBottom: 14 },
  pendingCard: { padding: 12, marginBottom: 10, borderRadius: RADIUS.lg, backgroundColor: 'rgba(212,168,83,0.18)', borderWidth: 1.5, borderColor: 'rgba(212,168,83,0.5)', gap: 8 },
  pendingPhoto: { width: '100%', height: 180, borderRadius: RADIUS.md },
  pendingFrom: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  pendingNote: { fontSize: 14, color: COLORS.textPrimary },
  pendingActions: { flexDirection: 'row', gap: 8 },
  pendingButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: RADIUS.full, borderWidth: 1.5 },
  pendingAccept: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  pendingAcceptText: { fontSize: 13, fontWeight: '800', color: COLORS.mint },
  pendingReject: { backgroundColor: 'transparent', borderColor: COLORS.danger },
  pendingRejectText: { fontSize: 13, fontWeight: '800', color: COLORS.danger },
  timelineObserver: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  timelineNote: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  timelineDate: { fontSize: 11, color: COLORS.textMuted },
});
