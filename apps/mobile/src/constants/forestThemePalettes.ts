import { COLORS } from './colors';

export type ForestTreeShape = 'oak' | 'pine' | 'birch' | 'fruit';

export interface ForestThemePalette {
  key: string;
  canopyColors: [string, string, string, string];
  canopyColorNight: string;
  groundColors: [string, string];
  groundColorsNight: [string, string];
  skyColors: string[];
  skyColorsNight: string[];
  hillColors: [string, string];
  hillColorsNight: [string, string];
  treeShapes: ForestTreeShape[];
  ambientParticleType: 'leaf' | 'petal' | 'dust' | 'firefly';
  accentColor: string;
  alwaysSparkle: boolean;
}

export const FOREST_THEME_PALETTES: Record<string, ForestThemePalette> = {
  classic: {
    key: 'classic',
    canopyColors: [COLORS.forest, COLORS.sageDark, COLORS.sage, '#3D7032'],
    canopyColorNight: '#0A1F12',
    groundColors: [COLORS.sage, COLORS.forest],
    groundColorsNight: [COLORS.nightForest, COLORS.forestDeep],
    skyColors: [COLORS.skyDay, '#D0E8F8', COLORS.mintLight],
    skyColorsNight: [COLORS.nightDeep, COLORS.nightSky, '#2C3E6B'],
    hillColors: ['#A8C499', '#87A878'],
    hillColorsNight: ['#0D2318', '#0F2A1C'],
    treeShapes: ['oak', 'pine', 'birch', 'fruit'],
    ambientParticleType: 'leaf',
    accentColor: COLORS.sage,
    alwaysSparkle: false,
  },
  cherry: {
    key: 'cherry',
    canopyColors: ['#F4B6C2', '#F29CB0', '#FADCE3', '#E8849C'],
    canopyColorNight: '#5C2A38',
    groundColors: ['#F5D6DE', '#E8A8BC'],
    groundColorsNight: ['#3A1C28', '#2A1420'],
    skyColors: ['#FFE0EC', '#FFF0F5', '#FFFFFF'],
    skyColorsNight: ['#2A1830', '#4A2540', '#6B3555'],
    hillColors: ['#F0B8C8', '#E8A0B5'],
    hillColorsNight: ['#3A2030', '#4A2838'],
    treeShapes: ['oak'],
    ambientParticleType: 'petal',
    accentColor: '#E8849C',
    alwaysSparkle: false,
  },
  bamboo: {
    key: 'bamboo',
    canopyColors: ['#8FAE3C', '#9FC450', '#B8D96B', '#7A9832'],
    canopyColorNight: '#1F2E0A',
    groundColors: ['#C4A876', '#A88A5C'],
    groundColorsNight: [COLORS.nightForest, COLORS.forestDeep],
    skyColors: ['#C8E8B0', '#E0F0D0', '#F0F8E8'],
    skyColorsNight: [COLORS.nightDeep, COLORS.nightSky, '#2C3E6B'],
    hillColors: ['#A8C88C', '#94BC72'],
    hillColorsNight: ['#132008', '#18280A'],
    treeShapes: ['birch'],
    ambientParticleType: 'leaf',
    accentColor: '#8FAE3C',
    alwaysSparkle: false,
  },
  autumn: {
    key: 'autumn',
    canopyColors: ['#D4691E', '#E8896A', '#E8B84B', '#C1440E'],
    canopyColorNight: '#3D1A0A',
    groundColors: [COLORS.warmBrown, COLORS.earthDark],
    groundColorsNight: [COLORS.nightForest, '#2A1608'],
    skyColors: ['#F5C070', '#F0A868', '#E89050'],
    skyColorsNight: ['#1A0F1A', '#3D1A00', '#5C2D00'],
    hillColors: ['#C88850', '#B87840'],
    hillColorsNight: ['#2A1810', '#201408'],
    treeShapes: ['oak', 'fruit'],
    ambientParticleType: 'petal',
    accentColor: COLORS.golden,
    alwaysSparkle: false,
  },
  magical: {
    key: 'magical',
    canopyColors: ['#B784DC', '#9B59B6', '#D6A8E8', '#7B4FA0'],
    canopyColorNight: '#2A1240',
    groundColors: ['#D8B8F0', '#B890D8'],
    groundColorsNight: ['#1A0A2E', '#100620'],
    skyColors: ['#E0C8F5', '#F0E0FF', '#FFE8F8'],
    skyColorsNight: ['#0A0518', '#1A0F30', '#301850'],
    hillColors: ['#C8A0E0', '#B888D0'],
    hillColorsNight: ['#241040', '#1A0A30'],
    treeShapes: ['oak', 'pine', 'birch', 'fruit'],
    ambientParticleType: 'firefly',
    accentColor: '#B784DC',
    alwaysSparkle: true,
  },
};

export function getForestThemePalette(key?: string | null): ForestThemePalette {
  return FOREST_THEME_PALETTES[key ?? 'classic'] ?? FOREST_THEME_PALETTES.classic;
}
