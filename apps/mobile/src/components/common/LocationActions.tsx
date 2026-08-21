import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';

// Ola has no publicly documented deep link for an arbitrary destination
// address (unlike Uber's `dropoff[formatted_address]` universal link), so it
// falls back to just opening the Ola app/site rather than a broken deep link.
const OLA_FALLBACK_URL = 'https://www.olacabs.com/';

export function LocationActions({ label, address }: { label?: string; address: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!address) return null;

  const copy = async () => {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const query = encodeURIComponent(address);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const uberUrl = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${query}`;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.addressRow}>
        <Text style={styles.addressIcon}>📍</Text>
        <Text style={styles.addressText}>{address}</Text>
      </View>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionChip} onPress={copy}>
          <Text style={styles.actionChipText}>{copied ? '✓ Copied' : 'Copy address'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionChip} onPress={() => Linking.openURL(mapsUrl)}>
          <Text style={styles.actionChipText}>Maps</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionChip} onPress={() => Linking.openURL(uberUrl)}>
          <Text style={styles.actionChipText}>Uber</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionChip} onPress={() => Linking.openURL(OLA_FALLBACK_URL)}>
          <Text style={styles.actionChipText}>Ola</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(80,140,70,0.08)',
    borderRadius: RADIUS.lg,
    padding: 12,
    marginBottom: 12,
  },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  addressIcon: { fontSize: 13 },
  addressText: { fontSize: 13, color: COLORS.forestDeep, fontWeight: '500', flex: 1 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionChip: {
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(94,133,80,0.3)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionChipText: { fontSize: 12, fontWeight: '600', color: COLORS.forest },
});
