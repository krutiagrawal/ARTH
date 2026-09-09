import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWeatherScene, type WeatherScene } from '../services/weatherService';

export type SoundKey = 'woof' | 'friendAccepted';

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
  friendAccepted: 0.7,
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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const SRC_FRIEND_ACCEPTED = (() => { try { return require('../../assets/sounds/friend_accepted.wav'); } catch { return null; } })();

const ONE_SHOT_SRC: Record<SoundKey, any> = {
  woof: SRC_WOOF,
  friendAccepted: SRC_FRIEND_ACCEPTED,
};

function makeLoop(src: any, volume: number, muted: boolean): AudioPlayer | null {
  if (!src) return null;
  try {
    const player = createAudioPlayer(src);
    player.loop = true;
    player.volume = muted ? 0 : volume;
    if (!muted) player.play();
    return player;
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

  const birdsRef = useRef<AudioPlayer | null>(null);
  const pianoRef = useRef<AudioPlayer | null>(null);
  const rainRef  = useRef<AudioPlayer | null>(null);
  // One-shot effect players (woof, friendAccepted, ...), lazily created and reused per key.
  const oneShotRefs = useRef<Partial<Record<SoundKey, AudioPlayer>>>({});

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      // Restore mute preference first
      const stored = await AsyncStorage.getItem(MUTE_KEY);
      const muted = stored === 'true';
      if (mounted) { setIsMuted(muted); isMutedRef.current = muted; }

      // Configure audio session before any playback
      await setAudioModeAsync({
        allowsRecording: false,
        shouldPlayInBackground: false,
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });

      if (!mounted) return;

      // Start birds + piano immediately
      birdsRef.current = makeLoop(SRC_BIRDS, VOL.birds_sunny, muted);
      pianoRef.current = makeLoop(SRC_PIANO, VOL.piano, muted);

      // Weather check in background — adds rain if needed
      getWeatherScene().then(async (scene) => {
        if (!mounted) return;
        sceneRef.current = scene;
        if (scene !== 'rainy') return;

        if (!isMutedRef.current && birdsRef.current) {
          birdsRef.current.volume = VOL.birds_rainy;
        }
        rainRef.current = makeLoop(SRC_RAIN, 0, isMutedRef.current);
        if (rainRef.current && !isMutedRef.current) {
          let vol = 0;
          const step = VOL.rain / 20;
          const id = setInterval(() => {
            vol = Math.min(vol + step, VOL.rain);
            if (rainRef.current) rainRef.current.volume = vol;
            if (vol >= VOL.rain) clearInterval(id);
          }, 100);
        }
      }).catch(() => {});
    };

    setup();

    return () => {
      mounted = false;
      birdsRef.current?.remove();
      pianoRef.current?.remove();
      rainRef.current?.remove();
      for (const player of Object.values(oneShotRefs.current)) player?.remove();
    };
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      isMutedRef.current = next;
      AsyncStorage.setItem(MUTE_KEY, String(next));

      const birdVol = sceneRef.current === 'rainy' ? VOL.birds_rainy : VOL.birds_sunny;
      if (next) {
        if (birdsRef.current) birdsRef.current.volume = 0;
        if (pianoRef.current) pianoRef.current.volume = 0;
        if (rainRef.current) rainRef.current.volume = 0;
        birdsRef.current?.pause();
        pianoRef.current?.pause();
        rainRef.current?.pause();
      } else {
        if (birdsRef.current) birdsRef.current.volume = birdVol;
        if (pianoRef.current) pianoRef.current.volume = VOL.piano;
        if (sceneRef.current === 'rainy' && rainRef.current) rainRef.current.volume = VOL.rain;
        birdsRef.current?.play();
        pianoRef.current?.play();
        if (sceneRef.current === 'rainy') rainRef.current?.play();
      }
      return next;
    });
  }, []);

  const playSound = useCallback(async (key: SoundKey) => {
    const src = ONE_SHOT_SRC[key];
    if (isMutedRef.current || !src) return;
    try {
      let player = oneShotRefs.current[key];
      if (!player) {
        player = createAudioPlayer(src);
        player.volume = VOL[key];
        oneShotRefs.current[key] = player;
      }
      player.pause();
      await player.seekTo(0);
      player.play();
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
