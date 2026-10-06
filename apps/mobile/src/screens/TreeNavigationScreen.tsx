import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from '../components/common/AppText';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { useLiveDistance } from '../hooks/useLiveDistance';
import { formatMeters, haversineMeters, type LatLng } from '../utils/geo';
import { buildLeafletHtml } from '../utils/leafletMapHtml';

// Mirrors the server's strict observation radius (plantingLocation.service.ts) — the "Send
// update" button only appears once the user is this close; the server re-checks it regardless.
const ARRIVED_RADIUS_M = 15;
// Re-route once the user has moved this far from where the current route started.
const REROUTE_DISTANCE_M = 40;

async function fetchWalkingRoute(from: LatLng, to: LatLng): Promise<[number, number][] | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/foot/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    return json?.routes?.[0]?.geometry?.coordinates ?? null;
  } catch {
    return null;
  }
}

export function TreeNavigationScreen({ navigation, route }: any) {
  const { kind, id, lat, lng, species, speciesEmoji, publicId, latestPhotoUrl } = route.params as {
    kind: 'tree' | 'planted-tree';
    id: string;
    lat: number;
    lng: number;
    species?: string;
    speciesEmoji?: string | null;
    publicId?: string;
    latestPhotoUrl?: string | null;
  };
  const insets = useSafeAreaInsets();
  const webviewRef = useRef<WebView>(null);
  // Leaflet/OSM in a WebView, like DeliveryTrackingMap — a native map library (MapLibre) is not in
  // every installed binary and crashes boot when missing. Built once; updates go via injectJavaScript.
  const [html] = useState(() =>
    buildLeafletHtml(`
      var map = L.map('map', { zoomControl: false }).setView([${route.params.lat}, ${route.params.lng}], 17);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      var treeIcon = L.divIcon({ html: '<div style="font-size:34px;line-height:34px">' + ${JSON.stringify(route.params.speciesEmoji ?? '🌳')} + '</div>', className: '', iconSize: [34, 34], iconAnchor: [17, 34] });
      L.marker([${route.params.lat}, ${route.params.lng}], { icon: treeIcon }).addTo(map);
      var meIcon = L.divIcon({ html: '<div style="width:18px;height:18px;border-radius:9px;background:#2F80ED;border:3px solid #fff;box-shadow:0 0 0 2px rgba(47,128,237,0.4)"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
      var me = null, line = null, fitted = false;
      function setMe(lat, lng) {
        if (!me) { me = L.marker([lat, lng], { icon: meIcon }).addTo(map); } else { me.setLatLng([lat, lng]); }
        if (!fitted) { fitted = true; map.fitBounds([[lat, lng], [${route.params.lat}, ${route.params.lng}]], { padding: [60, 60] }); }
      }
      function setRoute(coords) {
        if (line) { map.removeLayer(line); }
        line = L.polyline(coords, { color: '#5E8550', weight: 5, opacity: 0.9 }).addTo(map);
      }
    `),
  );
  const target = useMemo(() => ({ lat, lng }), [lat, lng]);
  const { position, distanceM, denied } = useLiveDistance(target);

  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const routeOrigin = useRef<LatLng | null>(null);

  // Fetch the walking route once, and again whenever the user strays far from where it started.
  useEffect(() => {
    if (!position) return;
    if (routeOrigin.current && haversineMeters(routeOrigin.current, position) < REROUTE_DISTANCE_M) return;
    routeOrigin.current = position;
    fetchWalkingRoute(position, target).then((coords) => setRouteCoords(coords));
  }, [position, target]);

  useEffect(() => {
    if (position) webviewRef.current?.injectJavaScript(`setMe(${position.lat}, ${position.lng}); true;`);
  }, [position]);

  // Falls back to a straight line when routing is unavailable.
  const lineCoords: [number, number][] | null =
    routeCoords ?? (position ? [[position.lng, position.lat], [lng, lat]] : null);
  useEffect(() => {
    if (!lineCoords) return;
    const latLngs = lineCoords.map(([lo, la]) => [la, lo]);
    webviewRef.current?.injectJavaScript(`setRoute(${JSON.stringify(latLngs)}); true;`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeCoords, routeCoords ? null : position]);

  const arrived = distanceM != null && distanceM <= ARRIVED_RADIUS_M;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={StyleSheet.absoluteFill}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        onLoadEnd={() => {
          if (position) webviewRef.current?.injectJavaScript(`setMe(${position.lat}, ${position.lng}); true;`);
        }}
      />

      <TouchableOpacity style={[styles.back, { top: insets.top + 8 }]} onPress={() => navigation.goBack()}>
        <Text style={styles.backIcon}>←</Text>
      </TouchableOpacity>

      <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.panelSpecies} numberOfLines={1}>
          {speciesEmoji ? `${speciesEmoji} ` : ''}{species ?? 'ARTH tree'}{publicId ? ` · ARTH #${publicId}` : ''}
        </Text>
        {denied ? (
          <Text style={styles.panelHint}>Location permission is needed to guide you to the tree.</Text>
        ) : distanceM == null ? (
          <View style={styles.row}>
            <ActivityIndicator color={COLORS.sageDark} />
            <Text style={styles.panelHint}>Finding your location…</Text>
          </View>
        ) : (
          <Text style={styles.distance}>{arrived ? 'You are here 🌳' : `${formatMeters(distanceM)} away`}</Text>
        )}
        {arrived ? (
          <TouchableOpacity
            style={styles.sendButton}
            onPress={() =>
              navigation.navigate('LogCommunityObservation', { kind, id, species, speciesEmoji, photoUrl: latestPhotoUrl, publicId })
            }
          >
            <Text style={styles.sendButtonText}>Send an update to the owner</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.panelHint}>Get within {ARRIVED_RADIUS_M} m of the tree to send the owner an update.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  back: { position: 'absolute', left: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,248,237,0.92)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 24, fontWeight: '700', color: COLORS.textPrimary },
  panel: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 16, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, backgroundColor: 'rgba(255,248,237,0.96)', gap: 6 },
  panelSpecies: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  distance: { fontSize: 34, fontWeight: '800', color: COLORS.forest },
  panelHint: { fontSize: 12, color: COLORS.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sendButton: { marginTop: 8, alignItems: 'center', paddingVertical: 13, borderRadius: RADIUS.md, backgroundColor: COLORS.forest },
  sendButtonText: { fontSize: 15, fontWeight: '800', color: COLORS.mint },
});
