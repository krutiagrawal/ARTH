import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { buildLeafletHtml } from '../../utils/leafletMapHtml';

export interface LeafletPin {
  id: string;
  lat: number;
  lng: number;
  emoji: string;
  /** Bubble background; defaults to white. */
  bg?: string;
  /** Bubble outline colour. */
  border?: string;
  selected?: boolean;
}

export interface LeafletCircle {
  id: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  fill: string;
  stroke: string;
}

export interface LeafletPinMapHandle {
  /** bounds = [west, south, east, north], matching MapLibre's CameraRef.fitBounds. */
  fitBounds: (bounds: [number, number, number, number], options?: unknown) => void;
  /** center = [lng, lat]; zoom uses MapLibre's scale (converted internally). */
  flyTo: (options: { center: [number, number]; zoom?: number; duration?: number }) => void;
}

interface Props {
  pins: LeafletPin[];
  circles: LeafletCircle[];
  user: { lat: number; lng: number } | null;
  initialCenter: [number, number];
  initialZoom: number;
  onPinPress: (id: string) => void;
}

/**
 * Leaflet/OSM-in-a-WebView stand-in for the native MapLibre map, used where that native module is
 * not in the installed binary (Expo Go). Same idea as DeliveryTrackingMap: the page is built once
 * and all later changes go through injectJavaScript so the map never reloads.
 */
export const LeafletPinMap = forwardRef<LeafletPinMapHandle, Props>(function LeafletPinMap(
  { pins, circles, user, initialCenter, initialZoom, onPinPress },
  ref,
) {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const onPinPressRef = useRef(onPinPress);
  onPinPressRef.current = onPinPress;

  const [html] = useState(() =>
    buildLeafletHtml(`
      var map = L.map('map', { zoomControl: false }).setView([${initialCenter[1]}, ${initialCenter[0]}], ${initialZoom + 1});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
      var layerGroup = L.layerGroup().addTo(map);
      var meMarker = null;
      function pinIcon(p) {
        var scale = p.selected ? 1.25 : 1;
        var html = '<div style="transform:scale(' + scale + ');transform-origin:bottom center;display:flex;flex-direction:column;align-items:center;">' +
          '<div style="width:38px;height:38px;border-radius:19px;background:' + (p.bg || '#fff') + ';border:2px solid ' + (p.border || 'rgba(0,0,0,0.15)') + ';display:flex;align-items:center;justify-content:center;font-size:19px;box-shadow:0 2px 4px rgba(0,0,0,0.25);">' + p.emoji + '</div>' +
          '<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ' + (p.bg || '#fff') + ';margin-top:-1px;"></div></div>';
        return L.divIcon({ html: html, className: '', iconSize: [38, 48], iconAnchor: [19, 48] });
      }
      function setData(data) {
        layerGroup.clearLayers();
        data.circles.forEach(function (c) {
          L.circle([c.lat, c.lng], { radius: c.radiusMeters, color: c.stroke, fillColor: c.fill, fillOpacity: 1, weight: 1.5, interactive: false }).addTo(layerGroup);
        });
        data.pins.forEach(function (p) {
          var m = L.marker([p.lat, p.lng], { icon: pinIcon(p) }).addTo(layerGroup);
          m.on('click', function () { window.ReactNativeWebView.postMessage(p.id); });
        });
        if (data.user) {
          var icon = L.divIcon({ html: '<div style="width:18px;height:18px;border-radius:9px;background:#2F80ED;border:3px solid #fff;box-shadow:0 0 0 2px rgba(47,128,237,0.4)"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] });
          if (!meMarker) { meMarker = L.marker([data.user.lat, data.user.lng], { icon: icon, interactive: false }).addTo(map); }
          else { meMarker.setLatLng([data.user.lat, data.user.lng]); }
        }
      }
    `),
  );

  useEffect(() => {
    if (!ready) return;
    webviewRef.current?.injectJavaScript(`setData(${JSON.stringify({ pins, circles, user })}); true;`);
  }, [ready, pins, circles, user]);

  useImperativeHandle(
    ref,
    () => ({
      fitBounds: ([w, s, e, n]) => {
        webviewRef.current?.injectJavaScript(
          `map.fitBounds([[${s}, ${w}], [${n}, ${e}]], { padding: [60, 120], maxZoom: 15 }); true;`,
        );
      },
      flyTo: ({ center, zoom }) => {
        webviewRef.current?.injectJavaScript(
          `map.flyTo([${center[1]}, ${center[0]}], ${zoom != null ? zoom + 1 : 'map.getZoom()'}); true;`,
        );
      },
    }),
    [],
  );

  const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    onPinPressRef.current(event.nativeEvent.data);
  }, []);

  return (
    <WebView
      ref={webviewRef}
      originWhitelist={['*']}
      source={{ html }}
      style={StyleSheet.absoluteFill}
      scrollEnabled={false}
      javaScriptEnabled
      domStorageEnabled
      onLoadEnd={() => setReady(true)}
      onMessage={onMessage}
    />
  );
});
