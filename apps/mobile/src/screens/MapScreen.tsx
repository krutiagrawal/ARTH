import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ScrollView, ActivityIndicator, AppState, Image } from 'react-native';
import { Text } from '../components/common/AppText';
import { LeafletPinMap, type LeafletPin, type LeafletCircle } from '../components/map/LeafletPinMap';
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
  useTreesMap,
  useAdoptableTrees,
  useDrives,
  useMyDrives,
  useMyAdoptableTrees,
  useBrowseNurseries,
  useApprovedPlantingLocations,
  useCheckPlantingEligibility,
  useSettings,
  useNgoPlantingMap,
} from '../hooks/useApiQueries';
import { EmptyState } from '../components/common/EmptyState';
import { StatDisplay } from '../components/common/StatDisplay';
import { StatusModal } from '../components/common/StatusModal';
import type { ApiTree } from '../api/trees';
import { resolveMediaUrl } from '../api/client';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { SlidingSegment } from '../components/common/SlidingSegment';
import { STATUS_META } from '../constants/treeHealth';
import type { ApiAdoptableTree } from '../api/adoptions';
import type { ApiDrive } from '../api/drives';
import type { ApiApprovedLocation } from '../api/plantingLocations';
import type { ApiPlantingMapEntry } from '../api/plantedTrees';
import { NOT_APPROVED_MESSAGE } from '../constants/plantingLocation';
import { getCurrentPositionWithTimeout } from '../utils/location';

import { TEXT } from '../constants/typography';
const { width: SW } = Dimensions.get('window');

// MapLibre needs a native module that Expo Go (and any older dev build) does not contain, and a
// plain top-level import of it throws at module load — which makes the lazy-loaded Map tab fail
// with "Lazy element type must resolve to a class or function". Load it defensively and fall back
// to a Leaflet/OSM WebView (LeafletPinMap) when it is missing.
let ML: any = null;
try {
  ML = require('@maplibre/maplibre-react-native');
} catch {
  ML = null;
}
const HAS_NATIVE_MAP = !!ML;
const { Map, Camera, Marker, UserLocation, GeoJSONSource, Layer } = (ML ?? {}) as any;

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
      // tile.openstreetmap.org only serves up to z19 — without this, zooming further sends
      // requests for tiles that don't exist and the server answers with a 400.  MapLibre clamps
      // to this automatically, oversampling the z19 tile instead of erroring past it.
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osm-tiles', type: 'raster' as const, source: 'osm' }],
};

// ARTH-approved planting zones are tinted green on the map: the tint covers exactly the area the
// server accepts plantings in (the approved circles), so it never overstates where you can plant.
const ZONE_COLOR = '#2E9E4F';
const NURSERY_EMOJI = '🏡';

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
    title: 'Turn on location',
    message: 'Please turn on your device location and give ARTH location permission access to plant where you are.',
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
function makeCirclePolygon(lat: number, lng: number, radiusMeters: number, points = 48): { type: 'Feature'; geometry: { type: 'Polygon'; coordinates: number[][][] }; properties: Record<string, never> } {
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
            { backgroundColor: selected ? GROWTH_COLOR[tree.growthStage - 1] : COLORS.white, borderColor: GROWTH_COLOR[tree.growthStage - 1], borderWidth: 3 },
          ]}>
            <Text style={styles.markerEmoji}>{GROWTH_EMOJI[tree.growthStage - 1]}</Text>
          </View>
          <View style={[styles.markerPin, {
            borderTopColor: GROWTH_COLOR[tree.growthStage - 1],
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

/** One pin per plantation drive that has logged trees, shown when the map is scoped to a single
 * NGO (via `route.params.ngoId`) — tapping opens an in-map info card with the zone breakdown,
 * since there's no public detail screen for a plantation's survival stats to navigate to. */
function PlantingMarker({ entry, onPress }: { entry: ApiPlantingMapEntry; onPress: () => void }) {
  return (
    <Marker id={`planting-${entry.driveId}`} lngLat={[entry.lng, entry.lat]} anchor="bottom">
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.markerContainer}>
          <View style={[styles.markerBubble, styles.plantingBubble]}>
            <Text style={styles.markerEmoji}>🌲</Text>
          </View>
          <View style={[styles.markerPin, { borderTopColor: COLORS.forest }]} />
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
            <Text style={styles.markerEmoji}>{NURSERY_EMOJI}</Text>
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
          <View style={[styles.markerPin, { borderTopColor: ZONE_COLOR }]} />
        </View>
      </TouchableOpacity>
    </Marker>
  );
}

const FILTER_OPTIONS: { key: Exclude<MapFilter, 'all'>; label: string; emoji: string; color: string; bg: string }[] = [
  { key: 'plants', label: 'Plants', emoji: '🌳', color: GROWTH_COLOR[2], bg: COLORS.white },
  { key: 'ngo', label: 'NGO', emoji: '🤝', color: COLORS.golden, bg: COLORS.golden },
  { key: 'nurseries', label: 'Nurseries', emoji: NURSERY_EMOJI, color: COLORS.earth, bg: COLORS.earth },
  { key: 'zones', label: 'Approved area', emoji: '🏞️', color: ZONE_COLOR, bg: ZONE_COLOR },
];

type MapFilter = 'all' | 'plants' | 'ngo' | 'nurseries' | 'zones';

const GROWTH_LABEL = ['Seedling', 'Sprouting', 'Growing', 'Maturing', 'Flourishing'];

function formatAge(days?: number): string | null {
  if (days == null) return null;
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  if (days < 365) return `${Math.floor(days / 30)} mo`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  return months ? `${years}y ${months}mo` : `${years}y`;
}

function TreeInfoCard({ tree, onClose, isNight, ownerName, ownerHandle, ownerEmoji, isOwn, onOpenPlanter }: {
  tree: ApiTree | null;
  onClose: () => void;
  isNight: boolean;
  ownerName: string;
  ownerHandle?: string;
  ownerEmoji: string;
  isOwn: boolean;
  onOpenPlanter: () => void;
}) {
  const navClearance = useBottomNavClearance(8);
  const translateY = useSharedValue(500);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (tree) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(500, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [tree]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!tree) return null;

  const stageColor = GROWTH_COLOR[tree.growthStage - 1];
  const plantDate = new Date(tree.plantedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const photo = resolveMediaUrl(tree.photoUri);
  const health = STATUS_META[tree.healthStatus];
  const textColor = isNight ? styles.lightText : null;
  const subColor = isNight ? styles.lightSubText : null;
  const age = formatAge(tree.ageDays);

  // Impact / size figures are estimates and only present when the species data allows one.
  const stats: { val: string; label: string }[] = [
    { val: `${tree.co2Absorbed}kg`, label: 'CO₂ absorbed' },
    ...(tree.oxygenKg != null ? [{ val: `${tree.oxygenKg}kg`, label: 'Oxygen' }] : []),
    ...(tree.co2NextYearKg != null ? [{ val: `${tree.co2NextYearKg}kg`, label: 'CO₂ next year' }] : []),
    ...(tree.estimatedHeightM != null ? [{ val: `${tree.estimatedHeightM}m`, label: 'Est. height' }] : []),
    ...(tree.estimatedDbhCm != null ? [{ val: `${tree.estimatedDbhCm}cm`, label: 'Est. trunk' }] : []),
    ...(age ? [{ val: age, label: 'Age' }] : []),
    { val: `+${tree.xpEarned}`, label: 'XP earned' },
  ];

  return (
    <Animated.View style={[styles.infoCardWrap, { bottom: navClearance }, cardStyle]}>
      <BlurView intensity={95} tint={isNight ? 'dark' : 'light'} style={[styles.infoCard, styles.treeInfoCard, isNight && styles.infoCardNight]}>
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

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
          <View style={[styles.infoCardHeader, { paddingRight: 40 }]}>
            <View style={[styles.infoCardIcon, { backgroundColor: stageColor + '22' }]}>
              <Text style={styles.infoCardEmoji}>{GROWTH_EMOJI[tree.growthStage - 1]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoCardNickname, textColor]} numberOfLines={2}>{tree.nickname}</Text>
              <Text style={[styles.infoCardSpecies, subColor]}>{tree.speciesEmoji ? `${tree.speciesEmoji} ` : ''}{tree.species}</Text>
            </View>
          </View>

          <View style={styles.treeBadgeRow}>
            <View style={[styles.infoCardStageBadge, { backgroundColor: stageColor + '22' }]}>
              <Text style={[styles.infoCardStageText, { color: stageColor }]}>
                Stage {tree.growthStage}/5 · {GROWTH_LABEL[tree.growthStage - 1]}
              </Text>
            </View>
            {health ? (
              <View style={[styles.infoCardStageBadge, { backgroundColor: health.color + '22' }]}>
                <Text style={[styles.infoCardStageText, { color: health.color }]}>{health.emoji} {health.label}</Text>
              </View>
            ) : null}
          </View>

          {photo ? <Image source={{ uri: photo }} style={styles.treeInfoPhoto} resizeMode="cover" /> : null}

          <TouchableOpacity
            style={[styles.planterRow, isNight && styles.planterRowDark]}
            onPress={onOpenPlanter}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`View profile of ${ownerName}`}
          >
            <View style={styles.planterAvatar}><Text style={{ fontSize: 22 }}>{ownerEmoji}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.planterLabel, subColor]}>Planted by</Text>
              <Text style={[styles.planterName, textColor]} numberOfLines={1}>
                {isOwn ? 'You' : ownerName}{ownerHandle ? `  @${ownerHandle}` : ''}
              </Text>
            </View>
            <Text style={[styles.planterLink, textColor]}>View profile ›</Text>
          </TouchableOpacity>

          <View style={styles.treeStatGrid}>
            {stats.map((st) => (
              <View key={st.label} style={[styles.treeStatCell, isNight && styles.infoCardStatsDark]}>
                <Text style={[styles.infoCardStatVal, textColor]}>{st.val}</Text>
                <Text style={[styles.infoCardStatLabel, subColor]}>{st.label}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.infoCardLocation, isNight && styles.infoCardLocationDark]}>
            <Text style={styles.infoCardLocationIcon}>📍</Text>
            <Text style={[styles.infoCardLocationText, textColor]}>{tree.location ?? 'Unknown location'}</Text>
          </View>

          <View style={styles.treeMetaList}>
            <View style={styles.treeMetaRow}>
              <Text style={[styles.treeMetaKey, subColor]}>Planted on</Text>
              <Text style={[styles.treeMetaVal, textColor]}>{plantDate}</Text>
            </View>
            <View style={styles.treeMetaRow}>
              <Text style={[styles.treeMetaKey, subColor]}>Tree ID</Text>
              <Text style={[styles.treeMetaVal, textColor]}>{tree.publicId}</Text>
            </View>
            {tree.aiVerificationStatus ? (
              <View style={styles.treeMetaRow}>
                <Text style={[styles.treeMetaKey, subColor]}>AI verification</Text>
                <Text style={[styles.treeMetaVal, textColor]}>{tree.aiVerificationStatus.replace(/_/g, ' ')}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.growthBarRow}>
            <Text style={[styles.growthBarLabel, subColor]}>Growth</Text>
            <View style={[styles.growthBarBg, isNight && styles.growthBarBgDark]}>
              <View style={[styles.growthBarFill, {
                width: `${(tree.growthStage / 5) * 100}%` as any,
                backgroundColor: stageColor,
              }]} />
            </View>
          </View>
        </ScrollView>
      </BlurView>
    </Animated.View>
  );
}

/** In-map info card for a `PlantingMarker` tap — there's no public detail screen for a
 * plantation's survival stats, so this mirrors TreeInfoCard's bottom-sheet treatment instead of
 * navigating away. */
function PlantingInfoCard({ entry, onClose, isNight }: {
  entry: ApiPlantingMapEntry | null;
  onClose: () => void;
  isNight: boolean;
}) {
  const navClearance = useBottomNavClearance(8);
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (entry) {
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(300, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [entry]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!entry) return null;

  return (
    <Animated.View style={[styles.infoCardWrap, { bottom: navClearance }, cardStyle]}>
      <BlurView intensity={95} tint={isNight ? 'dark' : 'light'} style={[styles.infoCard, isNight && styles.infoCardNight]}>
        <View style={[styles.infoCardHandle, isNight && styles.infoCardHandleDark]} />
        <TouchableOpacity
          style={[styles.infoCardClose, isNight && styles.infoCardCloseDark]}
          onPress={onClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Close plantation details"
        >
          <Text style={[styles.infoCardCloseText, isNight && styles.lightText]}>✕</Text>
        </TouchableOpacity>

        <View style={styles.infoCardHeader}>
          <View style={[styles.infoCardIcon, { backgroundColor: COLORS.forest + '22' }]}>
            <Text style={styles.infoCardEmoji}>🌲</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoCardNickname, isNight && styles.lightText]} numberOfLines={1}>{entry.driveTitle}</Text>
            <Text style={[styles.infoCardSpecies, isNight && styles.lightSubText]}>{entry.total} trees planted</Text>
          </View>
          <View style={[styles.infoCardStageBadge, { backgroundColor: COLORS.forest + '22' }]}>
            <Text style={[styles.infoCardStageText, { color: COLORS.forest }]}>{entry.survivalRate}% survival</Text>
          </View>
        </View>

        <ScrollView style={styles.plantingZoneList} showsVerticalScrollIndicator={false}>
          {entry.zones.map((zone) => (
            <View key={zone.name} style={[styles.plantingZoneRow, isNight && styles.plantingZoneRowDark]}>
              <Text style={[styles.plantingZoneName, isNight && styles.lightText]} numberOfLines={1}>{zone.name}</Text>
              <Text style={[styles.plantingZoneMeta, isNight && styles.lightSubText]}>{zone.total} trees · {zone.survivalRate}%</Text>
            </View>
          ))}
        </ScrollView>
      </BlurView>
    </Animated.View>
  );
}

export function MapScreen({ navigation, route, mode = 'user' }: any) {
  const insets = useSafeAreaInsets();
  const theme = useTimeTheme();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationPending, setLocationPending] = useState(true);
  const [selectedTree, setSelectedTree] = useState<ApiTree | null>(null);
  const [selectedPlanting, setSelectedPlanting] = useState<ApiPlantingMapEntry | null>(null);
  // Map layer filter: 'all' shows everything; picking a layer shows only that one. Collapsed by default.
  const [filterOpen, setFilterOpen] = useState(false);
  // Opened from the Adopt-a-Tree list's Map toggle: show the List | Map toggle so the user can switch back.
  const fromAdopt: boolean = !!route?.params?.fromAdopt;
  const [adoptView, setAdoptView] = useState<'list' | 'map'>('map');
  const [headerHeight, setHeaderHeight] = useState(0);
  const switchToList = (next: 'list' | 'map') => {
    setAdoptView(next);
    if (next === 'list') setTimeout(() => navigation.goBack(), 240);
  };
  const [mapFilter, setMapFilter] = useState<MapFilter>('all');
  const cameraRef = useRef<any>(null);
  const fadeStyle = useFadeIn(0, 400);
  const headerSlide = useSlideUp(0, 20, 350);
  const { user } = useAuth();
  const isNgo = mode === 'ngo';
  // A nursery scoped in from NurseryImpactScreen's "View on map" button — when present, the tree
  // layer shows only that nursery's sourced trees (via /trees/map?nurseryId=) instead of the
  // viewer's own personal forest.
  const scopeNurseryId: string | undefined = route?.params?.nurseryId;
  // An NGO scoped in from NgoProfileScreen's "View on map" button — when present, drives and
  // adoptable trees are filtered to just this NGO, and its zone-level planting pins appear.
  const scopeNgoId: string | undefined = route?.params?.ngoId;
  const scopeNgoName: string | undefined = route?.params?.ngoName;
  // Pushed as its own stack screen (has a route) rather than rendered as the Map tab — needs a back button.
  const isPushedScreen = !!route?.key;
  // Both public and NGO-owned feeds are always fetched (stable per-mount `mode` prop, never
  // toggles) so this never has to call hooks conditionally — whichever pair isn't relevant for
  // this mode is simply not used below. NGO mode has no personal "planted trees" concept at all.
  const { data: rawTrees = [] } = useTrees(undefined, !isNgo && !scopeNurseryId);
  const { data: nurseryScopedTrees = [] } = useTreesMap({ scope: 'global', nurseryId: scopeNurseryId }, !!scopeNurseryId);
  const trees = isNgo ? [] : scopeNurseryId ? nurseryScopedTrees : rawTrees;
  const { data: publicAdoptableTrees = [] } = useAdoptableTrees(undefined, undefined, !isNgo, scopeNgoId);
  const { data: myAdoptableTrees = [] } = useMyAdoptableTrees(isNgo);
  const adoptableTrees = isNgo ? myAdoptableTrees : publicAdoptableTrees;
  const { data: publicDrives = [] } = useDrives(undefined, undefined, !isNgo, scopeNgoId);
  const { data: myDrives = [] } = useMyDrives(isNgo);
  const drives = isNgo ? myDrives : publicDrives;
  const { data: plantingPins = [] } = useNgoPlantingMap(!isNgo && scopeNgoId ? scopeNgoId : null);
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

  // Detects the user's position. Also re-runs when the app returns to the foreground and, while
  // there is still no fix, every few seconds — so switching GPS / location permission on while
  // this screen is open is picked up automatically (the ⚠️ turns into 📍 and the map zooms in).
  const locationRef = useRef<Location.LocationObject | null>(null);
  const detectingRef = useRef(false);
  // `prompt` is true only for the open / foreground checks; the background poll just reads the
  // current permission state so it can never re-trigger the system permission dialog.
  const detectLocation = useCallback(async (prompt = false) => {
    if (detectingRef.current || locationRef.current) return;
    detectingRef.current = true;
    try {
      const { status } = prompt
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();
      if (status !== 'granted' || !(await Location.hasServicesEnabledAsync())) return;
      const loc = await getCurrentPositionWithTimeout({
        accuracy: Location.Accuracy.Balanced,
      });
      locationRef.current = loc;
      setLocation(loc);
    } catch {}
    finally {
      detectingRef.current = false;
      setLocationPending(false);
    }
  }, []);

  useEffect(() => {
    // Centering the map on the user's own position is ambient/automatic — it respects the
    // Location Tracking preference, unlike explicit actions like planting a tree.
    if (!locationTrackingEnabled) { setLocationPending(false); return; }
    detectLocation(true);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') detectLocation(true);
    });
    const timer = setInterval(() => detectLocation(false), 4000);
    return () => { sub.remove(); clearInterval(timer); };
  }, [locationTrackingEnabled, detectLocation]);

  const ngoPoints = isNgo || scopeNgoId
    ? ([...drives, ...adoptableTrees, ...plantingPins] as Array<{ lat: number | null; lng: number | null }>)
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({ lat: p.lat as number, lng: p.lng as number }))
    : [];

  const showPlants = mapFilter === 'all' || mapFilter === 'plants';
  const showNgo = mapFilter === 'all' || mapFilter === 'ngo';
  const showNurseries = mapFilter === 'all' || mapFilter === 'nurseries';
  const showZones = mapFilter === 'all' || mapFilter === 'zones';

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
    setSelectedPlanting(null);
  }, [trees, ngoPoints, location]);

  const flyToMe = useCallback(() => {
    if (!location) return;
    cameraRef.current?.flyTo({
      center: [location.coords.longitude, location.coords.latitude],
      zoom: 14,
      duration: 600,
    });
  }, [location]);

  const hasZoomedToUserRef = useRef(false);
  const hasAutoFitRef = useRef(false);
  useEffect(() => {
    if (hasAutoFitRef.current) {
      // A fix that arrives after the initial overview (GPS switched on while on the map): zoom to it.
      if (location && !hasZoomedToUserRef.current) {
        hasZoomedToUserRef.current = true;
        flyToMe();
      }
      return;
    }
    if (location) hasZoomedToUserRef.current = true;
    if (trees.length > 0 || ngoPoints.length > 0 || (location && !locationPending)) {
      hasAutoFitRef.current = true;
      fitToOverview();
    }
  }, [trees, ngoPoints, location, locationPending, fitToOverview, flyToMe]);

  // Opened with a specific spot to show (e.g. "Map" on an Adopt-a-Tree card): fly there instead of
  // the usual overview / own-location framing, and keep those from overriding it later.
  const focus: { lat: number; lng: number } | undefined = route?.params?.focus;
  useEffect(() => {
    if (!focus) return;
    hasAutoFitRef.current = true;
    hasZoomedToUserRef.current = true;
    const timer = setTimeout(() => {
      cameraRef.current?.flyTo({ center: [focus.lng, focus.lat], zoom: 15, duration: 600 });
    }, 500);
    return () => clearTimeout(timer);
  }, [focus?.lat, focus?.lng]);

  const flyToTree = useCallback((tree: ApiTree) => {
    // Close-up zoom with the pin nudged above the (tall) details sheet; short flight so the card
    // doesn't wait on a long camera animation.
    cameraRef.current?.flyTo({
      center: [tree.lng, tree.lat - 0.0012],
      zoom: 16,
      duration: 350,
    });
    setSelectedTree(tree);
  }, []);

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
        disabled={checkingEligibility}
        accessibilityRole="button"
        accessibilityLabel="Plant where you are"
      >
        <BlurView intensity={80} tint={isNight ? 'dark' : 'light'} style={[styles.plantHereBtnBlur, styles.mapGlass, isNight && styles.mapGlassNight]}>
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

  // ---- Expo Go fallback: the same layers as the native map, as plain pin/circle data ----
  const fallbackPins: LeafletPin[] = [];
  const fallbackCircles: LeafletCircle[] = [];
  if (!HAS_NATIVE_MAP) {
    for (const tree of showPlants ? trees : []) {
      const selected = selectedTree?.id === tree.id;
      const color = GROWTH_COLOR[tree.growthStage - 1];
      fallbackPins.push({ id: `tree:${tree.id}`, lat: tree.lat, lng: tree.lng, emoji: GROWTH_EMOJI[tree.growthStage - 1], bg: selected ? color : '#fff', border: color, selected });
    }
    for (const t of showNgo ? adoptableTrees : []) {
      if (t.lat != null && t.lng != null) fallbackPins.push({ id: `adopt:${t.id}`, lat: t.lat, lng: t.lng, emoji: '🌳', border: COLORS.sage });
    }
    for (const d of showNgo ? drives : []) {
      if (d.lat != null && d.lng != null) fallbackPins.push({ id: `drive:${d.id}`, lat: d.lat, lng: d.lng, emoji: '🤝', border: COLORS.golden });
    }
    if (showNgo && !isNgo && scopeNgoId) {
      for (const e of plantingPins) fallbackPins.push({ id: `planting:${e.driveId}`, lat: e.lat, lng: e.lng, emoji: '🌲', border: COLORS.forest });
    }
    for (const n of showNurseries ? nurseries : []) {
      if (n.lat != null && n.lng != null) fallbackPins.push({ id: `nursery:${n.id}`, lat: Number(n.lat), lng: Number(n.lng), emoji: NURSERY_EMOJI, border: COLORS.earth });
    }
    if (!isNgo && showZones) {
      for (const loc of approvedLocations) {
        fallbackPins.push({ id: `approved:${loc.id}`, lat: loc.lat, lng: loc.lng, emoji: '🏞️', border: ZONE_COLOR });
        fallbackCircles.push({ id: `approved_c_${loc.id}`, lat: loc.lat, lng: loc.lng, radiusMeters: loc.radiusMeters, fill: 'rgba(46,158,79,0.30)', stroke: 'rgba(46,158,79,0.85)' });
      }
    }
  }

  const handleFallbackPinPress = (pinId: string) => {
    const sep = pinId.indexOf(':');
    const kind = pinId.slice(0, sep);
    const id = pinId.slice(sep + 1);
    if (kind === 'tree') {
      const tree = trees.find((t) => t.id === id);
      if (tree) flyToTree(tree);
    } else if (kind === 'adopt') {
      navigation.navigate('AdoptTreeDetail', { treeId: id });
    } else if (kind === 'drive') {
      navigation.navigate('DriveDetail', { driveId: id });
    } else if (kind === 'planting') {
      const entry = plantingPins.find((e) => e.driveId === id);
      if (entry) setSelectedPlanting(entry);
    } else if (kind === 'nursery') {
      navigation.navigate('NurseryPublicProfile', { nurseryId: id });
    } else if (kind === 'approved') {
      const loc = approvedLocations.find((l) => l.id === id);
      if (loc) setInfoLocation(loc);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style={isNight ? 'light' : 'dark'} />

      {/* Map */}
      <Animated.View style={[StyleSheet.absoluteFill, fadeStyle]}>
        {HAS_NATIVE_MAP ? (
        <Map style={StyleSheet.absoluteFill} mapStyle={OSM_STYLE} compass={false} scaleBar={false}>
          <Camera ref={cameraRef} initialViewState={{ center: INDIA_CENTER, zoom: INDIA_ZOOM }} />

          {!isNgo && showZones && approvedLocations.map((loc) => (
            <CircleOverlay
              key={`approved_c_${loc.id}`}
              id={`approved_c_${loc.id}`}
              lat={loc.lat}
              lng={loc.lng}
              radiusMeters={loc.radiusMeters}
              fillColor="rgba(46,158,79,0.30)"
              strokeColor="rgba(46,158,79,0.85)"
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

          {showPlants && trees.map(tree => (
            <TreeMarker
              key={tree.id}
              tree={tree}
              selected={selectedTree?.id === tree.id}
              onPress={() => flyToTree(tree)}
            />
          ))}

          {showNgo && adoptableTrees
            .filter((tree): tree is ApiAdoptableTree & { lat: number; lng: number } => tree.lat != null && tree.lng != null)
            .map(tree => (
              <AdoptableTreeMarker
                key={`adopt_${tree.id}`}
                tree={tree}
                onPress={() => navigation.navigate('AdoptTreeDetail', { treeId: tree.id })}
              />
            ))}

          {showNgo && drives
            .filter((drive): drive is ApiDrive & { lat: number; lng: number } => drive.lat != null && drive.lng != null)
            .map(drive => (
              <NgoDriveMarker
                key={`drive_${drive.id}`}
                drive={drive}
                onPress={() => navigation.navigate('DriveDetail', { driveId: drive.id })}
              />
            ))}

          {showNgo && !isNgo && scopeNgoId && plantingPins.map(entry => (
            <PlantingMarker
              key={`planting_${entry.driveId}`}
              entry={entry}
              onPress={() => setSelectedPlanting(entry)}
            />
          ))}

          {showNurseries && nurseries
            .filter((n) => n.lat != null && n.lng != null)
            .map((n) => (
              <NurseryMarker
                key={`nursery_${n.id}`}
                nursery={{ id: n.id, nurseryName: n.nurseryName, lat: Number(n.lat), lng: Number(n.lng) }}
                onPress={() => navigation.navigate('NurseryPublicProfile', { nurseryId: n.id })}
              />
            ))}

          {!isNgo && showZones && approvedLocations.map((loc) => (
            <ApprovedLocationMarker
              key={`approved_${loc.id}`}
              location={loc}
              onPress={() => setInfoLocation(loc)}
            />
          ))}

          <UserLocation animated accuracy={false} />
        </Map>
        ) : (
          <LeafletPinMap
            ref={cameraRef}
            pins={fallbackPins}
            circles={fallbackCircles}
            user={location ? { lat: location.coords.latitude, lng: location.coords.longitude } : null}
            initialCenter={INDIA_CENTER}
            initialZoom={INDIA_ZOOM}
            onPinPress={handleFallbackPinPress}
          />
        )}
      </Animated.View>

      {/* Header */}
      <Animated.View style={[styles.header, { paddingTop: insets.top + 8 }, headerSlide]} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        <BlurView intensity={isNight ? 65 : 50} tint={isNight ? 'dark' : 'light'} style={styles.headerBlur}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              {!isNgo && (scopeNgoId || scopeNurseryId || isPushedScreen) && (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  style={styles.mapBackBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Text style={[styles.mapBackBtnText, isNight && styles.lightText]}>←</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, isNight && styles.lightText]} numberOfLines={1}>
                  {isNgo ? '🗺️ Your Drives & Trees' : scopeNgoId ? `🗺️ ${scopeNgoName ?? 'NGO'} on the map` : '🗺️ Tree Map'}
                </Text>
                <Text style={[styles.headerSub, isNight && styles.lightSubText]}>
                  {isNgo || scopeNgoId
                    ? `${drives.length} ${drives.length === 1 ? 'drive' : 'drives'} · ${adoptableTrees.length} ${adoptableTrees.length === 1 ? 'tree' : 'trees'}${scopeNgoId ? ` · ${plantingPins.length} ${plantingPins.length === 1 ? 'plantation' : 'plantations'}` : ''}`
                    : `${trees.length} ${trees.length === 1 ? 'tree' : 'trees'} planted`}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.indiaBtn} onPress={() => navigation.navigate('NearbyTrees')}>
              <Text style={styles.indiaBtnText}>🌳 Nearby</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.indiaBtn} onPress={fitToOverview}>
              <Text style={styles.indiaBtnText}>🌍 Overview</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </Animated.View>

      {fromAdopt && (
        <View style={[styles.adoptToggleWrap, { top: headerHeight + 8 }]}>
          <BlurView intensity={80} tint={isNight ? 'dark' : 'light'} style={[styles.adoptToggleBlur, styles.mapGlass, isNight && styles.mapGlassNight]}>
            <SlidingSegment
              value={adoptView}
              onChange={switchToList}
              options={[{ key: 'list', label: '☰ List' }, { key: 'map', label: '🗺️ Map' }]}
            />
          </BlurView>
        </View>
      )}

      {/* Layer filter bubble — collapsed by default; tapping a layer shows only that layer. */}
      {!selectedTree && !selectedPlanting && (
        <View style={[styles.legendWrap, { bottom: 160 + insets.bottom + (!isNgo && trees.length > 0 ? 124 : 62) }]}>
          <BlurView intensity={80} tint={isNight ? 'dark' : 'light'} style={[styles.legendBlur, styles.mapGlass, isNight && styles.mapGlassNight]}>
            <TouchableOpacity onPress={() => setFilterOpen((v) => !v)} accessibilityRole="button" accessibilityLabel="Toggle map layer filter">
              <Text style={[styles.legendTitle, isNight && styles.lightText]}>
                {filterOpen ? 'Show on map ▾' : mapFilter === 'all' ? 'Show on map ▸' : `Showing: ${FILTER_OPTIONS.find((o) => o.key === mapFilter)?.label} ▸`}
              </Text>
            </TouchableOpacity>
            {filterOpen && FILTER_OPTIONS.filter((o) => !(isNgo && (o.key === 'plants' || o.key === 'zones'))).map((o) => {
              const active = mapFilter === o.key;
              return (
                <TouchableOpacity
                  key={o.key}
                  style={[styles.legendRow, styles.filterOption, active && { backgroundColor: o.color + '33', borderColor: o.color }]}
                  onPress={() => setMapFilter(active ? 'all' : o.key)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Show only ${o.label}`}
                >
                  <View style={[styles.legendSwatch, { borderColor: o.color, backgroundColor: o.bg }]}>
                    <Text style={{ fontSize: 11 }}>{o.emoji}</Text>
                  </View>
                  <Text style={[styles.legendText, isNight && styles.lightText, active && { fontWeight: '700' }]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </BlurView>
        </View>
      )}

      {/* GPS button */}
      <View style={[styles.gpsBtn, { bottom: (selectedTree ? 260 : 160) + insets.bottom }]}>
        <TouchableOpacity
          onPress={flyToMe}
          disabled={!location}
          accessibilityRole="button"
          accessibilityLabel="Center map on my location"
        >
          <BlurView intensity={80} tint={isNight ? 'dark' : 'light'} style={[styles.gpsBtnBlur, styles.mapGlass, isNight && styles.mapGlassNight]}>
            {locationPending ? (
              <ActivityIndicator size="small" color={COLORS.sage} />
            ) : (
              <Text style={styles.gpsBtnIcon}>{location ? '📍' : '⚠️'}</Text>
            )}
          </BlurView>
        </TouchableOpacity>
      </View>

      {/* Location tracking switched off in Settings: centred prompt to turn it back on. */}
      {!locationTrackingEnabled && (
        <View style={styles.locationOffWrap} pointerEvents="box-none">
          <BlurView intensity={85} tint={isNight ? 'dark' : 'light'} style={[styles.locationOffCard, styles.mapGlass, isNight && styles.mapGlassNight]}>
            <Text style={styles.locationOffIcon}>📍</Text>
            <Text style={[styles.locationOffTitle, isNight && styles.lightText]}>Location tracking is off</Text>
            <Text style={[styles.locationOffBody, isNight && styles.lightText]}>
              Turn on Location Tracking from Settings to see where you are and plant nearby.
            </Text>
            <TouchableOpacity style={styles.locationOffBtn} onPress={() => navigation.navigate('Settings')} accessibilityRole="button">
              <Text style={styles.locationOffBtnText}>Open Settings</Text>
            </TouchableOpacity>
          </BlurView>
        </View>
      )}

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
      <TreeInfoCard
        tree={selectedTree}
        onClose={() => setSelectedTree(null)}
        isNight={isNight}
        isOwn={!selectedTree?.planter || selectedTree.planter.id === user?.id}
        ownerName={selectedTree?.planter?.name ?? user?.name ?? 'You'}
        ownerHandle={selectedTree?.planter?.handle ?? user?.handle}
        ownerEmoji={selectedTree?.planter?.avatarEmoji ?? user?.avatarEmoji ?? '🧑'}
        onOpenPlanter={() => {
          const planterId = selectedTree?.planter?.id ?? user?.id;
          if (planterId) navigation.navigate('UserPublicProfile', { userId: planterId });
        }}
      />

      {/* Plantation planting-map info card */}
      <PlantingInfoCard entry={selectedPlanting} onClose={() => setSelectedPlanting(null)} isNight={isNight} />

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
    flexDirection: 'row', alignItems: 'center', gap: 8,
    justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12,
  },
  headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 8 },
  mapBackBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  mapBackBtnText: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  headerTitle: { ...TEXT.heading, color: COLORS.textPrimary },
  headerSub: { fontSize: 12, color: COLORS.textPrimary, marginTop: 2 },
  indiaBtn: { backgroundColor: COLORS.sage, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  indiaBtnText: { fontSize: 13, fontWeight: '600', color: 'white' },

  markerContainer: { alignItems: 'center' },
  markerBubble: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    ...SHADOWS.md, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.85)',
  },
  markerBubbleSelected: { borderColor: 'white' },
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
    backgroundColor: ZONE_COLOR,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  plantingBubble: {
    backgroundColor: COLORS.forest,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  plantingZoneList: { maxHeight: 160, marginTop: 4 },
  plantingZoneRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  plantingZoneRowDark: { borderBottomColor: 'rgba(255,255,255,0.15)' },
  plantingZoneName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1, marginRight: 8 },
  plantingZoneMeta: { fontSize: 12, color: COLORS.textSecondary },
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

  locationOffWrap: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  locationOffCard: { borderRadius: 20, padding: 20, alignItems: 'center', overflow: 'hidden', maxWidth: 340 },
  locationOffIcon: { fontSize: 32, marginBottom: 8 },
  locationOffTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  locationOffBody: { fontSize: 13, color: COLORS.textPrimary, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  locationOffBtn: { marginTop: 14, backgroundColor: COLORS.sage, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 10 },
  locationOffBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
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

  infoCardWrap: { position: 'absolute', bottom: 0, left: 12, right: 12 },
  // Mostly opaque so the details stay readable over any map imagery behind the sheet.
  infoCard: { borderRadius: 26, overflow: 'hidden', padding: 20, paddingBottom: 20, backgroundColor: 'rgba(255,255,255,0.94)' },
  infoCardNight: { backgroundColor: 'rgba(18,28,18,0.95)' },
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
  infoCardNickname: { ...TEXT.heading, color: COLORS.textPrimary },
  infoCardSpecies: { fontSize: 14, color: COLORS.textPrimary, marginTop: 2 },
  infoCardStageBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  infoCardStageText: { fontSize: 12, fontWeight: '600' },
  infoCardStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 14, marginBottom: 12,
  },
  infoCardStatsDark: { backgroundColor: 'rgba(255,255,255,0.1)' },
  infoCardStat: { flex: 1, alignItems: 'center' },
  infoCardStatVal: { ...TEXT.statSmall, fontSize: 17, color: COLORS.textPrimary },
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
  treeInfoCard: { maxHeight: Dimensions.get('window').height * 0.68 },
  treeBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  treeInfoPhoto: { width: '100%', height: 150, borderRadius: 16, marginBottom: 12 },
  planterRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 16, padding: 10, marginBottom: 12,
  },
  planterRowDark: { backgroundColor: 'rgba(255,255,255,0.1)' },
  planterAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(80,140,70,0.15)', alignItems: 'center', justifyContent: 'center' },
  planterLabel: { fontSize: 11, color: COLORS.textPrimary },
  planterName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  planterLink: { fontSize: 12, fontWeight: '700', color: COLORS.forest },
  treeStatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  treeStatCell: {
    width: '31.5%', alignItems: 'center', paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 14,
  },
  treeMetaList: { marginBottom: 12 },
  treeMetaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  treeMetaKey: { fontSize: 12, color: COLORS.textPrimary },
  treeMetaVal: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  // One shared glass look for the floating map buttons (GPS, Plant where you are, Show on map).
  mapGlass: { backgroundColor: 'rgba(255,255,255,0.78)' },
  mapGlassNight: { backgroundColor: 'rgba(18,28,18,0.78)' },
  adoptToggleWrap: { position: 'absolute', left: 16, zIndex: 5 },
  adoptToggleBlur: { borderRadius: 16, overflow: 'hidden', padding: 3 },
  legendWrap: { position: 'absolute', right: 16, alignItems: 'flex-end' },
  legendBlur: { borderRadius: 16, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8 },
  legendTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 6 },
  filterOption: { marginTop: 6, paddingTop: 5, paddingBottom: 5, paddingHorizontal: 6, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  legendSwatch: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  legendText: { fontSize: 12, color: COLORS.textPrimary },
  growthBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  growthBarLabel: { fontSize: 12, color: COLORS.textPrimary, width: 46 },
  growthBarBg: { flex: 1, height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' },
  growthBarBgDark: { backgroundColor: 'rgba(255,255,255,0.15)' },
  growthBarFill: { height: '100%', borderRadius: 3 },

  lightText: { color: 'white' },
  lightSubText: { color: COLORS.white },
});
