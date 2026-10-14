import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '../common/AppText';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useTrees, useDrives } from '../../hooks/useApiQueries';
import type { ApiTree } from '../../api/trees';
import type { ApiDrive } from '../../api/drives';
import type { ApiWeather } from '../../api/weather';
import type { ApiUser } from '../../api/auth';

const { width: SW } = Dimensions.get('window');
/** The glass pill is inset 20px each side of the screen with a 1.5px border. */
const PILL_WIDTH = SW - 40 - 3;
const AUTO_ROTATE_MS = 5000;
const GROWTH_STAGE_EMOJI = ['🌱', '🌿', '🌳', '🌲', '🎋'];
const GROWTH_STAGE_LABEL = ['a seedling', 'sprouting', 'growing', 'maturing', 'flourishing'];

interface PulseCard {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
}

function formatDriveWhen(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${day}, ${time}`;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Cards in priority order — only the ones that currently apply are returned, so the pill never
 * pads itself with filler. Struggling/unchecked trees outrank everything because they're the only
 * thing here the user can act on to keep a tree alive. */
function buildCards(
  trees: ApiTree[],
  drives: ApiDrive[],
  weather: ApiWeather | null,
  user: ApiUser | null,
  nav: { goTrees: () => void; goPlant: () => void; goDrive: (id: string) => void },
): PulseCard[] {
  const cards: PulseCard[] = [];

  if (trees.length === 0) {
    cards.push({
      key: 'first',
      icon: '🌱',
      title: 'Plant your first tree',
      subtitle: 'Start growing your forest',
      onPress: nav.goPlant,
    });
  } else {
    const struggling = trees.filter((t) => t.healthStatus === 'struggling');
    const unchecked = trees.filter((t) => t.healthStatus === 'not_checked' || !t.healthStatus);
    const alive = trees.filter((t) => t.healthStatus !== 'dead' && t.healthStatus !== 'removed');
    if (struggling.length > 0) {
      cards.push({
        key: 'health',
        icon: '⚠️',
        title: `${plural(struggling.length, 'tree is', 'trees are')} struggling`,
        subtitle: struggling.length === 1 ? `Check on ${struggling[0].nickname}` : 'Tap to check on them',
        onPress: nav.goTrees,
      });
    } else if (unchecked.length > 0) {
      cards.push({
        key: 'health',
        icon: '🩺',
        title: `${plural(unchecked.length, 'tree hasn’t', 'trees haven’t')} been checked`,
        subtitle: 'Log a quick health check',
        onPress: nav.goTrees,
      });
    } else if (alive.length > 0) {
      cards.push({
        key: 'health',
        icon: '💚',
        title: `All ${plural(alive.length, 'tree', 'trees')} healthy`,
        subtitle: 'Your forest is thriving',
        onPress: nav.goTrees,
      });
    }
  }

  const now = Date.now();
  const nextDrive = drives
    .filter((d) => d.status === 'upcoming' && new Date(d.startsAt).getTime() > now && (d.distanceKm ?? 0) <= 50)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];
  if (nextDrive) {
    const dist = nextDrive.distanceKm != null ? ` · ${nextDrive.distanceKm.toFixed(1)} km away` : '';
    cards.push({
      key: 'drive',
      icon: '🌍',
      title: nextDrive.isRsvped ? 'You’re going to a planting drive' : 'Planting drive near you',
      subtitle: `${nextDrive.title} · ${formatDriveWhen(nextDrive.startsAt)}${dist}`,
      onPress: () => nav.goDrive(nextDrive.id),
    });
  }

  const growing = trees
    .filter((t) => t.growthStage < 5 && t.healthStatus !== 'dead' && t.healthStatus !== 'removed')
    .sort((a, b) => b.growthStage - a.growthStage || (b.ageDays ?? 0) - (a.ageDays ?? 0))[0];
  if (growing) {
    const age = growing.ageDays != null ? ` · ${plural(growing.ageDays, 'day', 'days')} old` : '';
    cards.push({
      key: 'growth',
      icon: GROWTH_STAGE_EMOJI[growing.growthStage - 1],
      title: `${growing.nickname} is ${GROWTH_STAGE_LABEL[growing.growthStage - 1]}`,
      subtitle: `Stage ${growing.growthStage} of 5${age}`,
      onPress: nav.goTrees,
    });
  }

  if (weather) {
    if (weather.scene === 'rainy') {
      cards.push({
        key: 'weather',
        icon: '🌧️',
        title: `Rain in ${weather.city}`,
        subtitle: 'Your trees get a free watering today',
      });
    } else if (weather.temperatureCelsius >= 35) {
      cards.push({
        key: 'weather',
        icon: '☀️',
        title: `${Math.round(weather.temperatureCelsius)}°C and hot`,
        subtitle: 'Young trees may need extra water',
      });
    } else if (weather.temperatureCelsius >= 15) {
      cards.push({
        key: 'weather',
        icon: '🌤️',
        title: 'Good day to plant',
        subtitle: `${Math.round(weather.temperatureCelsius)}°C and dry in ${weather.city}`,
        onPress: nav.goPlant,
      });
    }
  }

  if (cards.length === 0) {
    cards.push({
      key: 'totals',
      icon: '🌳',
      title: plural(user?.treesPlantedCount ?? 0, 'tree', 'trees'),
      subtitle: `${(user?.totalCo2Absorbed ?? 0).toFixed(1)} kg CO₂ stored`,
    });
  }
  return cards;
}

function PulseCardView({
  card,
  index,
  scrollX,
  primary,
  secondary,
}: {
  card: PulseCard;
  index: number;
  scrollX: SharedValue<number>;
  primary: string;
  secondary: string;
}) {
  // p: -1 = card fully off to the left, 0 = centred, 1 = fully off to the right.
  const contentStyle = useAnimatedStyle(() => {
    const p = (scrollX.value - index * PILL_WIDTH) / PILL_WIDTH;
    return {
      opacity: interpolate(p, [-1, -0.5, 0, 0.5, 1], [0, 0.2, 1, 0.2, 0], Extrapolation.CLAMP),
      transform: [
        { translateX: interpolate(p, [-1, 0, 1], [PILL_WIDTH * 0.35, 0, -PILL_WIDTH * 0.35], Extrapolation.CLAMP) },
        { scale: interpolate(p, [-1, 0, 1], [0.86, 1, 0.86], Extrapolation.CLAMP) },
      ],
    };
  });
  // The icon travels a little faster than the text, which gives the swipe some depth.
  const iconStyle = useAnimatedStyle(() => {
    const p = (scrollX.value - index * PILL_WIDTH) / PILL_WIDTH;
    return {
      transform: [
        { translateX: interpolate(p, [-1, 0, 1], [PILL_WIDTH * 0.2, 0, -PILL_WIDTH * 0.2], Extrapolation.CLAMP) },
        { rotate: `${interpolate(p, [-1, 0, 1], [-25, 0, 25], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(p, [-1, 0, 1], [0.5, 1, 0.5], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <TouchableOpacity
      activeOpacity={card.onPress ? 0.7 : 1}
      onPress={card.onPress}
      disabled={!card.onPress}
      style={styles.card}
      accessibilityRole={card.onPress ? 'button' : 'text'}
      accessibilityLabel={`${card.title}. ${card.subtitle}`}
    >
      <Animated.View style={[styles.cardContent, contentStyle]}>
        <Animated.Text style={[styles.icon, iconStyle]}>{card.icon}</Animated.Text>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: primary }]} numberOfLines={1}>{card.title}</Text>
          <Text style={[styles.subtitle, { color: secondary }]} numberOfLines={1}>{card.subtitle}</Text>
        </View>
        {card.onPress ? <Text style={[styles.chevron, { color: secondary }]}>›</Text> : null}
      </Animated.View>
    </TouchableOpacity>
  );
}

function Dot({ index, scrollX, color }: { index: number; scrollX: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const p = scrollX.value / PILL_WIDTH;
    return {
      width: interpolate(p, [index - 1, index, index + 1], [5, 16, 5], Extrapolation.CLAMP),
      opacity: interpolate(p, [index - 1, index, index + 1], [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />;
}

/** Swipeable "forest pulse" pill: a handful of contextual cards about the user's forest (tree
 * health, growth, a nearby planting drive, today's weather) instead of lifetime totals that the
 * stat row above already shows. Auto-advances until the user swipes it themselves. */
export function ForestPulsePill({
  user,
  weather,
  coords,
  navigation,
  primaryColor,
  secondaryColor,
  accentColor,
}: {
  user: ApiUser | null;
  weather: ApiWeather | null;
  coords: { lat: number; lng: number } | null;
  navigation: any;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
}) {
  const { data: trees = [] } = useTrees(100);
  const { data: drives = [] } = useDrives(coords?.lat, coords?.lng, !!coords);

  const cards = useMemo(
    () =>
      buildCards(trees, drives, weather, user, {
        goTrees: () => navigation.navigate('MyTrees'),
        goPlant: () => navigation.navigate('PlantTree'),
        goDrive: (driveId) => navigation.navigate('DriveDetail', { driveId }),
      }),
    [trees, drives, weather, user, navigation],
  );

  const scrollX = useSharedValue(0);
  const scrollRef = useRef<Animated.ScrollView>(null);
  const indexRef = useRef(0);
  const userDragged = useRef(false);

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollX.value = e.contentOffset.x;
  });

  // Keep the position valid if the card list shrinks (e.g. a drive disappears after a refetch).
  useEffect(() => {
    if (indexRef.current >= cards.length) {
      indexRef.current = 0;
      scrollRef.current?.scrollTo({ x: 0, animated: false });
    }
  }, [cards.length]);

  useEffect(() => {
    if (cards.length < 2) return;
    const id = setInterval(() => {
      if (userDragged.current) return;
      const next = (indexRef.current + 1) % cards.length;
      indexRef.current = next;
      scrollRef.current?.scrollTo({ x: next * PILL_WIDTH, animated: true });
    }, AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [cards.length]);

  return (
    <View>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onScrollBeginDrag={() => {
          userDragged.current = true;
        }}
        onMomentumScrollEnd={(e) => {
          indexRef.current = Math.round(e.nativeEvent.contentOffset.x / PILL_WIDTH);
        }}
        style={{ width: PILL_WIDTH }}
      >
        {cards.map((card, i) => (
          <PulseCardView
            key={card.key}
            card={card}
            index={i}
            scrollX={scrollX}
            primary={primaryColor}
            secondary={secondaryColor}
          />
        ))}
      </Animated.ScrollView>
      {cards.length > 1 ? (
        <View style={styles.dots} pointerEvents="none">
          {cards.map((card, i) => (
            <Dot key={card.key} index={i} scrollX={scrollX} color={accentColor} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: PILL_WIDTH,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    justifyContent: 'center',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    fontSize: 26,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 7,
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
});
