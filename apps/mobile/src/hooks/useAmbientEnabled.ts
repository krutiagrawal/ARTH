import { useSettings } from './useApiQueries';

/** Saved "Ambient Mode" setting (Settings > Experience): birds, fireflies and floating particles. */
export function useAmbientEnabled(): boolean {
  const { data: settings } = useSettings();
  return settings?.ambientMode ?? true;
}
