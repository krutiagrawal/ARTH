// Every native map library this app has tried (react-native-maps, @maplibre/maplibre-react-native)
// turned out to require a native module Expo Go on this SDK doesn't bundle — see
// plant_mobile_expo_go_setup project notes. `react-native-webview` IS a genuinely
// Expo-Go-bundled module (confirmed in node_modules/expo/bundledNativeModules.json), so the
// delivery-tracking maps render a real Leaflet/OpenStreetMap page inside a WebView instead of
// using any native map component. No API key or billing needed (same OSM tiles as before).

import { MAP_ICON_BASE64 } from '../assets/mapIconBase64';

// The app's cute plant-pot mascot (references/map_icon.png), no background/circle behind it —
// just the character over the map tiles, matching the reference art's own transparent PNG.
export const SAPLING_ICON_HTML = (size: number) => `
  <img src="data:image/png;base64,${MAP_ICON_BASE64}" style="width:${size}px;height:${size}px;
    display:block;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.35));" />
`;

export const DESTINATION_ICON_HTML = `
  <div style="width:32px;height:32px;border-radius:16px;background:#fff;
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 4px rgba(0,0,0,0.2);">
    <span style="font-size:16px;">🏠</span>
  </div>
`;

export function buildLeafletHtml(bodyScript: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #D8E8C8; }
    .leaflet-control-attribution { font-size: 8px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>${bodyScript}</script>
</body>
</html>`;
}
