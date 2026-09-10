import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Image } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { StatusModal } from '../components/common/StatusModal';
import { MascotBubble } from '../components/common/Mascot';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { useHaptics } from '../hooks/useHaptics';
import { useSpecies, useCreateSpecies } from '../hooks/useApiQueries';
import { usePlantTree } from '../hooks/useApiQueries';
import { useCheckPlantingEligibility } from '../hooks/useApiQueries';
import { useVerifyPlantingPhoto } from '../hooks/useApiQueries';
import { ApiError } from '../api/client';
import { SPECIES_EMOJI_OPTIONS } from '../api/species';
import type { VerifyPlantingPhotoResult } from '../api/trees';
import { NOT_APPROVED_MESSAGE } from '../constants/plantingLocation';
import { getCurrentPositionWithTimeout } from '../utils/location';
import { EFFECTIVE_WIDTH } from '../utils/responsive';
import { useBottomNavClearance } from '../components/navigation/BottomNav';

const { width: SW, height: SH } = Dimensions.get('window');

// Species pills: fixed 3-per-row grid, matched to detailsContent's own horizontal padding/gap so
// each column comes out equal-width instead of shrink-wrapping to its label.
const SPECIES_GRID_PADDING = 20;
const SPECIES_GRID_GAP = 8;
const SPECIES_CHIP_WIDTH = (EFFECTIVE_WIDTH - SPECIES_GRID_PADDING * 2 - SPECIES_GRID_GAP * 2) / 3;
const INITIAL_SPECIES_COUNT = 9;

type Stage = 'upload' | 'scanning' | 'details' | 'success';

interface LocationInfo {
  lat: number;
  lng: number;
  label: string;
}

// Highest, not BestForNavigation — that's meant for continuous watchPosition tracking; a single
// getCurrentPositionAsync read only needs Highest's one-shot best-effort accuracy.
const PLANTING_LOCATION_ACCURACY = Location.Accuracy.Highest;

function ScanAnimation({ onComplete }: { onComplete: () => void }) {
  const scanY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const glowOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    scanY.value = withRepeat(
      withTiming(200, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      3,
      true
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 600 }),
        withTiming(0.2, { duration: 600 })
      ),
      3,
      false
    );
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.97, { duration: 600, easing: Easing.inOut(Easing.sin) })
      ),
      3,
      true
    );

    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 400 }, () => {
        runOnJS(onComplete)();
      });
    }, 3800);

    return () => clearTimeout(timeout);
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, containerStyle]}>
      {/* Scan glow */}
      <Animated.View style={[styles.scanGlow, glowStyle]} />

      {/* Corner brackets */}
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />

      {/* Scan line */}
      <Animated.View style={[styles.scanLine, scanLineStyle]}>
        <LinearGradient
          colors={['transparent', COLORS.sageLight, 'transparent']}
          style={styles.scanLineGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </Animated.View>

      {/* Scan label */}
      <View style={styles.scanLabel}>
        <Text style={styles.scanLabelText}>🔍 AI Analyzing...</Text>
      </View>
    </Animated.View>
  );
}

function SuccessAnimation({ treeName, xpEarned }: { treeName: string; xpEarned: number }) {
  const checkScale = useSharedValue(0);
  const confettiOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  React.useEffect(() => {
    checkScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 150 }));
    confettiOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    textOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: 20 - textOpacity.value * 20 }],
  }));

  return (
    <View style={styles.successContainer}>
      <FloatingParticles count={22} type="petal" />

      <View style={styles.successCard}>
        <Animated.View style={[styles.successCheck, checkStyle]}>
          <LinearGradient
            colors={[COLORS.sageLight, COLORS.forest]}
            style={styles.successCheckGradient}
          >
            <Text style={styles.successCheckIcon}>🌱</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.successText, textStyle]}>
          <Text style={styles.successTitle}>Tree Added! 🎉</Text>
          <Text style={styles.successSubtitle}>
            "{treeName}" has joined your forest
          </Text>
          <View style={styles.successXp}>
            <Text style={styles.successXpText}>+{xpEarned} XP earned</Text>
          </View>
        </Animated.View>

        <MascotBubble message="Amazing! Your forest grows stronger 🌿" size={90} mood="proud" />
      </View>
    </View>
  );
}

export function PlantTreeScreen({ navigation, route }: any) {
  const verifiedLat: number | undefined = route?.params?.verifiedLat;
  const verifiedLng: number | undefined = route?.params?.verifiedLng;
  const isPreVerified = verifiedLat != null && verifiedLng != null;

  const [stage, setStage] = useState<Stage>('upload');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [showAddSpecies, setShowAddSpecies] = useState(false);
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [newSpeciesName, setNewSpeciesName] = useState('');
  const [newSpeciesEmoji, setNewSpeciesEmoji] = useState<string | null>(null);
  const [addSpeciesError, setAddSpeciesError] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationInfo | null>(
    isPreVerified ? { lat: verifiedLat!, lng: verifiedLng!, label: 'Verified planting spot' } : null
  );
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Whether this exact location has been confirmed as an ARTH-approved spot. Coming in via the
  // map's "Plant where you are" button, it's already been checked — otherwise (direct-tab entry)
  // it starts unknown and gets checked once GPS resolves, in the effect below.
  const [eligible, setEligible] = useState<boolean | null>(isPreVerified ? true : null);
  const [showNotApprovedModal, setShowNotApprovedModal] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { success, medium } = useHaptics();
  const insets = useSafeAreaInsets();
  const bottomNavClearance = useBottomNavClearance(8);

  const { data: speciesList = [] } = useSpecies();
  const createSpeciesMutation = useCreateSpecies();
  const plantTreeMutation = usePlantTree();
  const checkEligibility = useCheckPlantingEligibility();
  const verifyPhoto = useVerifyPlantingPhoto();
  // Kicked off the moment a photo is picked, so it runs alongside the (purely cosmetic)
  // ScanAnimation instead of starting only once that animation finishes.
  const verifyPromiseRef = useRef<Promise<VerifyPlantingPhotoResult> | null>(null);
  const selectedSpecies = speciesList.find(s => s.id === selectedSpeciesId) ?? null;
  const visibleSpecies = showAllSpecies ? speciesList : speciesList.slice(0, INITIAL_SPECIES_COUNT);
  const hasMoreSpecies = speciesList.length > INITIAL_SPECIES_COUNT;

  const fetchLocation = useCallback(async () => {
    if (isPreVerified) return;
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation(null);
        return;
      }
      const position = await getCurrentPositionWithTimeout({ accuracy: PLANTING_LOCATION_ACCURACY });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const label = place
        ? [place.city ?? place.subregion, place.region ?? place.country].filter(Boolean).join(', ')
        : `${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}`;
      setEligible(null);
      setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, label: label || 'Unknown location' });
    } catch {
      setLocation(null);
    } finally {
      setLocationLoading(false);
    }
  }, [isPreVerified]);

  // Direct-tab entry (no map pre-check): once GPS resolves, verify it against ARTH-approved
  // locations before letting the user submit — this makes the coordinate check apply no matter
  // how the user got here, not just via the map's button.
  useEffect(() => {
    if (isPreVerified || !location) return;
    let cancelled = false;
    checkEligibility.mutateAsync({ lat: location.lat, lng: location.lng }).then((result) => {
      if (!cancelled) setEligible(result.eligible);
    }).catch(() => {
      if (!cancelled) setEligible(null);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreVerified, location?.lat, location?.lng]);

  useEffect(() => {
    if (!isPreVerified && eligible === false) {
      setShowNotApprovedModal(true);
    }
  }, [eligible, isPreVerified]);

  const beginVerification = useCallback((uri: string) => {
    setImageUri(uri);
    setStage('scanning');
    const filename = uri.split('/').pop() || 'tree.jpg';
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';
    verifyPromiseRef.current = verifyPhoto.mutateAsync({ uri, name: filename, type: mimeType });
  }, [verifyPhoto]);

  const handleCameraCapture = useCallback(async () => {
    medium();
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) beginVerification(result.assets[0].uri);
  }, [medium, beginVerification]);

  // Fires when the ScanAnimation's own ~3.8s animation finishes. The real verification call
  // started back in beginVerification is usually done well before that; if it's still pending
  // (slow network), this waits for it rather than proceeding blind. A network failure here
  // fails open (lets the user continue) — the final submit re-verifies server-side regardless.
  const handleScanComplete = useCallback(async () => {
    try {
      const result = await verifyPromiseRef.current;
      if (result && !result.isPlanting) {
        setRejectionReason(result.reason || "This photo doesn't look like a tree planting. Please try again.");
        setShowRejectedModal(true);
        setStage('upload');
        setImageUri(null);
        return;
      }
    } catch {
      // Pre-check failed (e.g. offline) — don't block the user on it; final submit re-verifies.
    }
    setStage('details');
    fetchLocation();
  }, [fetchLocation]);

  const [xpEarned, setXpEarned] = useState(0);

  const handleSubmit = useCallback(async () => {
    if (!selectedSpecies || !imageUri) return;
    setSubmitError(null);

    // Always take a fresh, high-accuracy reading right now — regardless of isPreVerified or
    // whatever's cached in `location` state — so a coordinate fetched earlier (or before this
    // screen even opened, via MapScreen's "Plant where you are") can never be reused stale at
    // submit time. `location` is still used below, but only for the cosmetic locationLabel.
    let freshPosition;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') throw new Error('Location permission is required to plant a tree.');
      freshPosition = await getCurrentPositionWithTimeout({ accuracy: PLANTING_LOCATION_ACCURACY });
    } catch (locErr) {
      setSubmitError(locErr instanceof Error ? locErr.message : "Couldn't get your current location. Please try again.");
      return;
    }

    if (freshPosition.mocked) {
      setSubmitError('Your device is reporting a mock/fake GPS location. Please disable mock locations and try again.');
      return;
    }

    try {
      const filename = imageUri.split('/').pop() || 'tree.jpg';
      const extension = filename.split('.').pop()?.toLowerCase();
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

      const tree = await plantTreeMutation.mutateAsync({
        speciesId: selectedSpecies.id,
        nickname: nickname.trim() || selectedSpecies.commonName,
        lat: freshPosition.coords.latitude,
        lng: freshPosition.coords.longitude,
        accuracy: freshPosition.coords.accuracy ?? undefined,
        mocked: freshPosition.mocked ?? false,
        locationLabel: location?.label,
        photo: { uri: imageUri, name: filename, type: mimeType },
      });

      setXpEarned(tree.xpEarned);
      success();
      setStage('success');
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setSubmitError(e.message); // show the backend's actual reason, not a hardcoded zone message
      } else {
        setSubmitError(e instanceof Error ? e.message : 'Could not save your tree. Please try again.');
      }
    }
  }, [selectedSpecies, imageUri, nickname, location, plantTreeMutation, success]);

  const handleAddSpecies = useCallback(async () => {
    const commonName = newSpeciesName.trim();
    if (!commonName || !newSpeciesEmoji) return;
    setAddSpeciesError(null);
    try {
      const species = await createSpeciesMutation.mutateAsync({ commonName, emoji: newSpeciesEmoji });
      setSelectedSpeciesId(species.id);
      setNewSpeciesName('');
      setNewSpeciesEmoji(null);
      setShowAddSpecies(false);
      medium();
    } catch (e) {
      setAddSpeciesError(e instanceof Error ? e.message : "Couldn't add that species. Please try again.");
    }
  }, [newSpeciesName, newSpeciesEmoji, createSpeciesMutation, medium]);

  const handleDone = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[COLORS.cream, COLORS.beigeLight]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {stage !== 'success' && (
          <TouchableOpacity onPress={handleDone} style={styles.backButton}>
            <View style={styles.backButtonBlur}>
              <Text style={styles.backIcon}>←</Text>
            </View>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>
          {stage === 'upload' ? 'Plant a Tree' :
           stage === 'scanning' ? 'AI Scanning' :
           stage === 'details' ? 'Tree Details' : 'Tree Added!'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {stage === 'upload' && (
        <ScrollView
          contentContainerStyle={[styles.uploadContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Camera capture — no gallery option: the planting photo must be taken live so the
              AI verification (and the location it's captured with) reflects the real moment. */}
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={handleCameraCapture}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.mintLight, 'rgba(200,230,192,0.3)']}
              style={styles.uploadAreaGradient}
            >
              <View style={styles.uploadAreaInner}>
                <Text style={styles.uploadAreaIcon}>📸</Text>
                <Text style={styles.uploadAreaTitle}>Open Camera</Text>
                <Text style={styles.uploadAreaSubtitle}>
                  Our AI will verify your planting
                </Text>
              </View>
              <View style={styles.uploadDashedBorder} />
            </LinearGradient>
          </TouchableOpacity>

          <BorderCard style={styles.tipCard}>
            <Text style={styles.tipTitle}>📌 Planting Tips</Text>
            <Text style={styles.tipText}>
              {'• Show the whole tree in frame\n• Good lighting helps verification\n• Include your surroundings for location'}
            </Text>
          </BorderCard>
        </ScrollView>
      )}

      {stage === 'scanning' && imageUri && (
        <View style={styles.scanningContainer}>
          <View style={styles.imagePreviewWrapper}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
            <ScanAnimation onComplete={handleScanComplete} />
          </View>
          <Text style={styles.scanningText}>AI is verifying your tree...</Text>
          <Text style={styles.scanningSubtext}>This takes just a moment ✨</Text>
        </View>
      )}

      {stage === 'details' && (
        <ScrollView
          contentContainerStyle={[styles.detailsContent, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <BorderCard style={styles.detailsImageCard}>
            <View style={styles.detailsImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.detailsImagePhoto} resizeMode="cover" />
              ) : (
                <Text style={{ fontSize: 64 }}>🌳</Text>
              )}
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>📸 Photo Added</Text>
              </View>
            </View>
          </BorderCard>

          <View style={styles.aiResult}>
            <LinearGradient
              colors={[COLORS.forest, COLORS.forestDeep]}
              style={styles.aiResultGradient}
            >
              <Text style={styles.aiResultTag}>🌿 LOOKING GREAT</Text>
              <Text style={styles.aiResultSpecies}>Ready to log your planting</Text>
              <Text style={styles.aiResultConfidence}>Pick the species below to finish up</Text>
            </LinearGradient>
          </View>

          <Text style={styles.detailsLabel}>Choose Species</Text>
          <View style={styles.speciesGrid}>
            {visibleSpecies.map(species => (
              <TouchableOpacity
                key={species.id}
                style={[
                  styles.speciesChip,
                  selectedSpeciesId === species.id && styles.speciesChipSelected,
                ]}
                onPress={() => {
                  setSelectedSpeciesId(species.id);
                  medium();
                }}
              >
                <Text style={styles.speciesEmoji}>{species.emoji}</Text>
                <Text
                  style={[styles.speciesName, selectedSpeciesId === species.id && styles.speciesNameSelected]}
                  numberOfLines={1}
                >
                  {species.commonName}
                </Text>
              </TouchableOpacity>
            ))}
            {hasMoreSpecies && (
              <TouchableOpacity
                style={[styles.speciesChip, styles.speciesChipAdd]}
                onPress={() => setShowAllSpecies((prev) => !prev)}
              >
                <Text style={styles.speciesEmoji}>{showAllSpecies ? '▲' : '▼'}</Text>
                <Text style={styles.speciesName} numberOfLines={1}>
                  {showAllSpecies ? 'Show less' : `See more (${speciesList.length - INITIAL_SPECIES_COUNT})`}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.speciesChip, styles.speciesChipAdd]}
              onPress={() => {
                setShowAddSpecies((prev) => !prev);
                setAddSpeciesError(null);
              }}
            >
              <Text style={styles.speciesEmoji}>{showAddSpecies ? '✕' : '➕'}</Text>
              <Text style={styles.speciesName} numberOfLines={1}>
                {showAddSpecies ? 'Cancel' : "Can't find it?"}
              </Text>
            </TouchableOpacity>
          </View>

          {showAddSpecies && (
            <BorderCard style={styles.addSpeciesCard}>
              <Text style={styles.detailsLabel}>Species name</Text>
              <TextInput
                style={styles.nicknameInput}
                value={newSpeciesName}
                onChangeText={setNewSpeciesName}
                placeholder="e.g. Karanj, Rain Tree..."
                placeholderTextColor={COLORS.textMuted}
                maxLength={40}
              />

              <Text style={[styles.detailsLabel, { marginTop: 4 }]}>Pick an emoji</Text>
              <View style={styles.emojiGrid}>
                {SPECIES_EMOJI_OPTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={[styles.emojiChip, newSpeciesEmoji === emoji && styles.emojiChipSelected]}
                    onPress={() => {
                      setNewSpeciesEmoji(emoji);
                      medium();
                    }}
                  >
                    <Text style={styles.emojiChipText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {addSpeciesError && <Text style={styles.errorText}>{addSpeciesError}</Text>}

              <AnimatedButton
                label={createSpeciesMutation.isPending ? 'Adding...' : 'Add species'}
                onPress={handleAddSpecies}
                variant="primary"
                size="md"
                fullWidth
                disabled={!newSpeciesName.trim() || !newSpeciesEmoji || createSpeciesMutation.isPending}
              />
            </BorderCard>
          )}

          <Text style={styles.detailsLabel}>Give it a nickname</Text>
          <TextInput
            style={styles.nicknameInput}
            value={nickname}
            onChangeText={setNickname}
            placeholder="e.g. Buddy, Luna, Whisper..."
            placeholderTextColor={COLORS.textMuted}
          />

          <TouchableOpacity
            activeOpacity={location || locationLoading ? 1 : 0.7}
            onPress={() => {
              if (!location && !locationLoading) fetchLocation();
            }}
          >
            <BorderCard style={styles.locationCard}>
              <Text style={styles.locationIcon}>{eligible === false ? '⚠️' : '📍'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationTitle}>
                  {locationLoading
                    ? 'Locating...'
                    : !location
                    ? 'Location Unavailable'
                    : eligible === false
                    ? 'Not an ARTH Approved Spot'
                    : checkEligibility.isPending
                    ? 'Checking approved spots...'
                    : 'Location Detected'}
                </Text>
                <Text style={styles.locationValue}>
                  {locationLoading
                    ? 'Finding your spot...'
                    : eligible === false
                    ? NOT_APPROVED_MESSAGE
                    : location?.label ?? 'Tap to try again, or enable location in Settings'}
                </Text>
              </View>
            </BorderCard>
          </TouchableOpacity>

          {submitError && <Text style={styles.errorText}>{submitError}</Text>}

          <AnimatedButton
            label={plantTreeMutation.isPending ? 'Adding to Forest...' : '🌱  Add to My Forest'}
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!selectedSpecies || plantTreeMutation.isPending || eligible === false}
          />
        </ScrollView>
      )}

      {stage === 'success' && (
        <>
          <SuccessAnimation treeName={nickname || selectedSpecies?.commonName || 'your tree'} xpEarned={xpEarned} />
          <View style={[styles.successDoneButton, { paddingBottom: bottomNavClearance }]}>
            <AnimatedButton
              label="View My Forest 🌳"
              onPress={handleDone}
              variant="primary"
              size="lg"
              fullWidth
            />
          </View>
        </>
      )}

      <StatusModal
        visible={showNotApprovedModal}
        onClose={() => setShowNotApprovedModal(false)}
        icon="🚫"
        title="Not an ARTH Approved Spot"
        message={NOT_APPROVED_MESSAGE}
      />

      <StatusModal
        visible={showRejectedModal}
        onClose={() => setShowRejectedModal(false)}
        icon="📷"
        title="Couldn't Verify Planting"
        message={rejectionReason}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
  },
  backButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  backIcon: {
    fontSize: 18,
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  uploadContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 8,
  },
  uploadArea: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    height: 260,
    ...SHADOWS.md,
  },
  uploadAreaGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  uploadAreaInner: {
    alignItems: 'center',
    gap: 8,
    zIndex: 1,
  },
  uploadAreaIcon: {
    fontSize: 56,
  },
  uploadAreaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.forest,
  },
  uploadAreaSubtitle: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  uploadDashedBorder: {
    position: 'absolute',
    inset: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.sage,
    borderRadius: RADIUS.lg,
    opacity: 0.6,
  } as any,
  tipCard: {
    gap: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.forest,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 21,
  },
  scanningContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  imagePreviewWrapper: {
    width: 240,
    height: 240,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.lg,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.mintLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholder: {
    fontSize: 80,
  },
  scanGlow: {
    ...{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const,
    backgroundColor: 'rgba(168, 196, 153, 0.25)',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.sageLight,
    borderWidth: 3,
  },
  topLeft: { top: 12, left: 12, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 12, right: 12, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 12, left: 12, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 12, right: 12, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    height: 2,
  },
  scanLineGradient: {
    flex: 1,
  },
  scanLabel: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  scanLabelText: {
    fontSize: 12,
    color: COLORS.white,
    fontWeight: '600',
  },
  scanningText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  scanningSubtext: {
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  detailsContent: {
    paddingHorizontal: 20,
    gap: 16,
    paddingTop: 8,
  },
  detailsImageCard: {
    alignItems: 'center',
    padding: 20,
  },
  detailsImage: {
    alignItems: 'center',
    position: 'relative',
  },
  detailsImagePhoto: {
    width: 140,
    height: 140,
    borderRadius: RADIUS.lg,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: COLORS.sage,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
  },
  aiResult: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  aiResultGradient: {
    padding: 14,
  },
  aiResultTag: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(168,196,153,0.9)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  aiResultSpecies: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
  },
  aiResultConfidence: {
    fontSize: 12,
    color: COLORS.white,
    marginTop: 2,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 0.3,
  },
  speciesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speciesChip: {
    width: SPECIES_CHIP_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: COLORS.sand,
  },
  speciesChipSelected: {
    backgroundColor: COLORS.forest,
    borderColor: COLORS.forest,
  },
  speciesEmoji: {
    fontSize: 16,
  },
  speciesName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  speciesNameSelected: {
    color: COLORS.white,
  },
  speciesChipAdd: {
    borderStyle: 'dashed',
    borderColor: COLORS.sage,
    backgroundColor: 'transparent',
  },
  addSpeciesCard: {
    gap: 10,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiChip: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1.5,
    borderColor: COLORS.sand,
  },
  emojiChipSelected: {
    backgroundColor: COLORS.forest,
    borderColor: COLORS.forest,
  },
  emojiChipText: {
    fontSize: 19,
  },
  nicknameInput: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.sand,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationIcon: {
    fontSize: 24,
  },
  locationTitle: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.coral,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  successCard: {
    width: '100%',
    alignItems: 'center',
    gap: 22,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.sand,
    paddingVertical: 32,
    paddingHorizontal: 24,
    ...SHADOWS.md,
  },
  successCheck: {
    ...SHADOWS.sage,
  },
  successCheckGradient: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successCheckIcon: {
    fontSize: 48,
  },
  successText: {
    alignItems: 'center',
    gap: 8,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  successXp: {
    backgroundColor: 'rgba(74,144,217,0.12)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 4,
  },
  successXpText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.xpBlue,
  },
  successDoneButton: {
    paddingHorizontal: 24,
  },
});
