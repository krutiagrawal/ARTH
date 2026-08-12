import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeatherScene, type WeatherScene } from '../services/weatherService';

export type SoundKey = 'woof';

interface SoundContextValue {
  isMuted: boolean;
  toggleMute: () => void;
  playSound: (key: SoundKey) => Promise<void>;
  startAmbient: (..._args: any[]) => Promise<void>;
  stopAmbient: () => Promise<void>;
}

const MUTE_KEY = 'plant_muted';

const VOL = {
  birds_sunny: 0.22,
  birds_rainy: 0.12,
  piano: 0.18,
  rain: 0.28,
  woof: 0.65,
};

// Resolve at module level so Metro's static analyser always bundles these assets.
// Individual try/catch means a missing file is silently skipped.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SRC_BIRDS = (() => { try { return require('../../assets/sounds/birds_ambient.mp3'); } catch { return null; } })();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SRC_PIANO = (() => { try { return require('../../assets/sounds/piano_ambient.mp3'); } catch { return null; } })();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SRC_RAIN  = (() => { try { return require('../../assets/sounds/light_rain.mp3');    } catch { return null; } })();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SRC_WOOF  = (() => { try { return require('../../assets/sounds/woof_bark.mp3');     } catch { return null; } })();

async function makeLoop(src: any, volume: number, muted: boolean): Promise<Audio.Sound | null> {
  if (!src) return null;
  try {
    const { sound } = await Audio.Sound.createAsync(src, {
      shouldPlay: !muted,
      isLooping: true,
      volume: muted ? 0 : volume,
    });
    return sound;
  } catch { return null; }
}

const SoundContext = createContext<SoundContextValue>({
  isMuted: false,
  toggleMute: () => {},
  playSound: async () => {},
  startAmbient: async () => {},
  stopAmbient: async () => {},
});

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const sceneRef = useRef<WeatherScene>('sunny');

  const birdsRef = useRef<Audio.Sound | null>(null);
  const pianoRef = useRef<Audio.Sound | null>(null);
  const rainRef  = useRef<Audio.Sound | null>(null);
  const woofRef  = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      // Restore mute preference first
      const stored = await AsyncStorage.getItem(MUTE_KEY);
      const muted = stored === 'true';
      if (mounted) { setIsMuted(muted); isMutedRef.current = muted; }

      // Configure audio session before any playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      if (!mounted) return;

      // Start birds + piano immediately
      birdsRef.current = await makeLoop(SRC_BIRDS, VOL.birds_sunny, muted);
      pianoRef.current = await makeLoop(SRC_PIANO, VOL.piano, muted);

      // Weather check in background — adds rain if needed
      getWeatherScene().then(async (scene) => {
        if (!mounted) return;
        sceneRef.current = scene;
        if (scene !== 'rainy') return;

        if (!isMutedRef.current) {
          await birdsRef.current?.setVolumeAsync(VOL.birds_rainy);
        }
        rainRef.current = await makeLoop(SRC_RAIN, 0, isMutedRef.current);
        if (rainRef.current && !isMutedRef.current) {
          let vol = 0;
          const step = VOL.rain / 20;
          const id = setInterval(async () => {
            vol = Math.min(vol + step, VOL.rain);
            await rainRef.current?.setVolumeAsync(vol);
            if (vol >= VOL.rain) clearInterval(id);
          }, 100);
        }
      }).catch(() => {});
    };

    setup();

    return () => {
      mounted = false;
      birdsRef.current?.unloadAsync();
      pianoRef.current?.unloadAsync();
      rainRef.current?.unloadAsync();
      woofRef.current?.unloadAsync();
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      AsyncStorage.setItem(MUTE_KEY, String(next));

      const birdVol = sceneRef.current === 'rainy' ? VOL.birds_rainy : VOL.birds_sunny;
      if (next) {
        birdsRef.current?.setVolumeAsync(0);
        pianoRef.current?.setVolumeAsync(0);
        rainRef.current?.setVolumeAsync(0);
        birdsRef.current?.pauseAsync();
        pianoRef.current?.pauseAsync();
        rainRef.current?.pauseAsync();
      } else {
        birdsRef.current?.setVolumeAsync(birdVol);
        pianoRef.current?.setVolumeAsync(VOL.piano);
        if (sceneRef.current === 'rainy') rainRef.current?.setVolumeAsync(VOL.rain);
        birdsRef.current?.playAsync();
        pianoRef.current?.playAsync();
        if (sceneRef.current === 'rainy') rainRef.current?.playAsync();
      }
      return next;
    });
  }, []);

  const playSound = useCallback(async (_key: SoundKey) => {
    if (isMutedRef.current || !SRC_WOOF) return;
    try {
      if (!woofRef.current) {
        const { sound } = await Audio.Sound.createAsync(SRC_WOOF, {
          shouldPlay: false, isLooping: false, volume: VOL.woof,
        });
        woofRef.current = sound;
      }
      await woofRef.current.stopAsync();
      await woofRef.current.setPositionAsync(0);
      await woofRef.current.playAsync();
    } catch {}
  }, []);

  const startAmbient = useCallback(async (..._args: any[]) => {}, []);
  const stopAmbient  = useCallback(async () => {}, []);

  return (
    <SoundContext.Provider value={{ isMuted, toggleMute, playSound, startAmbient, stopAmbient }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundContext() {
  return useContext(SoundContext);
}
