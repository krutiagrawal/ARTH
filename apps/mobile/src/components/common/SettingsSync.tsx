import { useEffect } from 'react';
import { useSettings } from '../../hooks/useApiQueries';
import { setHapticsEnabled } from '../../hooks/useHaptics';

/** Pushes saved Experience settings into module-level flags (renders nothing). */
export function SettingsSync() {
  const { data: settings } = useSettings();
  const haptics = settings?.haptics ?? true;
  useEffect(() => {
    setHapticsEnabled(haptics);
  }, [haptics]);
  return null;
}
