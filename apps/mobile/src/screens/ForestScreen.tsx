import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {
  Canvas,
  Path,
  Circle,
  Group,
  LinearGradient as SkiaLinearGradient,
  RadialGradient,
  Skia,
  vec,
  Fill,
  RoundedRect,
  useCanvasRef,
  ImageFormat,
  type SkImage,
} from '@shopify/react-native-skia';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SHADOWS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { useBreathing, useFloat, useWave } from '../hooks/useAnimations';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { AmbientCreatures } from '../components/common/AmbientCreatures';
import { useTimeTheme } from '../hooks/useTimeTheme';
import { useAuth } from '../context/AuthContext';
import { useThemes, useSelectTheme, useDecorationPlacements, useCreateDecorationPlacement } from '../hooks/useApiQueries';
import { getForestLevelLabel } from '../constants/forestLevels';
import { getForestThemePalette, type ForestThemePalette, type ForestTreeShape } from '../constants/forestThemePalettes';
import { ECOSYSTEM_ZONES, HAND_DRAWN_STROKE_WIDTH, type EcosystemZoneKey } from '../constants/decorationCatalog';
import { pointsToSmoothPathD, pointsBoundingBox, pointDistance, type Point } from '../utils/smoothPath';
import { drawTreePath } from '../utils/skiaTrees';
import { DecorationOverlay } from '../components/forest/DecorationOverlay';
import { DecorationPickerSheet } from '../components/forest/DecorationPickerSheet';
import { StoryPreviewModal } from '../components/forest/StoryPreviewModal';
import type { ApiDecorationType } from '../api/decorations';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useConfirm } from '../context/ConfirmDialogContext';

const { width: SW, height: SH } = Dimensions.get('window');
const FOREST_HEIGHT = SH;
const BOTTOM_PANEL_HEIGHT = SH * 0.42;
/** Only record a new draw point once the finger has moved at least this far — keeps the point
 * array small and the resulting curve smooth instead of jittery. */
const DRAW_POINT_MIN_DISTANCE = 6;
/** A drawn shape smaller than this (in either dimension) is treated as an accidental tap, not a
 * deliberate river/stream, and silently discarded. */
const MIN_DRAWN_EXTENT = 30;

// Tree component using Skia
interface ForestTree {
  x: number;
  layer: number;
  height: number;
  width: number;
  type: ForestTreeShape;
  color: string;
  trunkColor: string;
}

function generateForest(treeCount: number, palette: ForestThemePalette): ForestTree[] {
  const trees: ForestTree[] = [];
  const layers = [
    { y: 0.7, scale: 0.55, count: Math.ceil(treeCount * 0.3) },
    { y: 0.58, scale: 0.75, count: Math.ceil(treeCount * 0.4) },
    { y: 0.44, scale: 1.0, count: Math.ceil(treeCount * 0.3) },
  ];

  layers.forEach((layer, li) => {
    const types = palette.treeShapes;
    for (let i = 0; i < layer.count; i++) {
      const type = types[i % types.length];
      const baseH = type === 'pine' ? 80 : type === 'oak' ? 70 : 65;
      trees.push({
        x: (i / layer.count) * SW * 0.9 + SW * 0.05 + (Math.random() - 0.5) * 20,
        layer: li,
        height: baseH * layer.scale * (0.85 + Math.random() * 0.3),
        width: 50 * layer.scale * (0.8 + Math.random() * 0.4),
        type,
        color: palette.canopyColors[li] ?? palette.canopyColors[0],
        trunkColor: COLORS.bark,
      });
    }
  });

  return trees.sort((a, b) => a.layer - b.layer);
}

function ForestCanvas({
  isNight,
  treeCount,
  palette,
  canvasRef,
}: {
  isNight: boolean;
  treeCount: number;
  palette: ForestThemePalette;
  canvasRef: ReturnType<typeof useCanvasRef>;
}) {
  const trees = generateForest(Math.min(treeCount, 28), palette);
  const groundY = FOREST_HEIGHT * 0.62;

  const skyColors = isNight ? palette.skyColorsNight : palette.skyColors;
  const groundColors = isNight ? palette.groundColorsNight : palette.groundColors;
  const showSparkle = isNight || palette.alwaysSparkle;

  return (
    <Canvas ref={canvasRef} style={{ width: SW, height: FOREST_HEIGHT }}>
      {/* Sky */}
      <Fill>
        <SkiaLinearGradient
          start={vec(SW / 2, 0)}
          end={vec(SW / 2, FOREST_HEIGHT)}
          colors={skyColors}
        />
      </Fill>

      {/* Stars / sparkle (night, or always for the magical theme) */}
      {showSparkle && [
        [SW * 0.1, 30], [SW * 0.25, 20], [SW * 0.45, 45], [SW * 0.6, 15],
        [SW * 0.75, 35], [SW * 0.88, 25], [SW * 0.35, 55], [SW * 0.92, 48],
      ].map(([x, y], i) => (
        <Circle
          key={i}
          cx={x as number}
          cy={y as number}
          r={1.5}
          color={isNight ? 'rgba(255,255,255,0.8)' : `${palette.accentColor}CC`}
        />
      ))}

      {/* Moon/Sun */}
      {isNight ? (
        <Group>
          <Circle cx={SW * 0.82} cy={FOREST_HEIGHT * 0.15} r={24} color="rgba(255,245,200,0.9)" />
          <Circle cx={SW * 0.82 + 10} cy={FOREST_HEIGHT * 0.15 - 8} r={18} color={COLORS.nightSky} />
        </Group>
      ) : (
        <Group>
          <Circle cx={SW * 0.82} cy={FOREST_HEIGHT * 0.15} r={32}>
            <RadialGradient
              c={vec(SW * 0.82, FOREST_HEIGHT * 0.15)}
              r={32}
              colors={[COLORS.amberLight, COLORS.golden]}
            />
          </Circle>
          <Circle cx={SW * 0.82} cy={FOREST_HEIGHT * 0.15} r={48}>
            <RadialGradient
              c={vec(SW * 0.82, FOREST_HEIGHT * 0.15)}
              r={48}
              colors={['rgba(232,184,75,0.3)', 'rgba(232,184,75,0)']}
            />
          </Circle>
        </Group>
      )}

      {/* Background hills */}
      {(() => {
        const [hillA, hillB] = isNight ? palette.hillColorsNight : palette.hillColors;
        return [
          { cx: SW * 0.2, r: 120, y: groundY * 0.92, color: hillA },
          { cx: SW * 0.6, r: 150, y: groundY * 0.9, color: hillB },
          { cx: SW * 0.85, r: 100, y: groundY * 0.93, color: hillA },
        ];
      })().map((hill, i) => (
        <Circle key={i} cx={hill.cx} cy={hill.y} r={hill.r} color={hill.color} />
      ))}

      {/* Ground */}
      <RoundedRect x={0} y={groundY} width={SW} height={FOREST_HEIGHT - groundY} r={0}>
        <SkiaLinearGradient
          start={vec(0, groundY)}
          end={vec(0, FOREST_HEIGHT)}
          colors={groundColors}
        />
      </RoundedRect>

      {/* Ground texture */}
      <Path
        path={(() => {
          const p = Skia.Path.Make();
          p.moveTo(0, groundY + 8);
          for (let i = 0; i < 12; i++) {
            p.lineTo(SW * (i / 11), groundY + (i % 2 === 0 ? 8 : 14));
          }
          p.lineTo(SW, groundY + 8);
          return p;
        })()}
        color={isNight ? 'rgba(45,90,39,0.5)' : 'rgba(135,168,120,0.5)'}
        style="stroke"
        strokeWidth={2}
      />

      {/* Trees */}
      {trees.map((tree, i) => {
        const { path, trunkPath } = drawTreePath(tree.type, tree.x, tree.height, tree.width, groundY);
        const treeAlpha = isNight ? 0.7 : 1.0;
        const darkColor = isNight ? palette.canopyColorNight : tree.color;
        return (
          <Group key={i} opacity={treeAlpha}>
            <Path path={trunkPath} color={isNight ? '#2A1A0A' : tree.trunkColor} />
            <Path path={path} color={darkColor} />
          </Group>
        );
      })}

      {/* Fireflies (night) */}
      {isNight && [
        [SW * 0.15, groundY - 40], [SW * 0.35, groundY - 60], [SW * 0.55, groundY - 30],
        [SW * 0.72, groundY - 50], [SW * 0.88, groundY - 70],
      ].map(([x, y], i) => (
        <Group key={i}>
          <Circle cx={x as number} cy={y as number} r={3}>
            <RadialGradient
              c={vec(x as number, y as number)}
              r={8}
              colors={['rgba(255,220,50,0.9)', 'rgba(255,220,50,0)']}
            />
          </Circle>
        </Group>
      ))}
    </Canvas>
  );
}

function FloatingLeaf({ x, delay, color }: { x: number; delay: number; color: string }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotate = useSharedValue(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = withTiming(0.4, { duration: 400 });
      return;
    }

    translateY.value = withDelay(delay, withRepeat(
      withTiming(-FOREST_HEIGHT * 0.7, { duration: 5000 + Math.random() * 3000, easing: Easing.linear }), -1, false
    ));
    translateX.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(25, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-15, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(10, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ), -1, false
    ));
    opacity.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.5, { duration: 3400 }),
        withTiming(0, { duration: 800 })
      ), -1, false
    ));
    rotate.value = withDelay(delay, withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }), -1, false
    ));
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.floatingLeaf, { left: x, bottom: 50 }, style]}>
      <View style={[styles.leafShape, { backgroundColor: color }]} />
    </Animated.View>
  );
}

export function ForestScreen({ navigation }: any) {
  const theme = useTimeTheme();
  const confirm = useConfirm();
  const isNight = theme.mascotOutfit === 'night';
  const insets = useSafeAreaInsets();
  const bottomNavClearance = useBottomNavClearance();
  const { user } = useAuth();
  const { data: themes = [] } = useThemes();
  const selectThemeMutation = useSelectTheme();
  const selectedTheme = user?.selectedForestThemeId ?? themes.find(t => t.key === 'classic')?.id ?? null;
  const selectedThemeKey = themes.find(t => t.id === selectedTheme)?.key;
  const palette = getForestThemePalette(selectedThemeKey);
  const forestLevelLabel = getForestLevelLabel(user?.level ?? 1);

  const { data: placements = [] } = useDecorationPlacements();
  const [decorateMode, setDecorateMode] = useState(false);
  const [pickerZone, setPickerZone] = useState<EcosystemZoneKey | null>(null);
  const createPlacementMutation = useCreateDecorationPlacement();

  const breathStyle = useBreathing(0.99, 1.01, 6000);

  // Bottom sheet — open (fully visible, current ~42% height panel) ⇄ fully closed (entirely
  // off-screen). The forest itself never moves or resizes — it's always full-bleed SW×SH — so
  // there's no gap exposing the bare background in either state.
  const sheetTranslateY = useSharedValue(0);
  const sheetStartY = useSharedValue(0);
  const [panelOpen, setPanelOpen] = useState(true);

  const openSheet = () => {
    sheetTranslateY.value = withSpring(0, { damping: 18, stiffness: 160 });
    setPanelOpen(true);
  };
  const closeSheet = () => {
    sheetTranslateY.value = withSpring(BOTTOM_PANEL_HEIGHT, { damping: 18, stiffness: 160 });
    setPanelOpen(false);
  };

  const sheetPan = Gesture.Pan()
    .onStart(() => {
      sheetStartY.value = sheetTranslateY.value;
    })
    .onUpdate((e) => {
      const next = sheetStartY.value + e.translationY;
      sheetTranslateY.value = next < 0 ? 0 : next > BOTTOM_PANEL_HEIGHT ? BOTTOM_PANEL_HEIGHT : next;
    })
    .onEnd((e) => {
      const projected = sheetTranslateY.value + e.velocityY * 0.12;
      const shouldClose = projected > BOTTOM_PANEL_HEIGHT / 2;
      sheetTranslateY.value = withSpring(shouldClose ? BOTTOM_PANEL_HEIGHT : 0, { damping: 18, stiffness: 160 });
      runOnJS(setPanelOpen)(!shouldClose);
    });

  // Tap the handle to toggle open/closed (in addition to dragging).
  const sheetTap = Gesture.Tap().maxDistance(10).onEnd(() => {
    const isOpen = sheetTranslateY.value < BOTTOM_PANEL_HEIGHT / 2;
    sheetTranslateY.value = withSpring(isOpen ? BOTTOM_PANEL_HEIGHT : 0, { damping: 18, stiffness: 160 });
    runOnJS(setPanelOpen)(!isOpen);
  });

  const sheetGesture = Gesture.Exclusive(sheetPan, sheetTap);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sheetTranslateY.value }],
  }));

  const toggleDecorateMode = () => {
    setDecorateMode((prev) => {
      const next = !prev;
      if (next) closeSheet();
      return next;
    });
  };

  // Freehand river/stream drawing — drag a finger across the forest to sketch the path yourself
  // ("however long and curvy you want"), rather than placing and stretching a fixed icon. A ref
  // mirrors the point list alongside the state used for the live preview render, so `onEnd` always
  // reads the definitive up-to-date points regardless of React's state-update timing.
  const [drawingType, setDrawingType] = useState<ApiDecorationType | null>(null);
  const [drawPreviewPoints, setDrawPreviewPoints] = useState<Point[]>([]);
  const drawPointsRef = useRef<Point[]>([]);

  const handleStartDrawing = (type: ApiDecorationType) => {
    setDrawingType(type);
    closeSheet();
  };

  const startDrawPoint = (x: number, y: number) => {
    drawPointsRef.current = [{ x, y }];
    setDrawPreviewPoints(drawPointsRef.current);
  };

  const addDrawPoint = (x: number, y: number) => {
    const points = drawPointsRef.current;
    const last = points[points.length - 1];
    if (last && pointDistance(last, { x, y }) < DRAW_POINT_MIN_DISTANCE) return;
    drawPointsRef.current = [...points, { x, y }];
    setDrawPreviewPoints(drawPointsRef.current);
  };

  const resetDrawing = () => {
    setDrawingType(null);
    drawPointsRef.current = [];
    setDrawPreviewPoints([]);
  };

  const finishDrawing = () => {
    const points = drawPointsRef.current;
    const type = drawingType;
    if (type && points.length >= 2) {
      const bbox = pointsBoundingBox(points);
      if (Math.max(bbox.width, bbox.height) >= MIN_DRAWN_EXTENT) {
        const centroidX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const centroidY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        const relativePath = points.map((p) => ({
          x: (p.x - centroidX) / SW,
          y: (p.y - centroidY) / FOREST_HEIGHT,
        }));
        createPlacementMutation.mutate({
          decorationTypeId: type.id,
          positionX: centroidX / SW,
          positionY: centroidY / FOREST_HEIGHT,
          scale: 1,
          rotation: 0,
          path: relativePath,
        });
      }
    }
    resetDrawing();
  };

  const drawGesture = Gesture.Pan()
    .onStart((e) => {
      runOnJS(startDrawPoint)(e.x, e.y);
    })
    .onUpdate((e) => {
      runOnJS(addDrawPoint)(e.x, e.y);
    })
    .onEnd(() => {
      runOnJS(finishDrawing)();
    });

  // Snapshot → Story. `makeImageFromView` has a confirmed unresolved Android bug where RN views
  // (including react-native-svg) overlapping a Skia <Canvas> vanish from the snapshot — works only
  // on iOS (github.com/Shopify/react-native-skia issues #1633, #2555). Fix: capture the Skia
  // background and the RN/SVG overlay SEPARATELY, then composite them in pure Skia (Surface +
  // drawImageRect), which never touches the buggy native view-hierarchy walk for the merge.
  const canvasRef = useCanvasRef();
  const overlayRef = useRef<View>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [snapshotBase64, setSnapshotBase64] = useState<string | null>(null);

  const handleSnapshot = () => {
    // Present a clean forest: leave decorate mode (hides delete/elongate handles) and close the panel.
    setDecorateMode(false);
    closeSheet();
    setSnapshotBase64(null);
    setPreviewVisible(true);
    setTimeout(async () => {
      try {
        const bgImage: SkImage | null = canvasRef.current?.makeImageSnapshot() ?? null;
        if (!bgImage) throw new Error('empty background snapshot');

        const overlayUri = await captureRef(overlayRef, { format: 'png', quality: 1, result: 'base64' });
        const overlayData = Skia.Data.fromBase64(overlayUri);
        const overlayImage = overlayData ? Skia.Image.MakeImageFromEncoded(overlayData) : null;

        const w = bgImage.width();
        const h = bgImage.height();
        const surface = Skia.Surface.Make(w, h);
        if (!surface) throw new Error('could not create compositing surface');
        const canvas = surface.getCanvas();
        const paint = Skia.Paint();
        canvas.drawImage(bgImage, 0, 0);
        if (overlayImage) {
          canvas.drawImageRect(
            overlayImage,
            Skia.XYWHRect(0, 0, overlayImage.width(), overlayImage.height()),
            Skia.XYWHRect(0, 0, w, h),
            paint
          );
        }

        const finalImage = surface.makeImageSnapshot();
        const base64 = finalImage.encodeToBase64(ImageFormat.JPEG, 90);
        if (!base64) throw new Error('empty composited snapshot');
        setSnapshotBase64(base64);
      } catch (e) {
        setPreviewVisible(false);
        confirm('Snapshot failed', 'Could not capture your forest. Please try again.');
      }
    }, 450);
  };

  return (
    <View style={styles.container}>
      <StatusBar style={theme.statusBarStyle} />

      {/* Forest visualization — always full-bleed SW×SH, never moves, so it always occupies the
          entire screen regardless of panel state (no gap exposing the background behind it). */}
      <Animated.View collapsable={false} style={[styles.forestContainer, breathStyle]}>
        <ForestCanvas isNight={isNight} treeCount={user?.treesPlantedCount ?? 0} palette={palette} canvasRef={canvasRef} />

        {/* Everything below is plain RN/SVG (no Skia inside) — captured as one layer by
            `captureRef` in handleSnapshot, then composited on top of the Skia background. */}
        <View ref={overlayRef} collapsable={false} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {/* Atmospheric overlay */}
          <LinearGradient
            colors={isNight
              ? ['rgba(8,15,30,0.2)', 'transparent', 'rgba(8,15,30,0.1)']
              : ['rgba(200,230,192,0.1)', 'transparent', 'rgba(245,237,214,0.2)']}
            style={StyleSheet.absoluteFill}
            locations={[0, 0.5, 1]}
          />

          {/* Floating leaves */}
          {[SW * 0.1, SW * 0.25, SW * 0.45, SW * 0.65, SW * 0.8].map((x, i) => (
            <FloatingLeaf key={i} x={x} delay={i * 800} color={palette.accentColor} />
          ))}

          {/* Birds by day, fireflies at night/late-night — same swap rule as Home */}
          <AmbientCreatures
            period={theme.period}
            birdConfigs={[
              { direction: 'right', y: FOREST_HEIGHT * 0.18, delay: 2000, duration: 10000 },
              { direction: 'right', y: FOREST_HEIGHT * 0.12, delay: 5000, duration: 11000 },
            ]}
            fireflyCount={7}
            fireflyAreaHeight={FOREST_HEIGHT * 0.4}
          />

          {/* Placed ecosystem decorations */}
          <DecorationOverlay
            placements={placements}
            editable={decorateMode}
            canvasWidth={SW}
            canvasHeight={FOREST_HEIGHT}
          />
        </View>
      </Animated.View>

      {/* Time indicator */}
      <View style={[styles.toggleRow, { top: insets.top + 12 }]}>
        <BlurView intensity={30} tint={isNight ? 'dark' : 'light'} style={styles.toggleBlur}>
          <Text style={styles.toggleIcon}>{theme.emoji}</Text>
          <Text style={[styles.timePeriodLabel, isNight && styles.timeLabelNight]}>{theme.label}</Text>
        </BlurView>
      </View>

      {/* Snapshot → Story button */}
      <TouchableOpacity
        style={[styles.snapshotButton, { top: insets.top + 12 }]}
        activeOpacity={0.85}
        onPress={handleSnapshot}
      >
        <BlurView intensity={30} tint={isNight ? 'dark' : 'light'} style={styles.snapshotBlur}>
          <Text style={styles.snapshotIcon}>📸</Text>
        </BlurView>
      </TouchableOpacity>

      {/* Forest stats overlay */}
      <View style={[styles.statsOverlay, { top: insets.top + 64 }]}>
        <BlurView intensity={isNight ? 50 : 35} tint={isNight ? 'dark' : 'light'} style={styles.statsBlur}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statNum, isNight && styles.statNumNight]}>{user?.treesPlantedCount ?? 0}</Text>
              <Text style={[styles.statLabel, isNight && styles.statLabelNight]}>Trees</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statNum, isNight && styles.statNumNight]}>{forestLevelLabel}</Text>
              <Text style={[styles.statLabel, isNight && styles.statLabelNight]}>Level</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={[styles.statNum, isNight && styles.statNumNight]}>{(user?.totalCo2Absorbed ?? 0).toFixed(1)}kg</Text>
              <Text style={[styles.statLabel, isNight && styles.statLabelNight]}>CO₂</Text>
            </View>
          </View>
        </BlurView>
      </View>

      {/* Bottom info panel — floats over the full-bleed scenery, drag the handle (or the ✕) to close */}
      <Animated.View style={[styles.bottomPanelWrap, sheetAnimatedStyle]}>
        <BlurView intensity={isNight ? 60 : 50} tint={isNight ? 'dark' : 'light'} style={styles.bottomPanelBlur}>
          <GestureDetector gesture={sheetGesture}>
            <View style={styles.sheetHandleArea}>
              <View style={[styles.bottomPanelHandle, isNight && styles.bottomPanelHandleNight]} />
              <Text style={[styles.sheetHint, isNight && styles.timeLabelNight]}>Drag to show / hide your forest</Text>
            </View>
          </GestureDetector>
          <ScrollView
            contentContainerStyle={[styles.bottomContent, { paddingBottom: bottomNavClearance }]}
            showsVerticalScrollIndicator={false}
          >
        {/* Forest name */}
        <View style={styles.forestNameRow}>
          <View>
            <Text style={[styles.forestTag, { color: palette.accentColor }, isNight && styles.timeLabelNight]}>YOUR FOREST</Text>
            <Text style={[styles.forestName, isNight && styles.lightText]}>{forestLevelLabel} 🌳</Text>
          </View>
          <View style={styles.forestNameRight}>
            <View style={styles.levelBadge}>
              <LinearGradient colors={[COLORS.golden, COLORS.earth]} style={styles.levelBadgeGradient}>
                <Text style={styles.levelBadgeText}>Lv.{user?.level ?? 1}</Text>
              </LinearGradient>
            </View>
            <TouchableOpacity style={styles.panelCloseButton} onPress={closeSheet} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.panelCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ecosystem sections */}
        <View style={styles.ecosystemHeaderRow}>
          <Text style={[styles.sectionTitle, isNight && styles.lightText]}>Ecosystem Zones</Text>
          <TouchableOpacity
            style={[styles.decorateToggle, decorateMode && styles.decorateToggleActive]}
            onPress={toggleDecorateMode}
          >
            <Text style={[styles.decorateToggleText, decorateMode && styles.decorateToggleTextActive]}>
              {decorateMode ? '✓ Decorating' : '🎨 Decorate'}
            </Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {ECOSYSTEM_ZONES.map((zone) => {
            const placedCount = placements.filter(p => p.decorationType.zone === zone.key).length;
            return (
              <TouchableOpacity key={zone.key} activeOpacity={0.8} onPress={() => setPickerZone(zone.key)}>
                <GlassCard variant="dark" style={styles.zoneCard}>
                  <Text style={styles.zoneIcon}>{zone.icon}</Text>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zoneCount}>{placedCount > 0 ? `${placedCount} placed` : 'Tap to add'}</Text>
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Forest themes */}
        <Text style={[styles.sectionTitle, isNight && styles.lightText]}>Forest Themes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {themes.map((forestTheme) => (
            <TouchableOpacity
              key={forestTheme.id}
              onPress={() => forestTheme.unlocked && selectThemeMutation.mutate(forestTheme.id)}
              activeOpacity={0.8}
            >
              <GlassCard
                variant={selectedTheme === forestTheme.id ? 'sage' : 'warm'}
                style={[styles.themeCard, !forestTheme.unlocked && styles.themeCardLocked]}
              >
                <Text style={styles.themeEmoji}>{forestTheme.preview}</Text>
                <Text style={styles.themeName}>{forestTheme.name}</Text>
                {!forestTheme.unlocked && <Text style={styles.themeLocked}>🔒</Text>}
              </GlassCard>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Wind effect indicator */}
        <GlassCard variant="light" style={styles.windCard}>
          <Text style={styles.windIcon}>🌬️</Text>
          <View>
            <Text style={styles.windTitle}>Gentle Breeze</Text>
            <Text style={styles.windSubtitle}>Your forest is calm and thriving</Text>
          </View>
        </GlassCard>
          </ScrollView>
        </BlurView>
      </Animated.View>

      {/* Reopen pill — shown once the panel is fully closed, so the user can pick their next item */}
      {!panelOpen && (
        <TouchableOpacity
          style={[styles.reopenPill, { bottom: bottomNavClearance }]}
          activeOpacity={0.85}
          onPress={openSheet}
        >
          <BlurView intensity={50} tint={isNight ? 'dark' : 'light'} style={styles.reopenPillBlur}>
            <Text style={[styles.reopenPillText, isNight && styles.timeLabelNight]}>🌿 Ecosystem</Text>
          </BlurView>
        </TouchableOpacity>
      )}

      {/* Freehand river/stream drawing overlay */}
      {drawingType && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <GestureDetector gesture={drawGesture}>
            <View style={StyleSheet.absoluteFill} />
          </GestureDetector>

          {drawPreviewPoints.length >= 2 && (
            <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
              <SvgPath
                d={pointsToSmoothPathD(drawPreviewPoints)}
                stroke={drawingType.colorway}
                strokeWidth={HAND_DRAWN_STROKE_WIDTH[drawingType.variant] ?? 10}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
            </Svg>
          )}

          <View style={[styles.drawBanner, { top: insets.top + 12 }]} pointerEvents="none">
            <BlurView intensity={55} tint="dark" style={styles.drawBannerBlur}>
              <Text style={styles.drawBannerText}>✏️ Drag to draw — lift your finger to finish</Text>
            </BlurView>
          </View>

          <TouchableOpacity
            style={[styles.drawCancelButton, { top: insets.top + 12 }]}
            onPress={resetDrawing}
            activeOpacity={0.85}
          >
            <BlurView intensity={55} tint="dark" style={styles.drawCancelBlur}>
              <Text style={styles.drawCancelText}>✕</Text>
            </BlurView>
          </TouchableOpacity>
        </View>
      )}

      <DecorationPickerSheet
        zone={pickerZone}
        visible={pickerZone !== null}
        onClose={() => setPickerZone(null)}
        onDraw={handleStartDrawing}
      />

      <StoryPreviewModal
        visible={previewVisible}
        imageBase64={snapshotBase64}
        onClose={() => setPreviewVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.beigeLight,
  },
  forestContainer: {
    ...{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const,
    overflow: 'hidden',
  },
  toggleRow: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  toggleBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  toggleIcon: {
    fontSize: 18,
  },
  snapshotButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
  },
  snapshotBlur: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  snapshotIcon: {
    fontSize: 20,
  },
  drawBanner: {
    position: 'absolute',
    left: 16,
    right: 64,
  },
  drawBannerBlur: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  drawBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  drawCancelButton: {
    position: 'absolute',
    right: 16,
  },
  drawCancelBlur: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  drawCancelText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  timePeriodLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  timeLabelNight: {
    color: COLORS.white,
  },
  lightText: {
    color: COLORS.white,
  },
  statsOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  statsBlur: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statsRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.forest,
  },
  statNumNight: {
    color: COLORS.mint,
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textPrimary,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statLabelNight: {
    color: 'rgba(168,196,153,0.7)',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 4,
  },
  floatingLeaf: {
    position: 'absolute',
    width: 12,
    height: 8,
  },
  leafShape: {
    width: 12,
    height: 8,
    backgroundColor: COLORS.sage,
    borderRadius: 6,
    borderTopRightRadius: 0,
    transform: [{ rotate: '45deg' }],
  },
  bottomPanelWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_PANEL_HEIGHT,
  },
  bottomPanelBlur: {
    flex: 1,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    overflow: 'hidden',
    paddingTop: 12,
  },
  sheetHandleArea: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 8,
    gap: 5,
  },
  bottomPanelHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignSelf: 'center',
  },
  sheetHint: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  bottomPanelHandleNight: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  bottomContent: {
    paddingHorizontal: 16,
    gap: 12,
    paddingTop: 4,
  },
  forestNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forestNameRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  panelCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelCloseText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reopenPill: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  reopenPillBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    ...SHADOWS.lg,
  },
  reopenPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  forestTag: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.sage,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  forestName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  levelBadge: {
    ...SHADOWS.golden,
  },
  levelBadgeGradient: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  levelBadgeText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.white,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: -4,
  },
  ecosystemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  decorateToggle: {
    backgroundColor: 'rgba(135,168,120,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(135,168,120,0.35)',
  },
  decorateToggleActive: {
    backgroundColor: COLORS.sage,
    borderColor: COLORS.sage,
  },
  decorateToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sage,
  },
  decorateToggleTextActive: {
    color: COLORS.white,
  },
  zoneCard: {
    width: 110,
    marginRight: 8,
    alignItems: 'center',
    padding: 14,
    gap: 6,
  },
  zoneIcon: {
    fontSize: 28,
  },
  zoneName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
    textAlign: 'center',
  },
  zoneCount: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.white,
  },
  themeCard: {
    width: 100,
    marginRight: 8,
    alignItems: 'center',
    padding: 12,
    gap: 4,
  },
  themeCardLocked: {
    opacity: 0.55,
  },
  themeEmoji: {
    fontSize: 30,
  },
  themeName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  themeLocked: {
    fontSize: 12,
  },
  windCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  windIcon: {
    fontSize: 28,
  },
  windTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  windSubtitle: {
    fontSize: 12,
    color: COLORS.textPrimary,
    marginTop: 1,
  },
});
