import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { SHADOWS } from '../constants/theme';
import { useTimeTheme } from '../hooks/useTimeTheme';
import { useFadeIn, useSlideUp } from '../hooks/useAnimations';
import { useAuth } from '../context/AuthContext';
import { useTrees } from '../hooks/useApiQueries';
import { EmptyState } from '../components/common/EmptyState';
import { StatDisplay } from '../components/common/StatDisplay';
import type { ApiTree } from '../api/trees';

const { width: SW } = Dimensions.get('window');

const INDIA = {
  latitude: 20.5937,
  longitude: 78.9629,
  latitudeDelta: 22,
  longitudeDelta: 18,
};

const GROWTH_EMOJI = ['🌱', '🌿', '🌳', '🌲', '🎋'];
const GROWTH_COLOR = ['#5BA847', '#3E8A2E', '#2D6B20', '#1E5214', '#0E3A0A'];

/**
 * Only "own tree" markers (TreeMarker below) exist today — no adoptable/NGO-drive/nursery data
 * model exists in the backend yet, so nothing else is rendered. This reserves the visual
 * convention those marker types should follow once that data exists, so a future integration
 * doesn't have to invent a visual language from scratch:
 *   - own tree      → solid filled pin bubble, growth-stage color + emoji (current TreeMarker)
 *   - adoptable tree → outline-only pin bubble (unfilled center), sage accent
 *   - NGO drive      → banner/flag-shaped marker, golden accent
 *   - nursery        → house/leaf-shaped marker, earth-brown accent
 * Intentionally not wired to any render logic — no fake map data.
 */

const MARKER_STYLES = {
  ownTree: { shape: 'filledPin', accent: 'growthColor' },
  adoptableTree: { shape: 'outlinePin', accent: COLORS.sage },
  ngoDrive: { shape: 'flagPin', accent: COLORS.golden },
  nursery: { shape: 'housePin', accent: COLORS.earth },
} as const;

const MAP_STYLE = [
  { featureType: 'all', elementType: 'geometry', stylers: [{ saturation: -15 }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#93C8D8' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4A8FA0' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#D8E8C8' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#E8E0D0' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#A8C890' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3A6B28' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#F0E8D0' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#D4C8A8' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#E8D8B0' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#D8CCBC' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#B0A890', weight: 1.5 }] },
  { featureType: 'administrative.country', elementType: 'labels.text.fill', stylers: [{ color: '#5C4A30' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#4A3C28' }] },
];

function TreeMarker({ tree, onPress, selected }: {
  tree: ApiTree;
  onPress: () => void;
  selected: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(selected ? 1.3 : 1, { damping: 14, stiffness: 200 });
  }, [selected]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Marker
      coordinate={{ latitude: tree.lat, longitude: tree.lng }}
      onPress={onPress}
      anchor={{ x: 0.5, y: 1 }}
    >
      <Animated.View style={[styles.markerContainer, animStyle]}>
        <View style={[
          styles.markerBubble,
          selected && styles.markerBubbleSelected,
          { backgroundColor: selected ? GROWTH_COLOR[tree.growthStage - 1] : COLORS.white },
        ]}>
          <Text style={styles.markerEmoji}>{GROWTH_EMOJI[tree.growthStage - 1]}</Text>
        </View>
        <View style={[styles.markerPin, {
          borderTopColor: selected ? GROWTH_COLOR[tree.growthStage - 1] : COLORS.white,
        }]} />
      </Animated.View>
    </Marker>
  );
}

function TreeInfoCard({ tree, onClose, isNight }: {
  tree: ApiTree | null;
  onClose: () => void;
  isNight: boolean;
}) {
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (tree) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(300, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [tree]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!tree) return null;

  const plantDate = new Date(tree.plantedAt).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });

  return (
    <Animated.View style={[styles.infoCardWrap, cardStyle]}>
      <BlurView intensity={isNight ? 70 : 55} tint={isNight ? 'dark' : 'light'} style={styles.infoCard}>
        <View style={[styles.infoCardHandle, isNight && styles.infoCardHandleDark]} />
        <TouchableOpacity
          style={[styles.infoCardClose, isNight && styles.infoCardCloseDark]}
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close tree details"
        >
          <Text style={[styles.infoCardCloseText, isNight && styles.lightText]}>✕</Text>
        </TouchableOpacity>

        <View style={styles.infoCardHeader}>
          <View style={[styles.infoCardIcon, { backgroundColor: GROWTH_COLOR[tree.growthStage - 1] + '22' }]}>
            <Text style={styles.infoCardEmoji}>{GROWTH_EMOJI[tree.growthStage - 1]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoCardNickname, isNight && styles.lightText]}>{tree.nickname}</Text>
            <Text style={[styles.infoCardSpecies, isNight && styles.lightSubText]}>{tree.species}</Text>
          </View>
          <View style={[styles.infoCardStageBadge, { backgroundColor: GROWTH_COLOR[tree.growthStage - 1] + '22' }]}>
            <Text style={[styles.infoCardStageText, { color: GROWTH_COLOR[tree.growthStage - 1] }]}>
              Stage {tree.growthStage}/5
            </Text>
          </View>
        </View>

        <View style={[styles.infoCardStats, isNight && styles.infoCardStatsDark]}>
          <View style={styles.infoCardStat}>
            <Text style={[styles.infoCardStatVal, isNight && styles.lightText]}>{tree.co2Absorbed}kg</Text>
            <Text style={[styles.infoCardStatLabel, isNight && styles.lightSubText]}>CO₂</Text>
          </View>
          <View style={[styles.infoCardDivider, isNight && styles.infoCardDividerDark]} />
          <View style={styles.infoCardStat}>
            <Text style={[styles.infoCardStatVal, isNight && styles.lightText]}>+{tree.xpEarned}</Text>
            <Text style={[styles.infoCardStatLabel, isNight && styles.lightSubText]}>XP</Text>
          </View>
          <View style={[styles.infoCardDivider, isNight && styles.infoCardDividerDark]} />
          <View style={styles.infoCardStat}>
            <Text style={[styles.infoCardStatVal, isNight && styles.lightText]}>{plantDate}</Text>
            <Text style={[styles.infoCardStatLabel, isNight && styles.lightSubText]}>Planted</Text>
          </View>
        </View>

        <View style={[styles.infoCardLocation, isNight && styles.infoCardLocationDark]}>
          <Text style={styles.infoCardLocationIcon}>📍</Text>
          <Text style={[styles.infoCardLocationText, isNight && styles.lightText]}>
            {tree.location ?? 'Unknown location'}
          </Text>
        </View>

        <View style={styles.growthBarRow}>
          <Text style={[styles.growthBarLabel, isNight && styles.lightSubText]}>Growth</Text>
          <View style={[styles.growthBarBg, isNight && styles.growthBarBgDark]}>
            <View style={[styles.growthBarFill, {
              width: `${(tree.growthStage / 5) * 100}%` as any,
              backgroundColor: GROWTH_COLOR[tree.growthStage - 1],
            }]} />
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );
}

export function MapScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const theme = useTimeTheme();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPending, setLocationPending] = useState(true);
  const [selectedTree, setSelectedTree] = useState<ApiTree | null>(null);
  const mapRef = useRef<MapView>(null);
  const fadeStyle = useFadeIn(0, 400);
  const headerSlide = useSlideUp(0, 20, 350);
  const { user } = useAuth();
  const { data: trees = [] } = useTrees();

  const isNight = theme.mascotOutfit === 'night';
  const statesCount = new Set(
    trees.map(t => t.location?.split(',').pop()?.trim()).filter(Boolean)
  ).size;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationPending(false); return; }
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc);
      } catch {}
      setLocationPending(false);
    })();
  }, []);

  const fitToOverview = useCallback(() => {
    if (trees.length > 0) {
      mapRef.current?.fitToCoordinates(
        trees.map(t => ({ latitude: t.lat, longitude: t.lng })),
        { edgePadding: { top: 100, right: 60, bottom: 260, left: 60 }, animated: true }
      );
    } else if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.5,
        longitudeDelta: 0.5,
      }, 800);
    } else {
      mapRef.current?.animateToRegion(INDIA, 800);
    }
    setSelectedTree(null);
  }, [trees, location]);

  const hasAutoFitRef = useRef(false);
  useEffect(() => {
    if (hasAutoFitRef.current) return;
    if (trees.length > 0 || (location && !locationPending)) {
      hasAutoFitRef.current = true;
      fitToOverview();
    }
  }, [trees, location, locationPending, fitToOverview]);

  const flyToTree = useCallback((tree: ApiTree) => {
    mapRef.current?.animateToRegion({
      latitude: tree.lat - 0.4,
      longitude: tree.lng,
      latitudeDelta: 2,
      longitudeDelta: 2,
    }, 600);
    setSelectedTree(tree);
  }, []);

  const flyToMe = useCallback(() => {
    if (!location) return;
    mapRef.current?.animateToRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    }, 600);
  }, [location]);

  return (
    <View style={styles.container}>
      <StatusBar style={isNight ? 'light' : 'dark'} />

      {/* Map */}
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_DEFAULT}
          initialRegion={INDIA}
          customMapStyle={MAP_STYLE}
          showsCompass={false}
          showsScale={false}
        >
          {trees.map(tree => (
            <TreeMarker
              key={tree.id}
              tree={tree}
              selected={selectedTree?.id === tree.id}
              onPress={() => flyToTree(tree)}
            />
          ))}

          {trees.map(tree => (
            <Circle
              key={`c_${tree.id}`}
              center={{ latitude: tree.lat, longitude: tree.lng }}
              radius={selectedTree?.id === tree.id ? 90000 : 45000}
              fillColor={GROWTH_COLOR[tree.growthStage - 1] + '1A'}
              strokeColor={GROWTH_COLOR[tree.growthStage - 1] + '55'}
              strokeWidth={1.5}
            />
          ))}

          {location && (
            <>
              <Marker
                coordinate={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.userMarker}>
                  <View style={styles.userMarkerInner} />
                </View>
              </Marker>
              <Circle
                center={{
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                }}
                radius={Math.max(location.coords.accuracy ?? 500, 500)}
                fillColor="rgba(90,160,220,0.10)"
                strokeColor="rgba(90,160,220,0.35)"
                strokeWidth={1}
              />
            </>
          )}
        </MapView>
      </Animated.View>

      {/* Header */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 8 }, headerSlide]}>
        <BlurView intensity={isNight ? 65 : 50} tint={isNight ? 'dark' : 'light'} style={styles.headerBlur}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.headerTitle, isNight && styles.lightText]}>🗺️ Tree Map</Text>
              <Text style={[styles.headerSub, isNight && styles.lightSubText]}>
                {trees.length} {trees.length === 1 ? 'tree' : 'trees'} planted
              </Text>
            </View>
            <TouchableOpacity style={styles.indiaBtn} onPress={fitToOverview}>
              <Text style={styles.indiaBtnText}>🌍 Overview</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>

      {/* GPS button */}
      <View style={[styles.gpsBtn, { bottom: (selectedTree ? 260 : 160) + insets.bottom }]}>
        <TouchableOpacity
          onPress={flyToMe}
          disabled={!location}
          accessibilityRole="button"
          accessibilityLabel="Center map on my location"
        >
          <BlurView intensity={55} tint={isNight ? 'dark' : 'light'} style={styles.gpsBtnBlur}>
            {locationPending ? (
              <ActivityIndicator size="small" color={COLORS.sage} />
            ) : (
              <Text style={styles.gpsBtnIcon}>{location ? '📍' : '⚠️'}</Text>
            )}
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      {!selectedTree && (
        <View style={[styles.statsBar, { bottom: 110 + insets.bottom }]}>
          <BlurView intensity={isNight ? 65 : 45} tint={isNight ? 'dark' : 'light'} style={styles.statsBarInner}>
            {[
              { val: user?.treesPlantedCount ?? 0, label: 'Trees' },
              { val: `${(user?.totalCo2Absorbed ?? 0).toFixed(1)}kg`, label: 'Estimated CO₂' },
              { val: statesCount, label: 'States' },
            ].map((s, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={[styles.statsDiv, isNight && styles.statsDivDark]} />}
                <StatDisplay
                  value={s.val}
                  label={s.label}
                  size="sm"
                  align="center"
                  color={isNight ? COLORS.white : COLORS.textPrimary}
                  labelColor={isNight ? COLORS.white : COLORS.textPrimary}
                  style={styles.statItem}
                />
              </React.Fragment>
            ))}
          </BlurView>
        </View>
      )}

      {/* Bottom tree list */}
      {!selectedTree && (
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom }]}>
          <BlurView intensity={isNight ? 70 : 55} tint={isNight ? 'dark' : 'light'} style={styles.bottomBlur}>
            <Text style={[styles.bottomTitle, isNight && styles.lightText]}>Your Trees</Text>
            {trees.length === 0 ? (
              <EmptyState
                icon="🌱"
                title="Your map is waiting"
                body="Plant your first tree and it'll show up here."
                actionLabel="Plant a Tree"
                onAction={() => navigation.navigate('PlantTree')}
                tint={isNight ? 'dark' : 'light'}
              />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.treeListContent}>
                {trees.map(tree => (
                  <TouchableOpacity key={tree.id} onPress={() => flyToTree(tree)} activeOpacity={0.82}>
                    <View style={styles.treeChip}>
                      <Text style={styles.treeChipEmoji}>{GROWTH_EMOJI[tree.growthStage - 1]}</Text>
                      <View>
                        {/* Chip surface is always a near-solid light card (even at night), so its
                            text stays fixed-dark — never swapped to light — regardless of isNight. */}
                        <Text style={styles.treeChipName}>{tree.nickname}</Text>
                        <Text style={styles.treeChipLoc}>{tree.location?.split(',')[0] ?? 'Unknown'}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </BlurView>
        </View>
      )}

      {/* Tree info card */}
      <TreeInfoCard tree={selectedTree} onClose={() => setSelectedTree(null)} isNight={isNight} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D8E8C8' },

  header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  headerBlur: { margin: 12, borderRadius: 18, overflow: 'hidden' },
  headerContent: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textPrimary, marginTop: 2 },
  indiaBtn: { backgroundColor: COLORS.sage, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  indiaBtnText: { fontSize: 13, fontWeight: '600', color: 'white' },

  markerContainer: { alignItems: 'center' },
  markerBubble: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.md, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.85)',
  },
  markerBubbleSelected: { borderWidth: 3, borderColor: 'white' },
  markerEmoji: { fontSize: 20 },
  markerPin: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: COLORS.white,
  },

  userMarker: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(60,120,210,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(60,120,210,0.55)',
  },
  userMarkerInner: {
    width: 11, height: 11, borderRadius: 5.5,
    backgroundColor: '#3C78D2', borderWidth: 2, borderColor: 'white',
  },

  gpsBtn: { position: 'absolute', right: 16 },
  gpsBtnBlur: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gpsBtnIcon: { fontSize: 22 },

  statsBar: { position: 'absolute', left: 16, right: 16 },
  statsBarInner: { borderRadius: 18, overflow: 'hidden', flexDirection: 'row', paddingVertical: 12 },
  statItem: { flex: 1 },
  statsDiv: { width: 1, height: 32, backgroundColor: 'rgba(0,0,0,0.1)', alignSelf: 'center' },
  statsDivDark: { backgroundColor: 'rgba(255,255,255,0.15)' },

  bottomSheet: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  bottomBlur: { borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: 'hidden', paddingTop: 14, paddingBottom: 8 },
  bottomTitle: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, paddingHorizontal: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  treeListContent: { paddingHorizontal: 12, paddingBottom: 4, gap: 8 },
  treeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.88)', borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: 1, borderColor: 'rgba(90,140,80,0.18)',
    ...SHADOWS.sm,
  },
  treeChipEmoji: { fontSize: 22 },
  treeChipName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  treeChipLoc: { fontSize: 11, color: COLORS.textPrimary, marginTop: 1 },

  infoCardWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  infoCard: { borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden', padding: 20, paddingBottom: 36 },
  infoCardHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.14)', alignSelf: 'center', marginBottom: 18 },
  infoCardClose: {
    position: 'absolute', top: 20, right: 20,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  infoCardCloseText: { fontSize: 13, color: COLORS.textPrimary },
  infoCardCloseDark: { backgroundColor: 'rgba(255,255,255,0.14)' },
  infoCardHandleDark: { backgroundColor: 'rgba(255,255,255,0.25)' },
  infoCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  infoCardIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  infoCardEmoji: { fontSize: 28 },
  infoCardNickname: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  infoCardSpecies: { fontSize: 14, color: COLORS.textPrimary, marginTop: 2 },
  infoCardStageBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  infoCardStageText: { fontSize: 12, fontWeight: '600' },
  infoCardStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 14, marginBottom: 12,
  },
  infoCardStatsDark: { backgroundColor: 'rgba(255,255,255,0.1)' },
  infoCardStat: { flex: 1, alignItems: 'center' },
  infoCardStatVal: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary },
  infoCardStatLabel: { fontSize: 11, color: COLORS.textPrimary, marginTop: 2 },
  infoCardDivider: { width: 1, height: 32, backgroundColor: 'rgba(0,0,0,0.08)' },
  infoCardDividerDark: { backgroundColor: 'rgba(255,255,255,0.15)' },
  infoCardLocation: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(80,140,70,0.1)', borderRadius: 12, padding: 10, marginBottom: 14,
  },
  infoCardLocationDark: { backgroundColor: 'rgba(135,168,120,0.18)' },
  infoCardLocationIcon: { fontSize: 14 },
  infoCardLocationText: { fontSize: 13, color: COLORS.forestDeep, fontWeight: '500', flex: 1 },
  growthBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  growthBarLabel: { fontSize: 12, color: COLORS.textPrimary, width: 46 },
  growthBarBg: { flex: 1, height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' },
  growthBarBgDark: { backgroundColor: 'rgba(255,255,255,0.15)' },
  growthBarFill: { height: '100%', borderRadius: 3 },

  lightText: { color: 'white' },
  lightSubText: { color: COLORS.white },
});
