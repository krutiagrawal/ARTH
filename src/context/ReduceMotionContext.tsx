import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Reduce Motion is layered: the OS-level "Reduce Motion" accessibility setting is the
 * default, and a local in-app Settings toggle can force it on regardless of the OS setting
 * (but never forces it back off if the OS has it on — the OS preference always wins when set).
 * This is a pure client-side preference, deliberately not routed through the backend
 * ApiUserSettings schema (mirrors the local-persistence pattern SoundContext.tsx uses for mute).
 */

const OVERRIDE_KEY = 'arth_reduce_motion_override';

interface ReduceMotionContextValue {
  reduceMotion: boolean;
  /** true = force on, false = force off (only relevant when OS setting is off), null = follow OS only */
  override: boolean | null;
  setOverride: (value: boolean | null) => void;
}

const ReduceMotionContext = createContext<ReduceMotionContextValue>({
  reduceMotion: false,
  override: null,
  setOverride: () => {},
});

export function ReduceMotionProvider({ children }: { children: React.ReactNode }) {
  const [osReduceMotion, setOsReduceMotion] = useState(false);
  const [override, setOverrideState] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setOsReduceMotion(value);
    });

    AsyncStorage.getItem(OVERRIDE_KEY).then(stored => {
      if (!mounted || stored == null) return;
      setOverrideState(stored === 'true' ? true : stored === 'false' ? false : null);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setOsReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const setOverride = useCallback((value: boolean | null) => {
    setOverrideState(value);
    AsyncStorage.setItem(OVERRIDE_KEY, value === null ? '' : String(value));
  }, []);

  const reduceMotion = override !== null ? override : osReduceMotion;

  return (
    <ReduceMotionContext.Provider value={{ reduceMotion, override, setOverride }}>
      {children}
    </ReduceMotionContext.Provider>
  );
}

export function useReduceMotionContext() {
  return useContext(ReduceMotionContext);
}
