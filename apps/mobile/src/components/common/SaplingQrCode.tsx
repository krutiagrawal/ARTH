import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './AppText';
import QRCode from 'react-native-qrcode-svg';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { WEB_PUBLIC_URL } from '../../api/client';

/**
 * Renders a scannable QR for one sapling unit — encodes a plain web URL (not a custom app
 * scheme) so it also resolves outside the app if someone scans it with a regular camera app.
 * `ScanSaplingScreen` reads the unitId back out of this same URL shape (the last path segment).
 */
export function saplingUnitUrl(unitId: string): string {
  return `${WEB_PUBLIC_URL}/sapling/${unitId}`;
}

export function SaplingQrCode({
  unitId,
  size = 120,
  label,
}: {
  unitId: string;
  size?: number;
  label?: string;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.qrBox}>
        <QRCode value={saplingUnitUrl(unitId)} size={size} color={COLORS.textPrimary} backgroundColor={COLORS.white} />
      </View>
      {label ? <Text style={styles.label} numberOfLines={1}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  qrBox: {
    padding: 10,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.sand,
  },
  label: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, maxWidth: 140, textAlign: 'center' },
});
