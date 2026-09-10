import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { Map, Camera, Marker, UserLocation, GeoJSONSource, Layer, type CameraRef } from '@maplibre/maplibre-react-native';
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
import {
  useTrees,
  useAdoptableTrees,
  useDrives,
  useMyDrives,
  useMyAdoptableTrees,
  useBrowseNurseries,
  useApprovedPlantingLocations,
  useCheckPlantingEligibility,
  useSettings,
} from '../hooks/useApiQueries';
import { EmptyState } from '../components/common/EmptyState';
import { StatDisplay } from '../components/common/StatDisplay';
import { StatusModal } from '../components/common/StatusModal';
import type { ApiTree } from '../api/trees';
import type { ApiAdoptableTree } from '../api/adoptions';
import type { ApiDrive } from '../api/drives';
import type { ApiApprovedLocation } from '../api/plantingLocations';
import { NOT_APPROVED_MESSAGE } from '../constants/plantingLocation';
import { getCurrentPositionWithTimeout } from '../utils/location';

const { width: SW } = Dimensions.get('window');

// [lng, lat] — MapLibre's coordinate order, opposite of react-native-maps' {latitude, longitude}.
const INDIA_CENTER: [number, number] = [78.9629, 20.5937];
const INDIA_ZOOM = 3.5;

// Plain OpenStreetMap raster tiles — no API key or billing required, unlike Google Maps (which
// this screen used before switching off react-native-maps; see project notes on why).
const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: 'raster' as const,
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-tiles', type: 'raster' as const, source: 'osm' }],
};

const GROWTH_EMOJI = ['🌱', '🌿', '🌳', '🌲', '🎋'];
const GROWTH_COLOR = ['#5BA847', '#3E8A2E', '#2D6B20', '#1E5214', '#0E3A0A'];

/**
 * Visual language for each marker type sharing this map:
 *   - own tree      → solid filled pin bubble, growth-stage color + emoji (TreeMarker)
 *   - adoptable tree → outline-only pin bubble (unfilled center), sage accent (AdoptableTreeMarker)
 *   - NGO drive      → rounded golden-accent bubble, flag emoji (NgoDriveMarker)
 *   - nursery        → house-shaped marker, earth-brown accent (NurseryMarker) — only nurseries
 *                       that have set a location in NurserySettingsScreen appear here
 * Tapping an adoptable-tree/drive marker navigates straight to its detail screen (where the
 * adopt/RSVP action lives) rather than opening an in-map info card like TreeMarker's, since
 * those are read-only "this is mine" cards and these need a real action surface.
 */

const MARKER_STYLES = {
  ownTree: { shape: 'filledPin', accent: 'growthColor' },
  adoptableTree: { shape: 'outlinePin', accent: COLORS.sage },
  ngoDrive: { shape: 'flagPin', accent: COLORS.golden },
  nursery: { shape: 'housePin', accent: COLORS.earth },
} as const;

const STATUS_MODAL_CONTENT = {
  locationUnavailable: {
    icon: '📍',
    title: 'Location unavailable',
    message: 'We could not find your current location. Check your location permission and try again.',
  },
  notApproved: {
    icon: '🚫',
    title: 'Not an ARTH Approved Spot',
    message: NOT_APPROVED_MESSAGE,
  },
  checkFailed: {
    icon: '⚠️',
    title: 'Something went wrong',
    message: 'Could not check this location right now. Please try again.',
  },
} as const;

// Generates an approximate geographic circle (equirectangular projection — accurate enough at
// the radii used here, tens of meters to ~90km) as a GeoJSON polygon, since MapLibre's own
// "circle" layer type sizes in constant screen pixels, not real-world meters like the radii the
// approved-planting-zone and tree distinctness circles need.
function makeCirclePolygon(lat: number, lng: number, radiusMeters: number, points = 48): GeoJSON.Feature<GeoJSON.Polygon> {
  const EARTH_RADIUS_M = 6371000;
  const latRad = (lat * Math.PI) / 180;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const dLat = (dy / EARTH_RADIUS_M) * (180 / Math.PI);
    const dLng = (dx / (EARTH_RADIUS_M * Math.cos(latRad))) * (180 / Math.PI);
    coords.push([lng + dLng, lat + dLat]);
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
}

function computeBounds(points: { lat: number; lng: number }[]): [number, number, number, number] {
  let west = points[0].lng;
  let east = points[0].lng;
  let south = points[0].lat;
  let north = points[0].lat;
  for (const p of points) {
    west = Math.min(west, p.lng);
    east = Math.max(east, p.lng);
    south = Math.min(south, p.lat);
    north = Math.max(north, p.lat);
  }
  return [west, south, east, north];
}

function CircleOverlay({ id, lat, lng, radiusMeters, fillColor, strokeColor, strokeWidth = 1.5 }: {
  id: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth?: number;
}) {
  const shape = makeCirclePolygon(lat, lng, radiusMeters);
  return (
    <GeoJSONSource id={id} data={shape}>
      <Layer id={`${id}_fill`} type="fill" paint={{ 'fill-color': fillColor }} />
      <Layer id={`${id}_line`} type="line" paint={{ 'line-color': strokeColor, 'line-width': strokeWidth }} />
    </GeoJSONSource>
  );
}

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
    <Marker id={`tree-${tree.id}`} lngLat={[tree.lng, tree.lat]} anchor="bottom">
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
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
      </TouchableOpacity>
    </Marker>
  );
}

function AdoptableTreeMarker({ tree, onPress }: { tree: ApiAdoptableTree & { lat: number; lng: number }; onPress: () => void }) {
  return (
    <Marker id={`adopt-${tree.id}`} lngLat={[tree.lng, tree.lat]} anchor="bottom">
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.markerContainer}>
          <View style={[styles.markerBubble, styles.outlineBubble]}>
            <Text style={styles.markerEmoji}>🌳</Text>
          </View>
          <View style={[styles.markerPin, { borderTopColor: COLORS.sage }]} />
        </View>
      </TouchableOpacity>
    </Marker>
  );
}

function NgoDriveMarker({ drive, onPress }: { drive: ApiDrive & { lat: number; lng: number }; onPress: () => void }) {
  return (
    <Marker id={`drive-${drive.id}`} lngLat={[drive.lng, drive.lat]} anchor="bottom">
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.markerContainer}>
          <View style={[styles.markerBubble, styles.flagBubble]}>
            <Text style={styles.markerEmoji}>🤝</Text>
          </View>
          <View style={[styles.markerPin, { borderTopColor: COLORS.golden }]} />
        </View>
      </TouchableOpacity>
    </Marker>
  );
}

function NurseryMarker({ nursery, onPress }: { nursery: { id: string; nurseryName: string; lat: number; lng: number }; onPress: () => void }) {
  return (
    <Marker id={`nursery-${nursery.id}`} lngLat={[nursery.lng, nursery.lat]} anchor="bottom">
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.markerContainer}>
          <View style={[styles.markerBubble, styles.nurseryBubble]}>
            <Text style={styles.markerEmoji}>🌿</Text>
          </View>
          <View style={[styles.markerPin, { borderTopColor: COLORS.earth }]} />
        </View>
      </TouchableOpacity>
    </Marker>
  );
}

function ApprovedLocationMarker({ location, onPress }: { location: ApiApprovedLocation; onPress: () => void }) {
  return (
    <Marker id={`approved-${location.id}`} lngLat={[location.lng, location.lat]} anchor="bottom">
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.markerContainer}>
          <View style={[styles.markerBubble, styles.approvedBubble]}>
            <Text style={styles.markerEmoji}>🏞️</Text>
          </View>
          <View style={[styles.markerPin, { borderTopColor: COLORS.forest }]} />
        </View>
      </TouchableOpacity>
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

export function MapScreen({ navigation, mode = 'user' }: any) {
  const insets = useSafeAreaInsets();
  const theme = useTimeTheme();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPending, setLocationPending] = useState(true);
  const [selectedTree, setSelectedTree] = useState<ApiTree | null>(null);
  const cameraRef = useRef<CameraRef>(null);
  const fadeStyle = useFadeIn(0, 400);
  const headerSlide = useSlideUp(0, 20, 350);
  const { user } = useAuth();
  const isNgo = mode === 'ngo';
  // Both public and NGO-owned feeds are always fetched (stable per-mount `mode` prop, never
  // toggles) so this never has to call hooks conditionally — whichever pair isn't relevant for
  // this mode is simply not used below. NGO mode has no personal "planted trees" concept at all.
  const { data: rawTrees = [] } = useTrees(undefined, !isNgo);
  const trees = isNgo ? [] : rawTrees;
  const { data: publicAdoptableTrees = [] } = useAdoptableTrees(undefined, undefined, !isNgo);
  const { data: myAdoptableTrees = [] } = useMyAdoptableTrees(isNgo);
  const adoptableTrees = isNgo ? myAdoptableTrees : publicAdoptableTrees;
  const { data: publicDrives = [] } = useDrives(undefined, undefined, !isNgo);
  const { data: myDrives = [] } = useMyDrives(isNgo);
  const drives = isNgo ? myDrives : publicDrives;
  const { data: nurseriesData } = useBrowseNurseries();
  const nurseries = isNgo ? [] : nurseriesData?.nurseries ?? [];
  const { data: approvedLocations = [] } = useApprovedPlantingLocations(!isNgo);
  const checkEligibility = useCheckPlantingEligibility();
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [statusModal, setStatusModal] = useState<'locationUnavailable' | 'notApproved' | 'checkFailed' | null>(null);
  const [infoLocation, setInfoLocation] = useState<ApiApprovedLocation | null>(null);
  const { data: settings } = useSettings();
  const locationTrackingEnabled = settings?.locationTracking ?? true;

  const isNight = theme.mascotOutfit === 'night';
  const statesCount = new Set(
    trees.map(t => t.location?.split(',').pop()?.trim()).filter(Boolean)
  ).size;

  useEffect(() => {
    // Centering the map on the user's own position is ambient/automatic — it respects the
    // Location Tracking preference, unlike explicit actions like planting a tree.
    if (!locationTrackingEnabled) { setLocationPending(false); return; }
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLocationPending(false); return; }
      try {
        const loc = await getCurrentPositionWithTimeout({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(loc);
      } catch {}
      setLocationPending(false);
    })();
  }, [locationTrackingEnabled]);

  const ngoPoints = isNgo
    ? ([...drives, ...adoptableTrees] as Array<{ lat: number | null; lng: number | null }>)
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({ lat: p.lat as number, lng: p.lng as number }))
    : [];

  const fitToOverview = useCallback(() => {
    if (trees.length > 0) {
      cameraRef.current?.fitBounds(
        computeBounds(trees.map(t => ({ lat: t.lat, lng: t.lng }))),
        { padding: { top: 100, right: 60, bottom: 260, left: 60 }, duration: 800 }
      );
    } else if (ngoPoints.length > 0) {
      cameraRef.current?.fitBounds(
        computeBounds(ngoPoints),
        { padding: { top: 100, right: 60, bottom: 260, left: 60 }, duration: 800 }
      );
    } else if (location) {
      cameraRef.current?.flyTo({
        center: [location.coords.longitude, location.coords.latitude],
        zoom: 11,
        duration: 800,
      });
    } else {
      cameraRef.current?.flyTo({ center: INDIA_CENTER, zoom: INDIA_ZOOM, duration: 800 });
    }
    setSelectedTree(null);
  }, [trees, ngoPoints, location]);

  const hasAutoFitRef = useRef(false);
  useEffect(() => {
    if (hasAutoFitRef.current) return;
    if (trees.length > 0 || ngoPoints.length > 0 || (location && !locationPending)) {
      hasAutoFitRef.current = true;
      fitToOverview();
    }
  }, [trees, ngoPoints, location, locationPending, fitToOverview]);

  const flyToTree = useCallback((tree: ApiTree) => {
    cameraRef.current?.flyTo({
      center: [tree.lng, tree.lat - 0.4],
      zoom: 7,
      duration: 600,
    });
    setSelectedTree(tree);
  }, []);

  const flyToMe = useCallback(() => {
    if (!location) return;
    cameraRef.current?.flyTo({
      center: [location.coords.longitude, location.coords.latitude],
      zoom: 14,
      duration: 600,
    });
  }, [location]);

  const handlePlantWhereYouAre = useCallback(async () => {
    if (!location) {
      setStatusModal('locationUnavailable');
      return;
    }
    const lat = location.coords.latitude;
    const lng = location.coords.longitude;

    setCheckingEligibility(true);
    try {
      const result = await checkEligibility.mutateAsync({ lat, lng });
      if (result.eligible) {
        navigation.navigate('PlantTree', { verifiedLat: lat, verifiedLng: lng });
      } else {
        setStatusModal('notApproved');
      }
    } catch {
      setStatusModal('checkFailed');
    } finally {
      setCheckingEligibility(false);
    }
  }, [location, checkEligibility, navigation]);

  const plantHereButton = (
    <View style={[styles.plantHereBtn, { bottom: (selectedTree ? 260 : 160) + insets.bottom + 62 }]}>
      <TouchableOpacity
        onPress={handlePlantWhereYouAre}
        disabled={!location || checkingEligibility}
        accessibilityRole="button"
        accessibilityLabel="Plant where you are"
      >
        <BlurView intensity={55} tint={isNight ? 'dark' : 'light'} style={styles.plantHereBtnBlur}>
          {checkingEligibility ? (
            <ActivityIndicator size="small" color={COLORS.forest} />
          ) : (
            <>
              <Text style={styles.plantHereBtnIcon}>🌱</Text>
              <Text style={[styles.plantHereBtnText, isNight && styles.lightText]}>Plant where you are</Text>
            </>
          )}
        </BlurView>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style={isNight ? 'light' : 'dark'} />

      {/* Map */}
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        <Map style={StyleSheet.absoluteFill} mapStyle={OSM_STYLE} compass={false} scaleBar={false}>
          <Camera ref={cameraRef} initialViewState={{ center: INDIA_CENTER, zoom: INDIA_ZOOM }} />

          {trees.map(tree => (
            <CircleOverlay
              key={`c_${tree.id}`}
              id={`c_${tree.id}`}
              lat={tree.lat}
              lng={tree.lng}
              radiusMeters={selectedTree?.id === tree.id ? 90000 : 45000}
              fillColor={GROWTH_COLOR[tree.growthStage - 1] + '1A'}
              strokeColor={GROWTH_COLOR[tree.growthStage - 1] + '55'}
            />
          ))}

          {!isNgo && approvedLocations.map((loc) => (
            <CircleOverlay
              key={`approved_c_${loc.id}`}
              id={`approved_c_${loc.id}`}
              lat={loc.lat}
              lng={loc.lng}
              radiusMeters={loc.radiusMeters}
              fillColor="rgba(45,90,39,0.10)"
              strokeColor="rgba(45,90,39,0.45)"
            />
          ))}

          {location && (
            <CircleOverlay
              id="user-accuracy"
              lat={location.coords.latitude}
              lng={location.coords.longitude}
              radiusMeters={Math.max(location.coords.accuracy ?? 500, 500)}
              fillColor="rgba(90,160,220,0.10)"
              strokeColor="rgba(90,160,220,0.35)"
              strokeWidth={1}
            />
          )}

          {trees.map(tree => (
            <TreeMarker
              key={tree.id}
              tree={tree}
              selected={selectedTree?.id === tree.id}
              onPress={() => flyToTree(tree)}
            />
          ))}

          {adoptableTrees
            .filter((tree): tree is ApiAdoptableTree & { lat: number; lng: number } => tree.lat != null && tree.lng != null)
            .map(tree => (
              <AdoptableTreeMarker
                key={`adopt_${tree.id}`}
                tree={tree}
                onPress={() => navigation.navigate('AdoptTreeDetail', { treeId: tree.id })}
              />
            ))}

          {drives
            .filter((drive): drive is ApiDrive & { lat: number; lng: number } => drive.lat != null && drive.lng != null)
            .map(drive => (
              <NgoDriveMarker
                key={`drive_${drive.id}`}
                drive={drive}
                onPress={() => navigation.navigate('DriveDetail', { driveId: drive.id })}
              />
            ))}

          {nurseries
            .filter((n) => n.lat != null && n.lng != null)
            .map((n) => (
              <NurseryMarker
                key={`nursery_${n.id}`}
                nursery={{ id: n.id, nurseryName: n.nurseryName, lat: Number(n.lat), lng: Number(n.lng) }}
                onPress={() => navigation.navigate('NurseryPublicProfile', { nurseryId: n.id })}
              />
            ))}

          {!isNgo && approvedLocations.map((loc) => (
            <ApprovedLocationMarker
              key={`approved_${loc.id}`}
              location={loc}
              onPress={() => setInfoLocation(loc)}
            />
          ))}

          <UserLocation animated accuracy={false} />
        </Map>
      </Animated.View>

      {/* Header */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 8 }, headerSlide]}>
        <BlurView intensity={isNight ? 65 : 50} tint={isNight ? 'dark' : 'light'} style={styles.headerBlur}>
          <View style={styles.headerContent}>
            <View>
              <Text style={[styles.headerTitle, isNight && styles.lightText]}>
                {isNgo ? '🗺️ Your Drives & Trees' : '🗺️ Tree Map'}
              </Text>
              <Text style={[styles.headerSub, isNight && styles.lightSubText]}>
                {isNgo
                  ? `${drives.length} ${drives.length === 1 ? 'drive' : 'drives'} · ${adoptableTrees.length} ${adoptableTrees.length === 1 ? 'tree' : 'trees'}`
                  : `${trees.length} ${trees.length === 1 ? 'tree' : 'trees'} planted`}
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

      {/* Rendered here or after the bottom sheet below — sibling order, not zIndex, decides both paint and touch priority on Android. */}
      {!isNgo && trees.length > 0 && plantHereButton}

      {/* Stats bar */}
      {!selectedTree && (
        <View style={[styles.statsBar, { bottom: 110 + insets.bottom }]}>
          <BlurView intensity={isNight ? 65 : 45} tint={isNight ? 'dark' : 'light'} style={styles.statsBarInner}>
            {(isNgo
              ? [
                  { val: drives.length, label: 'Drives' },
                  { val: adoptableTrees.length, label: 'Trees listed' },
                ]
              : [
                  { val: user?.treesPlantedCount ?? 0, label: 'Trees' },
                  { val: `${(user?.totalCo2Absorbed ?? 0).toFixed(1)}kg`, label: 'Estimated CO₂' },
                  { val: statesCount, label: 'States' },
                ]
            ).map((s, i) => (
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
      {!selectedTree && !isNgo && (
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

      {!isNgo && trees.length === 0 && plantHereButton}

      {/* Tree info card */}
      <TreeInfoCard tree={selectedTree} onClose={() => setSelectedTree(null)} isNight={isNight} />

      {statusModal && (
        <StatusModal
          visible
          onClose={() => setStatusModal(null)}
          icon={STATUS_MODAL_CONTENT[statusModal].icon}
          title={STATUS_MODAL_CONTENT[statusModal].title}
          message={STATUS_MODAL_CONTENT[statusModal].message}
        />
      )}

      {infoLocation && (
        <StatusModal
          visible
          onClose={() => setInfoLocation(null)}
          icon="🏞️"
          title={infoLocation.name}
          message={`ARTH approved planting zone – ${infoLocation.radiusMeters}m radius.`}
        />
      )}
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
  outlineBubble: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 2.5,
    borderColor: COLORS.sage,
  },
  flagBubble: {
    backgroundColor: COLORS.golden,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  nurseryBubble: {
    backgroundColor: COLORS.earth,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  approvedBubble: {
    backgroundColor: COLORS.forest,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  markerPin: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: COLORS.white,
  },

  gpsBtn: { position: 'absolute', right: 16 },
  gpsBtnBlur: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gpsBtnIcon: { fontSize: 22 },

  plantHereBtn: { position: 'absolute', right: 16 },
  plantHereBtnBlur: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 24, overflow: 'hidden',
    ...SHADOWS.md,
  },
  plantHereBtnIcon: { fontSize: 16 },
  plantHereBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },

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
