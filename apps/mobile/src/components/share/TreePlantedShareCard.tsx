import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from '../common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS } from '../../constants/colors';
import { SPACING } from '../../constants/theme';
import { TYPOGRAPHY } from '../../constants/typography';
import type { ApiTree } from '../../api/trees';
import { useAuth } from '../../context/AuthContext';

interface Props {
  tree: ApiTree | null;
  imageUri?: string | null;
  /** Fires once the background photo has loaded (or immediately when there is none), so the
   * share capture never grabs a blank card. */
  onReady?: () => void;
}

export function TreePlantedShareCard({ tree, imageUri, onReady }: Props) {
  const { user } = useAuth();
  const photo = tree ? imageUri ?? tree.photoUri : null;

  React.useEffect(() => {
    if (tree && !photo) onReady?.();
  }, [tree, photo]);

  if (!tree) return null;
  const plantedOn = new Date(tree.plantedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View style={styles.fill}>
      {photo ? (
        <Image
          source={{ uri: photo }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={onReady}
          onError={onReady}
        />
      ) : (
        <LinearGradient colors={GRADIENTS.deepForest as any} style={StyleSheet.absoluteFill} />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(13,35,24,0.55)', 'rgba(13,35,24,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Text style={styles.speciesEmoji}>{tree.speciesEmoji}</Text>
        <Text style={styles.kicker}>JUST PLANTED</Text>
        <Text style={styles.name} numberOfLines={2}>{tree.nickname || tree.species}</Text>
        <Text style={styles.speciesLine}>{tree.species}</Text>
        {user?.name ? <Text style={styles.planter}>Planted by {user.name}</Text> : null}
        {tree.location ? <Text style={styles.location} numberOfLines={2}>📍 {tree.location}</Text> : null}
        <Text style={styles.location}>📅 {plantedOn}</Text>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{tree.co2Absorbed.toFixed(1)}kg</Text>
            <Text style={styles.statLabel}>CO₂/yr</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>+{tree.xpEarned}</Text>
            <Text style={styles.statLabel}>XP earned</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>🌱 {tree.growthStage}/5</Text>
            <Text style={styles.statLabel}>Growth stage</Text>
          </View>
        </View>

        {tree.publicId ? (
          <View style={styles.idPill}>
            <Text style={styles.idText}>ARTH Tree ID  #{tree.publicId}</Text>
          </View>
        ) : null}

        <Text style={styles.watermark}>🌱 Planted with ARTH</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: SPACING.lg,
  },
  speciesEmoji: {
    fontSize: 40,
  },
  kicker: {
    ...TYPOGRAPHY.kicker,
    color: COLORS.mintLight,
    marginTop: SPACING.sm,
  },
  name: {
    ...TYPOGRAPHY.display2,
    color: COLORS.white,
    marginTop: 4,
  },
  location: {
    ...TYPOGRAPHY.bodySmall,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
  },
  speciesLine: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.mintLight,
    marginTop: 2,
  },
  planter: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.white,
    fontWeight: '700',
    marginTop: 8,
  },
  idPill: {
    alignSelf: 'flex-start',
    marginTop: SPACING.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  idText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.white,
    fontWeight: '700',
  },
  statRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    marginTop: SPACING.lg,
  },
  stat: {},
  statValue: {
    ...TYPOGRAPHY.numberSmall,
    color: COLORS.white,
  },
  statLabel: {
    ...TYPOGRAPHY.label,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  watermark: {
    ...TYPOGRAPHY.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.xl,
  },
});
