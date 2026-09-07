import 'react-native-gesture-handler';
import './global.css';
import React, { Suspense } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
// Per-face subpath imports, not the package roots. Importing from the root pulls that package's
// index, which requires every .ttf it ships — including all the italics we never use — and Metro
// then bundles ~1.8 MB of dead font data.
import { Baloo2_500Medium } from '@expo-google-fonts/baloo-2/500Medium';
import { Baloo2_600SemiBold } from '@expo-google-fonts/baloo-2/600SemiBold';
import { Baloo2_700Bold } from '@expo-google-fonts/baloo-2/700Bold';
import { Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2/800ExtraBold';
import { NunitoSans_200ExtraLight } from '@expo-google-fonts/nunito-sans/200ExtraLight';
import { NunitoSans_300Light } from '@expo-google-fonts/nunito-sans/300Light';
import { NunitoSans_400Regular } from '@expo-google-fonts/nunito-sans/400Regular';
import { NunitoSans_500Medium } from '@expo-google-fonts/nunito-sans/500Medium';
import { NunitoSans_600SemiBold } from '@expo-google-fonts/nunito-sans/600SemiBold';
import { NunitoSans_700Bold } from '@expo-google-fonts/nunito-sans/700Bold';
import { NunitoSans_800ExtraBold } from '@expo-google-fonts/nunito-sans/800ExtraBold';
import { NunitoSans_900Black } from '@expo-google-fonts/nunito-sans/900Black';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SoundProvider } from './src/context/SoundContext';
import { AuthProvider } from './src/context/AuthContext';
import { ReduceMotionProvider } from './src/context/ReduceMotionContext';
import { ConfirmDialogProvider } from './src/context/ConfirmDialogContext';
import { COLORS } from './src/constants/colors';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// @stripe/stripe-react-native ships native code Expo Go doesn't include — even just
// importing the module (never mind rendering it) throws immediately there. Loaded
// lazily and behind an error boundary, mirroring AppNavigator's MapScreen/
// MapErrorBoundary pattern for the same class of problem, so the rest of the app
// still boots in Expo Go; only the donate flow needs a real dev client.
const LazyStripeProvider = React.lazy(() =>
  import('@stripe/stripe-react-native').then((m) => ({ default: m.StripeProvider }))
);

class StripeErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function AppProviders({ children }: { children: React.ReactNode }) {
  // Renders without StripeProvider until a publishable key is configured — and even
  // then, falls back to plain children if the native module can't load — so the rest
  // of the app (unrelated to donations) still boots regardless of Stripe's state.
  if (!STRIPE_PUBLISHABLE_KEY) return <>{children}</>;
  return (
    <StripeErrorBoundary fallback={<>{children}</>}>
      <Suspense fallback={<>{children}</>}>
        {/* Wrapped in a fragment: StripeProvider types its children as ReactElement, not ReactNode. */}
        <LazyStripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}><>{children}</></LazyStripeProvider>
      </Suspense>
    </StripeErrorBoundary>
  );
}

/** Every face AppText can map a weight onto, plus the four Baloo 2 display faces.
 * All of them must be registered up front: a weight whose face isn't loaded silently falls back
 * to the system font, which shows up as one stray paragraph in the wrong typeface. */
const FONT_MAP = {
  Baloo2_500Medium,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
  NunitoSans_200ExtraLight,
  NunitoSans_300Light,
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
  NunitoSans_900Black,
};

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_MAP);

  // A font failure must not brick the app — log it and render in the system face instead.
  if (fontError) console.warn('[App] font loading failed, falling back to system fonts:', fontError);

  // No expo-splash-screen in this project, so hold on a plain cream field rather than letting
  // the whole UI paint once in Roboto/SF and then reflow into Nunito.
  if (!fontsLoaded && !fontError) {
    return <View style={[styles.root, styles.bootScreen]} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ReduceMotionProvider>
            <ConfirmDialogProvider>
              <AuthProvider>
                <SoundProvider>
                  <AppProviders>
                    <AppNavigator />
                  </AppProviders>
                </SoundProvider>
              </AuthProvider>
            </ConfirmDialogProvider>
          </ReduceMotionProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bootScreen: {
    backgroundColor: COLORS.cream,
  },
});
