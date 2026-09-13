import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './AppText';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { buildLeafletHtml, SAPLING_ICON_HTML, DESTINATION_ICON_HTML } from '../../utils/leafletMapHtml';

const ICON_SIZE = 48;

interface RoadInfo {
  distanceKm: number;
  durationMin: number | null;
  roadSnapped: boolean;
}

function distanceLabel(rider: { lat: number; lng: number } | null, road: RoadInfo | null): string {
  if (!rider) return 'Finding your location…';
  if (!road) return 'Calculating route…';
  if (road.roadSnapped) {
    return `${road.distanceKm.toFixed(1)} km by road${road.durationMin != null ? ` · ~${Math.round(road.durationMin)} min` : ''}`;
  }
  return `${road.distanceKm.toFixed(1)} km to go — road route unavailable, showing straight line`;
}

/**
 * A single Leaflet/OSM WebView showing the rider + destination + a real road-snapped route,
 * fetched from OSRM's free public routing API directly inside the page's own JS (no backend
 * involvement needed — the WebView just makes its own HTTP request). Falls back to a straight
 * dashed line if that request fails (network hiccup, or the public demo server's rate limit — see
 * the note on OSRM_URL). Built exactly once at mount from whatever `rider`/`destination` are at
 * that moment — every later rider position update goes through
 * `injectJavaScript('updateRider(...)')` instead of rebuilding `source.html`, since replacing that
 * prop makes react-native-webview reload the whole page. Re-fetches the route only when the rider
 * has moved more than ~30m since the last fetch, to avoid hammering OSRM on every GPS ping.
 */
function TrackingWebView({
  rider,
  destination,
  style,
  badgeStyle,
}: {
  rider: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number };
  style: object;
  badgeStyle?: object;
}) {
  const webviewRef = useRef<WebView>(null);
  const isFirstRef = useRef(true);
  const [road, setRoad] = useState<RoadInfo | null>(null);

  const [html] = useState(() => {
    // Gives the map a real view immediately (setView), before the async OSRM fetch resolves —
    // Leaflet needs a center/zoom established before it can render any layers added to it.
    const initialFetchJs = rider
      ? `map.setView([${rider.lat}, ${rider.lng}], 14); fetchRoadRoute(${rider.lat}, ${rider.lng});`
      : `map.setView([${destination.lat}, ${destination.lng}], 13);`;

    return buildLeafletHtml(`
      var map = L.map('map', { zoomControl: false, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      var saplingIcon = L.divIcon({ html: ${JSON.stringify(SAPLING_ICON_HTML(ICON_SIZE))}, className: '', iconSize: [${ICON_SIZE}, ${ICON_SIZE}], iconAnchor: [${ICON_SIZE / 2}, ${ICON_SIZE / 2}] });
      var destIcon = L.divIcon({ html: ${JSON.stringify(DESTINATION_ICON_HTML)}, className: '', iconSize: [32, 32], iconAnchor: [16, 32] });
      var destination = L.marker([${destination.lat}, ${destination.lng}], { icon: destIcon }).addTo(map);
      var destLat = ${destination.lat}, destLng = ${destination.lng};
      var route = null;
      var rider = ${rider ? `L.marker([${rider.lat}, ${rider.lng}], { icon: saplingIcon }).addTo(map)` : 'null'};
      var lastFetchOrigin = null;

      function post(msg) {
        if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
      function haversineKm(aLat, aLng, bLat, bLng) {
        function toRad(d) { return d * Math.PI / 180; }
        var dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
        var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return 2 * 6371 * Math.asin(Math.sqrt(h));
      }
      function drawStraightLine(riderLat, riderLng) {
        var points = [[riderLat, riderLng], [destLat, destLng]];
        if (route) { route.setLatLngs(points); } else { route = L.polyline(points, { color: '${COLORS.forest}', weight: 3, dashArray: '8, 6' }).addTo(map); }
        post({ distanceKm: haversineKm(riderLat, riderLng, destLat, destLng), durationMin: null, roadSnapped: false });
      }
      // OSRM's free public demo server (router.project-osrm.org) — no API key, but rate-limited
      // and meant for light/evaluation use, not heavy production traffic. Falls back to a
      // straight line (drawStraightLine) on any failure — timeout, network error, or rate limit.
      function fetchRoadRoute(riderLat, riderLng) {
        lastFetchOrigin = { lat: riderLat, lng: riderLng };
        if (!rider) { rider = L.marker([riderLat, riderLng], { icon: saplingIcon }).addTo(map); }
        var url = 'https://router.project-osrm.org/route/v1/cycling/' + riderLng + ',' + riderLat + ';' + destLng + ',' + destLat + '?overview=full&geometries=geojson';
        fetch(url).then(function (res) { return res.json(); }).then(function (data) {
          var r = data && data.routes && data.routes[0];
          if (!r) { drawStraightLine(riderLat, riderLng); return; }
          var latlngs = r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; });
          if (route) { route.setLatLngs(latlngs); } else { route = L.polyline(latlngs, { color: '${COLORS.forest}', weight: 4 }).addTo(map); }
          map.fitBounds(route.getBounds(), { padding: [40, 40] });
          post({ distanceKm: r.distance / 1000, durationMin: r.duration / 60, roadSnapped: true });
        }).catch(function () { drawStraightLine(riderLat, riderLng); });
      }
      function updateRider(lat, lng) {
        if (!rider) { rider = L.marker([lat, lng], { icon: saplingIcon }).addTo(map); map.setView([lat, lng], 14); } else { rider.setLatLng([lat, lng]); }
        if (!lastFetchOrigin || haversineKm(lat, lng, lastFetchOrigin.lat, lastFetchOrigin.lng) > 0.03) {
          fetchRoadRoute(lat, lng);
        } else if (route) {
          var pts = route.getLatLngs();
          pts[0] = [lat, lng];
          route.setLatLngs(pts);
        }
      }
      ${initialFetchJs}
    `);
  });

  useEffect(() => {
    if (isFirstRef.current) {
      isFirstRef.current = false;
      return;
    }
    if (!rider) return;
    webviewRef.current?.injectJavaScript(`updateRider(${rider.lat}, ${rider.lng}); true;`);
  }, [rider?.lat, rider?.lng]);

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      setRoad(JSON.parse(e.nativeEvent.data));
    } catch {}
  };

  return (
    <>
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html }}
        style={style}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMessage}
      />
      <View style={[styles.distanceBadge, badgeStyle]}>
        <Text style={styles.distanceBadgeText}>{distanceLabel(rider, road)}</Text>
      </View>
    </>
  );
}

/**
 * The delivery partner's own "where do I go" map — their live position, the destination, and a
 * real road-snapped route between them, with a button to expand it to a fullscreen view. Renders
 * a Leaflet/OSM page inside a WebView rather than any native map library — see leafletMapHtml.ts
 * for why. Everything touching that page lives in this module and TrackingWebView above, so
 * `React.lazy()`-loading it (see DeliveryPartnerQueueScreen.tsx) keeps the WebView fully out of
 * the eager screen graph.
 */
export function RiderDeliveryMap({
  rider,
  destination,
}: {
  rider: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number };
}) {
  const insets = useSafeAreaInsets();
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <View style={styles.mapWrap}>
        <TrackingWebView rider={rider} destination={destination} style={styles.map} />
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setFullscreen(true)}
          accessibilityRole="button"
          accessibilityLabel="View route fullscreen"
        >
          <Text style={styles.expandIcon}>⛶</Text>
        </TouchableOpacity>
      </View>

      {fullscreen && (
        <Modal visible animationType="slide" onRequestClose={() => setFullscreen(false)}>
          <View style={styles.fullscreenContainer}>
            <TrackingWebView
              rider={rider}
              destination={destination}
              style={styles.fullscreenMap}
              badgeStyle={[styles.distanceBadgeFullscreen, { bottom: insets.bottom + 16 }]}
            />
            <TouchableOpacity
              style={[styles.closeButton, { top: insets.top + 12 }]}
              onPress={() => setFullscreen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close fullscreen route"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 180, borderRadius: RADIUS.lg, overflow: 'hidden', marginTop: 10 },
  map: { flex: 1, backgroundColor: 'transparent' },
  expandButton: {
    position: 'absolute', top: 8, right: 8,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  expandIcon: { fontSize: 15, color: COLORS.forest },
  distanceBadge: { position: 'absolute', bottom: 8, left: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: RADIUS.md, padding: 6 },
  distanceBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.forest, textAlign: 'center' },
  fullscreenContainer: { flex: 1, backgroundColor: '#D8E8C8' },
  fullscreenMap: { flex: 1, backgroundColor: 'transparent' },
  closeButton: {
    position: 'absolute', right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  closeIcon: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  distanceBadgeFullscreen: { left: 16, right: 16 },
});
