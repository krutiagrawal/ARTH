import { useSoundContext, type SoundKey } from '../context/SoundContext';

export function useSoundSystem() {
  return useSoundContext();
}

export type { SoundKey };
