import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';

/**
 * The delivery-tracking maps render inside a WebView (react-native-webview, a genuinely
 * Expo-Go-bundled module — see leafletMapHtml.ts for why no native map library is used). This
 * boundary is a defensive fallback for the WebView itself failing to load (e.g. no network
 * reaching the OSM tiles/Leaflet CDN). Wrap every map-rendering component reachable from
 * AppNavigator's eager screen graph in this, paired with a `React.lazy()` import of that
 * component, so a failure degrades to this message instead of crashing the screen.
 */
export class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; message?: string },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>
            {this.props.message ?? "Live map isn't available right now. Check your connection and try again."}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    padding: 16,
    borderRadius: RADIUS.lg,
    backgroundColor: 'rgba(94,133,80,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  fallbackText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
});
