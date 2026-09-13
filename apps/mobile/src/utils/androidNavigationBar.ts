import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';

// This SDK's expo-navigation-bar dropped setBackgroundColorAsync/setButtonStyleAsync entirely —
// Android is edge-to-edge by default now and the nav bar background is always transparent,
// controlled by the OS, not the app. Only the icon/button contrast style is still app-settable
// (NavigationBar.setStyle), and even that has no visible effect in classic Expo Go: it requires
// the `expo-navigation-bar` config plugin's `enforceContrast: false` option, which — like every
// other config-plugin change in this project — only takes effect in a prebuilt dev-client/EAS
// build, never in Expo Go. Call this anyway (harmless where it's a no-op) so it's already correct
// once/if this project moves to a dev-client build.
export function syncAndroidNavigationBarStyle(style: 'light' | 'dark') {
  if (Platform.OS !== 'android') return;
  try {
    NavigationBar.setStyle(style);
  } catch {}
}
