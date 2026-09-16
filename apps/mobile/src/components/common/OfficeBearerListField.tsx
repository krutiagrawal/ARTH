import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, TextInput } from './AppText';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { PhoneField } from './PhoneField';
import { useHaptics } from '../../hooks/useHaptics';

export interface OfficeBearer {
  name: string;
  designation: string;
  phone: string;
  email: string;
}

interface OfficeBearerListFieldProps {
  bearers: OfficeBearer[];
  onChange: (bearers: OfficeBearer[]) => void;
  max?: number;
}

const EMPTY_BEARER: OfficeBearer = { name: '', designation: '', phone: '', email: '' };

/**
 * 0-N repeatable office-bearer cards, capped at `max` (3, per NGO Darpan's own convention of
 * capturing multiple key functionaries). Entirely optional — an NGO with just a primary contact
 * can leave this empty.
 */
export function OfficeBearerListField({ bearers, onChange, max = 3 }: OfficeBearerListFieldProps) {
  const { medium, selection } = useHaptics();

  const addBearer = useCallback(() => {
    medium();
    onChange([...bearers, { ...EMPTY_BEARER }]);
  }, [bearers, onChange, medium]);

  const updateBearer = useCallback(
    (index: number, patch: Partial<OfficeBearer>) => {
      onChange(bearers.map((b, i) => (i === index ? { ...b, ...patch } : b)));
    },
    [bearers, onChange],
  );

  const removeBearer = useCallback(
    (index: number) => {
      selection();
      onChange(bearers.filter((_, i) => i !== index));
    },
    [bearers, onChange, selection],
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Office bearers</Text>
      <Text style={styles.hint}>Optional — 2-3 key trustees/board members strengthens your application.</Text>

      {bearers.map((bearer, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Office bearer {index + 1}</Text>
            <TouchableOpacity onPress={() => removeBearer(index)} hitSlop={8}>
              <Text style={styles.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Full name"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            value={bearer.name}
            onChangeText={(v) => updateBearer(index, { name: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Designation (e.g. Trustee, Secretary)"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            value={bearer.designation}
            onChangeText={(v) => updateBearer(index, { designation: v })}
          />
          <PhoneField
            dark
            label="Phone"
            value={bearer.phone}
            onChangeText={(v) => updateBearer(index, { phone: v })}
          />
          <TextInput
            style={styles.input}
            placeholder="Email (optional)"
            placeholderTextColor={ON_DARK_SURFACE.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={bearer.email}
            onChangeText={(v) => updateBearer(index, { email: v })}
          />
        </View>
      ))}

      {bearers.length < max && (
        <TouchableOpacity style={styles.addBtn} onPress={addBearer}>
          <Text style={styles.addBtnText}>+ Add office bearer</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.sm },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.white, marginBottom: 2 },
  hint: { fontSize: 11, color: ON_DARK_SURFACE.muted, marginBottom: 10, lineHeight: 15 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 12, fontWeight: '700', color: COLORS.mint, textTransform: 'uppercase', letterSpacing: 0.5 },
  removeText: { fontSize: 12, fontWeight: '700', color: COLORS.coral },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  addBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.mint },
});
