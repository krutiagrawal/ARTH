import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import { COLORS, ON_DARK_SURFACE, ON_LIGHT_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import type { TrustScoreFactors } from '../../api/nurseryReputation';

function bandColor(score: number): string {
  if (score >= 85) return COLORS.sage;
  if (score >= 65) return COLORS.golden;
  if (score >= 40) return COLORS.sunrise;
  return COLORS.coral;
}

const FACTOR_LABELS: Record<keyof TrustScoreFactors, string> = {
  fulfilment: 'Order fulfilment',
  rating: 'Buyer ratings',
  inventoryFreshness: 'Inventory freshness',
  responsiveness: 'Responsiveness',
};

interface TrustScoreGaugeProps {
  score: number | null;
  factors?: TrustScoreFactors | null;
  variant?: 'dark' | 'light';
}

export function TrustScoreGauge({ score, factors, variant = 'dark' }: TrustScoreGaugeProps) {
  const onSurface = variant === 'dark' ? ON_DARK_SURFACE : ON_LIGHT_SURFACE;

  if (score == null) {
    return (
      <View style={styles.container}>
        <Text style={[styles.pendingLabel, { color: onSurface.secondary }]}>ARTH Trust Score</Text>
        <Text style={[styles.pendingValue, { color: onSurface.muted }]}>Not yet verified</Text>
      </View>
    );
  }

  const color = bandColor(score);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: onSurface.secondary }]}>ARTH Trust Score</Text>
        <Text style={[styles.score, { color }]}>{score}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      {factors && (
        <View style={styles.factors}>
          {(Object.keys(factors) as (keyof TrustScoreFactors)[]).map((key) => (
            <View key={key} style={styles.factorRow}>
              <Text style={[styles.factorLabel, { color: onSurface.muted }]}>{FACTOR_LABELS[key]}</Text>
              <Text style={[styles.factorValue, { color: onSurface.secondary }]}>{factors[key]}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 13, fontWeight: '600' },
  score: { fontSize: 28, fontWeight: '900' },
  pendingLabel: { fontSize: 13, fontWeight: '600' },
  pendingValue: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  track: { height: 8, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.full },
  factors: { marginTop: SPACING.xs, gap: 4 },
  factorRow: { flexDirection: 'row', justifyContent: 'space-between' },
  factorLabel: { fontSize: 12 },
  factorValue: { fontSize: 12, fontWeight: '700' },
});
