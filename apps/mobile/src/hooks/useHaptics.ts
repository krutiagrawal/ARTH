import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

let hapticsEnabled = true;

/** Driven by the saved "Haptic Feedback" setting (see SettingsSync). */
export function setHapticsEnabled(enabled: boolean) {
  hapticsEnabled = enabled;
}

export function useHaptics() {
  const light = useCallback(() => {
    if (!hapticsEnabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (_) {}
  }, []);

  const medium = useCallback(() => {
    if (!hapticsEnabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
  }, []);

  const heavy = useCallback(() => {
    if (!hapticsEnabled) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (_) {}
  }, []);

  const success = useCallback(() => {
    if (!hapticsEnabled) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  }, []);

  const warning = useCallback(() => {
    if (!hapticsEnabled) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (_) {}
  }, []);

  const error = useCallback(() => {
    if (!hapticsEnabled) return;
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch (_) {}
  }, []);

  const selection = useCallback(() => {
    if (!hapticsEnabled) return;
    try {
      Haptics.selectionAsync();
    } catch (_) {}
  }, []);

  return { light, medium, heavy, success, warning, error, selection };
}
