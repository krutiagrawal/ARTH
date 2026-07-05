import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
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
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Mascot } from '../components/common/Mascot';
import { FloatingParticles } from '../components/common/FloatingParticles';
import { useHaptics } from '../hooks/useHaptics';
import { useSpecies } from '../hooks/useApiQueries';
import { usePlantTree } from '../hooks/useApiQueries';

const { width: SW, height: SH } = Dimensions.get('window');

type Stage = 'upload' | 'scanning' | 'details' | 'success';

interface LocationInfo {
  lat: number;
  lng: number;
  label: string;
}

// Fallback center (India) used only if the user planted without location access, so the tree
// doesn't land at (0,0) — off the coast of Africa — on the map.
const FALLBACK_COORDS = { lat: 20.5937, lng: 78.9629 };

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
      <FloatingParticles count={16} type="petal" />

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

      <View style={styles.successMascot}>
        <Mascot size={100} mood="proud" animate />
        <View style={styles.successBubble}>
          <Text style={styles.successBubbleText}>Amazing! Your forest grows stronger 🌿</Text>
        </View>
      </View>
    </View>
  );
}

export function PlantTreeScreen({ navigation }: any) {
  const [stage, setStage] = useState<Stage>('upload');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [location, setLocation] = useState<LocationInfo | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { success, medium } = useHaptics();
  const insets = useSafeAreaInsets();

  const { data: speciesList = [] } = useSpecies();
  const plantTreeMutation = usePlantTree();
  const selectedSpecies = speciesList.find(s => s.id === selectedSpeciesId) ?? null;

  const fetchLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation(null);
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const label = place
        ? [place.city ?? place.subregion, place.region ?? place.country].filter(Boolean).join(', ')
        : `${position.coords.latitude.toFixed(3)}, ${position.coords.longitude.toFixed(3)}`;
      setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, label: label || 'Unknown location' });
    } catch {
      setLocation(null);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const handlePickImage = useCallback(async () => {
    medium();
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setStage('scanning');
    }
  }, [medium]);

  const handleCameraCapture = useCallback(async () => {
    medium();
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setStage('scanning');
    }
  }, [medium]);

  const handleScanComplete = useCallback(() => {
    setStage('details');
    fetchLocation();
  }, [fetchLocation]);

  const [xpEarned, setXpEarned] = useState(0);

  const handleSubmit = useCallback(async () => {
    if (!selectedSpecies || !imageUri) return;
    setSubmitError(null);
    try {
      const filename = imageUri.split('/').pop() || 'tree.jpg';
      const extension = filename.split('.').pop()?.toLowerCase();
      const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

      const tree = await plantTreeMutation.mutateAsync({
        speciesId: selectedSpecies.id,
        nickname: nickname.trim() || selectedSpecies.commonName,
        lat: location?.lat ?? FALLBACK_COORDS.lat,
        lng: location?.lng ?? FALLBACK_COORDS.lng,
        locationLabel: location?.label,
        photo: { uri: imageUri, name: filename, type: mimeType },
      });

      setXpEarned(tree.xpEarned);
      success();
      setStage('success');
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save your tree. Please try again.');
    }
  }, [selectedSpecies, imageUri, nickname, location, plantTreeMutation, success]);

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
            <BlurView intensity={30} tint="light" style={styles.backButtonBlur}>
              <Text style={styles.backIcon}>←</Text>
            </BlurView>
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
          {/* Upload area */}
          <TouchableOpacity
            style={styles.uploadArea}
            onPress={handlePickImage}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[COLORS.mintLight, 'rgba(200,230,192,0.3)']}
              style={styles.uploadAreaGradient}
            >
              <View style={styles.uploadAreaInner}>
                <Text style={styles.uploadAreaIcon}>📷</Text>
                <Text style={styles.uploadAreaTitle}>Upload Tree Photo</Text>
                <Text style={styles.uploadAreaSubtitle}>
                  Our AI will verify your planting
                </Text>
              </View>
              <View style={styles.uploadDashedBorder} />
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <AnimatedButton
            label="📸  Open Camera"
            onPress={handleCameraCapture}
            variant="secondary"
            size="lg"
            fullWidth
          />

          <GlassCard variant="sage" style={styles.tipCard}>
            <Text style={styles.tipTitle}>📌 Planting Tips</Text>
            <Text style={styles.tipText}>
              {'• Show the whole tree in frame\n• Good lighting helps verification\n• Include your surroundings for location'}
            </Text>
          </GlassCard>
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
          <GlassCard variant="warm" style={styles.detailsImageCard}>
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
          </GlassCard>

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
            {speciesList.map(species => (
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
                <Text style={[styles.speciesName, selectedSpeciesId === species.id && styles.speciesNameSelected]}>
                  {species.commonName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.detailsLabel}>Give it a nickname</Text>
          <TextInput
            style={styles.nicknameInput}
            value={nickname}
            onChangeText={setNickname}
            placeholder="e.g. Buddy, Luna, Whisper..."
            placeholderTextColor={COLORS.textLight}
          />

          <TouchableOpacity
            activeOpacity={location || locationLoading ? 1 : 0.7}
            onPress={() => {
              if (!location && !locationLoading) fetchLocation();
            }}
          >
            <GlassCard variant="warm" style={styles.locationCard}>
              <Text style={styles.locationIcon}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationTitle}>
                  {locationLoading ? 'Locating...' : location ? 'Location Detected' : 'Location Unavailable'}
                </Text>
                <Text style={styles.locationValue}>
                  {locationLoading ? 'Finding your spot...' : location?.label ?? 'Tap to try again, or enable location in Settings'}
                </Text>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {submitError && <Text style={styles.errorText}>{submitError}</Text>}

          <AnimatedButton
            label={plantTreeMutation.isPending ? 'Adding to Forest...' : '🌱  Add to My Forest'}
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!selectedSpecies || plantTreeMutation.isPending}
          />
        </ScrollView>
      )}

      {stage === 'success' && (
        <>
          <SuccessAnimation treeName={nickname || selectedSpecies?.commonName || 'your tree'} xpEarned={xpEarned} />
          <View style={[styles.successDoneButton, { paddingBottom: insets.bottom + 24 }]}>
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
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
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
    color: COLORS.textSecondary,
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
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.sand,
  },
  orText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
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
    color: COLORS.textSecondary,
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
    ...StyleSheet.absoluteFillObject,
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
    color: COLORS.textMuted,
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
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.3,
  },
  speciesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  speciesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  speciesNameSelected: {
    color: COLORS.white,
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
    color: COLORS.textMuted,
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
    gap: 24,
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
    color: COLORS.textSecondary,
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
  successMascot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  successBubble: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    maxWidth: 180,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.sand,
  },
  successBubbleText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  successDoneButton: {
    paddingHorizontal: 24,
  },
});
