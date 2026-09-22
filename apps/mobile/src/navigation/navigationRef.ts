import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './AppNavigator';

// Split out of AppNavigator.tsx so usePushRegistration (which needs this ref to route tapped
// push notifications) doesn't have to import AppNavigator itself — that was a require cycle,
// since AppNavigator also calls usePushRegistration(). RootStackParamList is a type-only import
// here, so it's erased at compile time and doesn't reintroduce the cycle at runtime.
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
