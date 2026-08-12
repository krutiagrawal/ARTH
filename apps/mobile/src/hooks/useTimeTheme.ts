import { useState, useEffect } from 'react';
import type { ImageSourcePropType } from 'react-native';

export type TimePeriod =
  | 'dawn'
  | 'morning'
  | 'afternoon'
  | 'goldenHour'
  | 'sunset'
  | 'blueHour'
  | 'night'
  | 'lateNight';

export type MascotOutfit = 'day' | 'windingUp' | 'night';

export interface TimeTheme {
  period: TimePeriod;
  hour: number; // decimal hour, e.g. 6.5 = 6:30am
  label: string;
  greeting: string;
  emoji: string;
  // Sky
  skyColors: string[];
  horizonColors: string[];
  groundColors: string[];
  // Celestial
  celestial: 'sun' | 'moon' | 'none';
  celestialY: number;   // 0=top 1=bottom of sky area
  celestialColor: string;
  glowColor: string;
  glowRadius: number;
  // Stars
  hasStars: boolean;
  starOpacity: number;
  starColor: string;
  // Clouds
  hasClouds: boolean;
  cloudColor: string;
  // Atmosphere
  fogColor: string;
  hasFog: boolean;
  // Particles
  particleType: 'leaf' | 'dust' | 'petal' | 'firefly';
  particleOpacity: number;
  // Mascot
  mascotOutfit: MascotOutfit;
  // UI (text sitting directly on the sky background)
  textOnSky: string;
  cardTint: 'light' | 'dark';
  statusBarStyle: 'light' | 'dark';
  warmth: number; // 0 (cold/night) to 1 (warm/golden)
  // Card tinting (text/backgrounds for surfaces sitting ON a themed card)
  cardBackground: string;
  cardBackgroundAlt: string;
  cardBorder: string;
  textPrimaryOnCard: string;
  textSecondaryOnCard: string;
  accentColor: string;
  accentColorSoft: string;
  // Hero landscape (ForestHeroCanvas fallback, used when heroImage is null)
  hillColors: [string, string, string]; // far, mid, near
  lakeColors: [string, string];
  lakeHighlight: string;
  treeSilhouetteColor: string;
  /** A real hand-illustrated background for this period, when one exists — takes priority over
   * the Skia-drawn ForestHeroCanvas fallback. `null` until an image is provided for that period. */
  heroImage: ImageSourcePropType | null;
}

function getThemeForHour(hour: number): TimeTheme {
  // Dawn: 5:30–7:00
  if (hour >= 5.5 && hour < 7) {
    return {
      period: 'dawn',
      hour,
      label: 'Dawn',
      greeting: 'Rise & grow',
      emoji: '🌄',
      skyColors: ['#B8A4FF', '#EADDFF', '#FFD6E7', '#FFE7B5'],
      horizonColors: ['#FFE7B5', '#FFCC80'],
      groundColors: ['#D9B8E8', '#F0C8D8'],
      celestial: 'sun',
      celestialY: 0.85,
      celestialColor: '#FFCC80',
      glowColor: 'rgba(255,204,128,0.45)',
      glowRadius: 75,
      hasStars: false,
      starOpacity: 0,
      starColor: '#FFFFFF',
      hasClouds: true,
      cloudColor: '#FFFFFF',
      fogColor: 'rgba(234,221,255,0.15)',
      hasFog: true,
      particleType: 'dust',
      particleOpacity: 0.5,
      mascotOutfit: 'day',
      textOnSky: '#4A3B6B',
      cardTint: 'light',
      statusBarStyle: 'dark',
      warmth: 0.55,
      cardBackground: '#F6F0FF',
      cardBackgroundAlt: '#FFD6E7',
      cardBorder: 'rgba(125,107,255,0.28)',
      textPrimaryOnCard: '#4A3B6B',
      textSecondaryOnCard: 'rgba(74,59,107,0.65)',
      accentColor: '#7D6BFF',
      accentColorSoft: 'rgba(125,107,255,0.15)',
      hillColors: ['#B8A4FF', '#D9B8E8', '#F0C8D8'],
      lakeColors: ['#EADDFF', '#FFD6E7'],
      lakeHighlight: 'rgba(255,255,255,0.55)',
      treeSilhouetteColor: '#6B5A8E',
      heroImage: require('../../assets/illustrations/dawn.png'),
    };
  }
  // Morning: 7:00–10:00
  if (hour >= 7 && hour < 10) {
    return {
      period: 'morning',
      hour,
      label: 'Morning',
      greeting: 'Good morning',
      emoji: '🌤️',
      skyColors: ['#8ED1FF', '#BEEAFE', '#DFF6FF'],
      horizonColors: ['#FFF8D6', '#FFECB3'],
      groundColors: ['#81C784', '#4DB6AC'],
      celestial: 'sun',
      celestialY: 0.30,
      celestialColor: '#FFD166',
      glowColor: 'rgba(255,209,102,0.35)',
      glowRadius: 60,
      hasStars: false,
      starOpacity: 0,
      starColor: '#FFFFFF',
      hasClouds: true,
      cloudColor: '#FFFFFF',
      fogColor: 'rgba(255,255,255,0.08)',
      hasFog: false,
      particleType: 'leaf',
      particleOpacity: 0.7,
      mascotOutfit: 'day',
      textOnSky: '#1D5A4A',
      cardTint: 'light',
      statusBarStyle: 'dark',
      warmth: 0.5,
      cardBackground: '#FFFFFF',
      cardBackgroundAlt: '#D6F5E3',
      cardBorder: 'rgba(77,182,172,0.28)',
      textPrimaryOnCard: '#1D5A4A',
      textSecondaryOnCard: 'rgba(29,90,74,0.6)',
      accentColor: '#4DB6AC',
      accentColorSoft: 'rgba(77,182,172,0.15)',
      hillColors: ['#B8E0C4', '#81C784', '#4DB6AC'],
      lakeColors: ['#8ED1FF', '#DFF6FF'],
      lakeHighlight: 'rgba(255,255,255,0.6)',
      treeSilhouetteColor: '#2E7D63',
      heroImage: require('../../assets/illustrations/morning.png'),
    };
  }
  // Afternoon: 10:00–15:00 (3:00pm)
  if (hour >= 10 && hour < 15) {
    return {
      period: 'afternoon',
      hour,
      label: 'Afternoon',
      greeting: 'Good afternoon',
      emoji: '☀️',
      skyColors: ['#BDE8FF', '#E1F6FE', '#FFFFFF'],
      horizonColors: ['#FFF7C2', '#FFF1B8'],
      groundColors: ['#A8E1B0', '#67C48C'],
      celestial: 'sun',
      celestialY: 0.08,
      celestialColor: '#FFD65E',
      glowColor: 'rgba(255,214,94,0.35)',
      glowRadius: 60,
      hasStars: false,
      starOpacity: 0,
      starColor: '#FFFFFF',
      hasClouds: true,
      cloudColor: '#FFFFFF',
      fogColor: 'rgba(255,255,200,0.06)',
      hasFog: true,
      particleType: 'dust',
      particleOpacity: 0.5,
      mascotOutfit: 'day',
      textOnSky: '#1B5E3F',
      cardTint: 'light',
      statusBarStyle: 'dark',
      warmth: 0.65,
      cardBackground: '#FFFFFF',
      cardBackgroundAlt: '#D8F1D6',
      cardBorder: 'rgba(103,196,140,0.28)',
      textPrimaryOnCard: '#1B5E3F',
      textSecondaryOnCard: 'rgba(27,94,63,0.6)',
      accentColor: '#67C48C',
      accentColorSoft: 'rgba(103,196,140,0.15)',
      hillColors: ['#D8F1D6', '#A8E1B0', '#67C48C'],
      lakeColors: ['#BDE8FF', '#FFFFFF'],
      lakeHighlight: 'rgba(255,255,255,0.65)',
      treeSilhouetteColor: '#2E7D53',
      heroImage: require('../../assets/illustrations/afternoon.png'),
    };
  }
  // Golden Hour: 15:00–17:30
  if (hour >= 15 && hour < 17.5) {
    return {
      period: 'goldenHour',
      hour,
      label: 'Golden Hour',
      greeting: 'Golden hour',
      emoji: '🌇',
      skyColors: ['#FFE59B', '#FFD1B5', '#F48FB1'],
      horizonColors: ['#FFDA7A', '#FFB266'],
      groundColors: ['#FFB38A', '#FF8E6E'],
      celestial: 'sun',
      celestialY: 0.60,
      celestialColor: '#FFB266',
      glowColor: 'rgba(255,178,102,0.5)',
      glowRadius: 80,
      hasStars: false,
      starOpacity: 0,
      starColor: '#FFFFFF',
      hasClouds: true,
      cloudColor: '#FFE7D6',
      fogColor: 'rgba(255,178,102,0.15)',
      hasFog: true,
      particleType: 'petal',
      particleOpacity: 0.7,
      mascotOutfit: 'day',
      textOnSky: '#FFFFFF',
      cardTint: 'light',
      statusBarStyle: 'light',
      warmth: 1.0,
      cardBackground: '#FFE7D6',
      cardBackgroundAlt: '#FFD1B5',
      cardBorder: 'rgba(255,142,110,0.28)',
      textPrimaryOnCard: '#7A3520',
      textSecondaryOnCard: 'rgba(122,53,32,0.65)',
      accentColor: '#FF8E6E',
      accentColorSoft: 'rgba(255,142,110,0.15)',
      hillColors: ['#FFC4A3', '#FFB38A', '#FF8E6E'],
      lakeColors: ['#FFE59B', '#F48FB1'],
      lakeHighlight: 'rgba(255,255,255,0.5)',
      treeSilhouetteColor: '#6B3420',
      heroImage: require('../../assets/illustrations/golden_hour.png'),
    };
  }
  // Sunset: 17:30–19:00
  if (hour >= 17.5 && hour < 19) {
    return {
      period: 'sunset',
      hour,
      label: 'Sunset',
      greeting: 'Good evening',
      emoji: '🌅',
      // Pink/coral is the dominant family here — purple (E2D0FF/C8B6FF/A78BFA/B583F5) is only a
      // faint hint at the very top of the sky, echoing the hand-off to Blue Hour just after. It
      // must not dominate hills/lake/cards/accent the way Blue Hour's purple does, or the two
      // periods become visually indistinguishable (the bug this replaced).
      skyColors: ['#E2D0FF', '#FFC7DE', '#FFB4A6'],
      horizonColors: ['#FFD6A5', '#FFB4A6'],
      groundColors: ['#FF9AA2', '#FFB4A6'],
      celestial: 'sun',
      celestialY: 0.90,
      celestialColor: '#FFD6A5',
      glowColor: 'rgba(255,154,162,0.5)',
      glowRadius: 85,
      hasStars: true,
      starOpacity: 0.25,
      starColor: '#FFF1C1',
      hasClouds: true,
      cloudColor: '#FFE9F0',
      fogColor: 'rgba(255,180,166,0.12)',
      hasFog: true,
      particleType: 'petal',
      particleOpacity: 0.5,
      mascotOutfit: 'day',
      textOnSky: '#FFFFFF',
      cardTint: 'light',
      statusBarStyle: 'light',
      warmth: 0.85,
      cardBackground: '#FFECF2',
      cardBackgroundAlt: '#FFD9E4',
      cardBorder: 'rgba(255,154,162,0.3)',
      textPrimaryOnCard: '#7A3040',
      textSecondaryOnCard: 'rgba(122,48,64,0.65)',
      accentColor: '#FF9AA2',
      accentColorSoft: 'rgba(255,154,162,0.15)',
      hillColors: ['#FFB6C1', '#FF9AA2', '#FFB4A6'],
      lakeColors: ['#FFC7DE', '#FFD6A5'],
      lakeHighlight: 'rgba(255,255,255,0.45)',
      treeSilhouetteColor: '#6B2F42',
      heroImage: require('../../assets/illustrations/evening.png'),
    };
  }
  // Blue Hour: 19:00–20:00
  if (hour >= 19 && hour < 20) {
    return {
      period: 'blueHour',
      hour,
      label: 'Blue Hour',
      greeting: 'Winding down',
      emoji: '🌆',
      skyColors: ['#3A44A1', '#4D59C7', '#6C7CE7'],
      horizonColors: ['#BDE0FE', '#A2D2FF'],
      groundColors: ['#4D59C7', '#3A44A1'],
      celestial: 'moon',
      celestialY: 0.35,
      celestialColor: '#E6D6FF',
      glowColor: 'rgba(230,214,255,0.3)',
      glowRadius: 55,
      hasStars: true,
      starOpacity: 0.5,
      starColor: '#E6D6FF',
      hasClouds: false,
      cloudColor: 'rgba(107,120,214,0.3)',
      fogColor: 'rgba(77,89,199,0.12)',
      hasFog: true,
      particleType: 'firefly',
      particleOpacity: 0.6,
      mascotOutfit: 'windingUp',
      // Corrected against the reference mockup: Blue Hour's cards/header text are dark-on-light
      // (pale lavender cards, dark purple text), same family as Afternoon/Morning — NOT the
      // white-on-dark treatment Night/Late Night use. Only the illustration itself (sky/hills) is
      // richly saturated purple-blue; the UI chrome sitting on top of/below it stays light.
      textOnSky: '#3D3163',
      cardTint: 'light',
      statusBarStyle: 'dark',
      warmth: 0.25,
      cardBackground: '#E6D6FF',
      cardBackgroundAlt: '#D8B4FE',
      cardBorder: 'rgba(108,124,231,0.28)',
      textPrimaryOnCard: '#4A3B7A',
      textSecondaryOnCard: 'rgba(74,59,122,0.65)',
      accentColor: '#6C7CE7',
      accentColorSoft: 'rgba(108,124,231,0.15)',
      hillColors: ['#3A44A1', '#4D59C7', '#6C7CE7'],
      lakeColors: ['#4D59C7', '#3A44A1'],
      lakeHighlight: 'rgba(230,214,255,0.35)',
      treeSilhouetteColor: '#1F2560',
      heroImage: require('../../assets/illustrations/blue_hour.png'),
    };
  }
  // Night: 20:00–23:00
  if (hour >= 20 && hour < 23) {
    return {
      period: 'night',
      hour,
      label: 'Night',
      greeting: 'Good night',
      emoji: '🌙',
      skyColors: ['#1A1F4D', '#2A306B', '#3F458F'],
      horizonColors: ['#5B60C6', '#7D86E8'],
      groundColors: ['#2A306B', '#3F458F'],
      celestial: 'moon',
      celestialY: 0.20,
      celestialColor: '#DCD6FF',
      glowColor: 'rgba(220,214,255,0.25)',
      glowRadius: 50,
      hasStars: true,
      starOpacity: 0.85,
      starColor: '#DCD6FF',
      hasClouds: false,
      cloudColor: 'rgba(63,69,143,0.3)',
      fogColor: 'rgba(42,48,107,0.15)',
      hasFog: true,
      particleType: 'firefly',
      particleOpacity: 0.8,
      mascotOutfit: 'night',
      textOnSky: '#FFFFFF',
      cardTint: 'light',
      statusBarStyle: 'light',
      warmth: 0.1,
      cardBackground: '#A8B4FF',
      cardBackgroundAlt: '#8E7CF6',
      cardBorder: 'rgba(91,96,198,0.3)',
      textPrimaryOnCard: '#3B2F72',
      textSecondaryOnCard: 'rgba(59,47,114,0.65)',
      accentColor: '#5B60C6',
      accentColorSoft: 'rgba(91,96,198,0.18)',
      hillColors: ['#1A1F4D', '#2A306B', '#3F458F'],
      lakeColors: ['#2A306B', '#1A1F4D'],
      lakeHighlight: 'rgba(220,214,255,0.3)',
      treeSilhouetteColor: '#12163A',
      heroImage: require('../../assets/illustrations/night.png'),
    };
  }
  // Late Night: 23:00–5:30
  return {
    period: 'lateNight',
    hour,
    label: 'Late Night',
    greeting: 'Sleep well',
    emoji: '✨',
    skyColors: ['#0F1A3D', '#162451', '#1F2F6B'],
    horizonColors: ['#3650A3', '#4E63B8'],
    groundColors: ['#162451', '#1F2F6B'],
    celestial: 'moon',
    celestialY: 0.18,
    celestialColor: '#D6DAFF',
    glowColor: 'rgba(214,218,255,0.25)',
    glowRadius: 50,
    hasStars: true,
    starOpacity: 1.0,
    starColor: '#D6DAFF',
    hasClouds: false,
    cloudColor: 'rgba(37,60,135,0.3)',
    fogColor: 'rgba(15,26,61,0.2)',
    hasFog: true,
    particleType: 'firefly',
    particleOpacity: 0.9,
    mascotOutfit: 'night',
    textOnSky: '#FFFFFF',
    cardTint: 'dark',
    statusBarStyle: 'light',
    warmth: 0.0,
    cardBackground: '#162451',
    cardBackgroundAlt: '#1F2F6B',
    cardBorder: 'rgba(107,120,214,0.3)',
    textPrimaryOnCard: '#FFFFFF',
    textSecondaryOnCard: 'rgba(214,218,255,0.65)',
    accentColor: '#6B78D6',
    accentColorSoft: 'rgba(107,120,214,0.18)',
    hillColors: ['#0F1A3D', '#162451', '#1F2F6B'],
    lakeColors: ['#1F2F6B', '#0F1A3D'],
    lakeHighlight: 'rgba(214,218,255,0.35)',
    treeSilhouetteColor: '#0A1230',
    heroImage: require('../../assets/illustrations/late_night.png'),
  };
}

// Dev-only manual QA override. Leave `null` for normal operation; set to a decimal
// hour to preview a specific period across every useTimeTheme() call site at once
// (every independent hook instance reads the same module-level value on its next poll).
// e.g. 6.5 = Dawn, 8 = Morning, 12 = Afternoon, 16 = Golden Hour, 18 = Sunset,
//      19.5 = Blue Hour, 21 = Night, 2 = Late Night.
let DEV_OVERRIDE_HOUR: number | null = null;
export function setDevTimeOverride(hour: number | null) {
  DEV_OVERRIDE_HOUR = hour;
}

function computeHour(): number {
  if (DEV_OVERRIDE_HOUR !== null) return DEV_OVERRIDE_HOUR;
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60;
}

export function useTimeTheme(): TimeTheme {
  const [theme, setTheme] = useState<TimeTheme>(() => getThemeForHour(computeHour()));

  useEffect(() => {
    const update = () => setTheme(getThemeForHour(computeHour()));
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, []);

  return theme;
}

export { getThemeForHour };
