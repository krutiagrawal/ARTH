import 'react-native-gesture-handler';
import './global.css';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SoundProvider } from './src/context/SoundContext';
import { AuthProvider } from './src/context/AuthContext';
import { ReduceMotionProvider } from './src/context/ReduceMotionContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <ReduceMotionProvider>
          <AuthProvider>
            <SoundProvider>
              <AppNavigator />
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
