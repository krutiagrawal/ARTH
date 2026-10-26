import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type { ApiLiveFleet } from '../../api/deliveryPartners';
import { buildLeafletHtml } from '../../utils/leafletMapHtml';

const PUNE: [number, number] = [18.5204, 73.8567];

/**
 * Nursery-side live map: every rider currently on a delivery, plus the nursery and the
 * destinations of the selected rider's orders. Same Leaflet/OSM-in-a-WebView approach as
 * DeliveryTrackingMap (see leafletMapHtml.ts) and the same rule: the HTML is built once and every
 * later update goes through injectJavaScript, since changing `source.html` reloads the page.
 * Lazy-load this module (see NurseryLiveMapScreen.tsx) to keep the WebView out of the eager graph.
 */
export function LiveFleetMap({
  fleet,
  selectedId,
  onSelectRider,
}: {
  fleet: ApiLiveFleet | undefined;
  selectedId: string | null;
  onSelectRider: (partnerId: string) => void;
}) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [html] = useState(() =>
    buildLeafletHtml(`
      var map = L.map('map', { zoomControl: false }).setView([${PUNE[0]}, ${PUNE[1]}], 12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      var nurseryMarker = null;
      var riderMarkers = {};
      var destLayer = L.layerGroup().addTo(map);
      var routeLine = null;
      var fitted = false;
      function pin(emoji, bg, label) {
        return L.divIcon({
          className: '',
          iconSize: [64, 52],
          iconAnchor: [32, 26],
          html: '<div style="display:flex;flex-direction:column;align-items:center;">' +
            '<div style="width:34px;height:34px;border-radius:17px;background:' + bg + ';display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 5px rgba(0,0,0,0.35);border:2px solid #fff;">' + emoji + '</div>' +
            (label ? '<div style="margin-top:2px;max-width:70px;padding:1px 5px;border-radius:8px;background:rgba(255,255,255,0.92);font:700 10px sans-serif;color:#2D5A27;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + label + '</div>' : '') +
            '</div>'
        });
      }
      function post(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }
      function update(data, selectedId) {
        var pts = [];
        if (data.nursery && data.nursery.lat != null) {
          var np = [data.nursery.lat, data.nursery.lng];
          pts.push(np);
          if (!nurseryMarker) nurseryMarker = L.marker(np, { icon: pin('🌿', '#87A878', data.nursery.name) }).addTo(map);
          else nurseryMarker.setLatLng(np);
        }
        var seen = {};
        destLayer.clearLayers();
        if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
        data.riders.forEach(function (r) {
          var selected = r.partnerId === selectedId;
          if (r.lat != null) {
            seen[r.partnerId] = true;
            var rp = [r.lat, r.lng];
            pts.push(rp);
            var icon = pin('🛵', selected ? '#D4A853' : '#4A90D9', r.name.split(' ')[0]);
            var m = riderMarkers[r.partnerId];
            if (!m) {
              m = L.marker(rp, { icon: icon, zIndexOffset: 500 }).addTo(map);
              m.on('click', function () { post({ type: 'select', id: r.partnerId }); });
              riderMarkers[r.partnerId] = m;
            } else { m.setLatLng(rp); m.setIcon(icon); }
          }
          if (selected) {
            r.orders.forEach(function (o) {
              var d = o.destination;
              if (d && d.lat != null) {
                var dp = [d.lat, d.lng];
                pts.push(dp);
                L.marker(dp, { icon: pin('🏠', '#E8896A', o.customerName.split(' ')[0]) }).addTo(destLayer);
                if (r.lat != null) {
                  L.polyline([[r.lat, r.lng], dp], { color: '#D4A853', weight: 3, dashArray: '6 8' }).addTo(destLayer);
                }
              }
            });
          }
        });
        Object.keys(riderMarkers).forEach(function (id) {
          if (!seen[id]) { map.removeLayer(riderMarkers[id]); delete riderMarkers[id]; }
        });
        if (pts.length && (!fitted || window.__refit)) {
          map.fitBounds(pts, { padding: [50, 50], maxZoom: 16 });
          fitted = true; window.__refit = false;
        }
      }
      function focusRider(id) {
        var m = riderMarkers[id];
        if (m) map.flyTo(m.getLatLng(), 16, { duration: 0.8 });
      }
      function refit() { window.__refit = true; }
      post({ type: 'ready' });
    `),
  );

  useEffect(() => {
    if (!ready || !fleet) return;
    ref.current?.injectJavaScript(`update(${JSON.stringify(fleet)}, ${JSON.stringify(selectedId)}); true;`);
  }, [ready, fleet, selectedId]);

  useEffect(() => {
    if (!ready || !selectedId) return;
    ref.current?.injectJavaScript(`focusRider(${JSON.stringify(selectedId)}); true;`);
  }, [ready, selectedId]);

  return (
    <WebView
      ref={ref}
      originWhitelist={['*']}
      source={{ html }}
      style={styles.map}
      javaScriptEnabled
      domStorageEnabled
      onMessage={(e) => {
        try {
          const msg = JSON.parse(e.nativeEvent.data);
          if (msg.type === 'ready') setReady(true);
          else if (msg.type === 'select') onSelectRider(msg.id);
        } catch {
          /* ignore malformed messages */
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: 'transparent' },
});
