import 'react-native-gesture-handler';
import './global.css';
import React, { Suspense } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SoundProvider } from './src/context/SoundContext';
import { AuthProvider } from './src/context/AuthContext';
import { ReduceMotionProvider } from './src/context/ReduceMotionContext';

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
        <LazyStripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>{children}</LazyStripeProvider>
      </Suspense>
    </StripeErrorBoundary>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <ReduceMotionProvider>
          <AuthProvider>
            <SoundProvider>
              <AppProviders>
                <AppNavigator />
              </AppProviders>
            </SoundProvider>
          </AuthProvider>
        </ReduceMotionProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
