import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './AppText';
import { WebView } from 'react-native-webview';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { buildLeafletHtml, SAPLING_ICON_HTML } from '../../utils/leafletMapHtml';

const ICON_SIZE = 56;

/**
 * A single Leaflet/OSM WebView tracking one moving point. The HTML/JS is built exactly once, at
 * mount, from whatever `lat`/`lng` are at that moment — every later position update goes through
 * `injectJavaScript('animateTo(...)')` instead of rebuilding `source.html`, since replacing that
 * prop makes react-native-webview reload the whole page (undoing the smooth tween and flashing on
 * every ~8s poll). Rendering two of these (preview + fullscreen) is what lets the fullscreen one
 * always start fresh at the current position instead of wherever the preview happened to be.
 */
function TrackingWebView({ lat, lng, style }: { lat: number; lng: number; style: object }) {
  const webviewRef = useRef<WebView>(null);
  const isFirstRef = useRef(true);
  const [html] = useState(() =>
    buildLeafletHtml(`
      var map = L.map('map', { zoomControl: false, attributionControl: true }).setView([${lat}, ${lng}], 15);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      var icon = L.divIcon({ html: ${JSON.stringify(SAPLING_ICON_HTML(ICON_SIZE))}, className: '', iconSize: [${ICON_SIZE}, ${ICON_SIZE}], iconAnchor: [${ICON_SIZE / 2}, ${ICON_SIZE / 2}] });
      var marker = L.marker([${lat}, ${lng}], { icon: icon }).addTo(map);
      var current = { lat: ${lat}, lng: ${lng} };
      var animId = null;
      function animateTo(nextLat, nextLng) {
        if (animId) cancelAnimationFrame(animId);
        var startLat = current.lat, startLng = current.lng, startTime = Date.now(), duration = 7000;
        function step() {
          var t = Math.min(1, (Date.now() - startTime) / duration);
          current = { lat: startLat + (nextLat - startLat) * t, lng: startLng + (nextLng - startLng) * t };
          marker.setLatLng([current.lat, current.lng]);
          map.panTo([current.lat, current.lng], { animate: false });
          if (t < 1) { animId = requestAnimationFrame(step); }
        }
        animId = requestAnimationFrame(step);
      }
    `)
  );

  useEffect(() => {
    if (isFirstRef.current) {
      isFirstRef.current = false;
      return;
    }
    webviewRef.current?.injectJavaScript(`animateTo(${lat}, ${lng}); true;`);
  }, [lat, lng]);

  return (
    <WebView
      ref={webviewRef}
      originWhitelist={['*']}
      source={{ html }}
      style={style}
      scrollEnabled={false}
      javaScriptEnabled
      domStorageEnabled
    />
  );
}

/**
 * The customer-facing live-delivery map (a moving sapling marker), with a button to expand it to
 * a fullscreen view. Renders a Leaflet/OSM page inside a WebView rather than any native map
 * library — see leafletMapHtml.ts for why. Everything touching that page lives in this module and
 * TrackingWebView above, so `React.lazy()`-loading this file (see OrderDetailScreen.tsx) keeps
 * the WebView fully out of the eager screen graph.
 */
export function DeliveryTrackingMap({ lat, lng, etaMinutes }: { lat: number; lng: number; etaMinutes: number | null }) {
  const insets = useSafeAreaInsets();
  const [fullscreen, setFullscreen] = useState(false);
  const etaLabel = etaMinutes != null ? `Arriving in ~${etaMinutes} min` : 'On the way';

  return (
    <>
      <View style={styles.mapWrap}>
        <TrackingWebView lat={lat} lng={lng} style={styles.map} />
        <TouchableOpacity
          style={styles.expandButton}
          onPress={() => setFullscreen(true)}
          accessibilityRole="button"
          accessibilityLabel="View tracking fullscreen"
        >
          <Text style={styles.expandIcon}>⛶</Text>
        </TouchableOpacity>
        <View style={styles.etaBadge}>
          <Text style={styles.etaText}>{etaLabel}</Text>
        </View>
      </View>

      {fullscreen && (
        <Modal visible animationType="slide" onRequestClose={() => setFullscreen(false)}>
          <View style={styles.fullscreenContainer}>
            <TrackingWebView lat={lat} lng={lng} style={styles.fullscreenMap} />
            <TouchableOpacity
              style={[styles.closeButton, { top: insets.top + 12 }]}
              onPress={() => setFullscreen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close fullscreen tracking"
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <View style={[styles.etaBadge, styles.etaBadgeFullscreen, { bottom: insets.bottom + 16 }]}>
              <Text style={styles.etaText}>{etaLabel}</Text>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  mapWrap: { height: 180, borderRadius: RADIUS.lg, overflow: 'hidden', marginBottom: 16 },
  map: { flex: 1, backgroundColor: 'transparent' },
  expandButton: {
    position: 'absolute', top: 10, right: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  expandIcon: { fontSize: 15, color: COLORS.forest },
  etaBadge: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: RADIUS.md, padding: 8, alignItems: 'center' },
  etaText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  fullscreenContainer: { flex: 1, backgroundColor: '#D8E8C8' },
  fullscreenMap: { flex: 1, backgroundColor: 'transparent' },
  closeButton: {
    position: 'absolute', right: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  closeIcon: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  etaBadgeFullscreen: { left: 16, right: 16 },
});
