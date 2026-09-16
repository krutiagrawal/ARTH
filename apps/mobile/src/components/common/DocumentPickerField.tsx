import React, { useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './AppText';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { useHaptics } from '../../hooks/useHaptics';
import type { PickedPhoto } from './PhotoPickerField';

interface DocumentPickerFieldProps {
  doc: PickedPhoto | null;
  onChange: (doc: PickedPhoto | null) => void;
  label?: string;
  hint?: string;
  /** Translucent-white chrome for night-gradient screens (signup wizards), matching FormField's dark variant. */
  dark?: boolean;
}

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];

/**
 * Row-style picker for certificate/registration documents — unlike PhotoPickerField's big
 * drop-zone (built for a single photo per step), this is compact since a wizard step here shows
 * several of these back to back (one per registration type). Accepts a PDF or a photo of the
 * document, since scanned certificates arrive as either.
 */
export function DocumentPickerField({ doc, onChange, label, hint, dark }: DocumentPickerFieldProps) {
  const { medium, selection } = useHaptics();

  const pick = useCallback(async () => {
    medium();
    const result = await DocumentPicker.getDocumentAsync({ type: ACCEPTED_TYPES, copyToCacheDirectory: true });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    onChange({ uri: asset.uri, name: asset.name ?? 'document', type: asset.mimeType ?? 'application/pdf' });
  }, [medium, onChange]);

  const remove = useCallback(() => {
    selection();
    onChange(null);
  }, [selection, onChange]);

  const isPdf = doc?.type === 'application/pdf';

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text> : null}
      <TouchableOpacity
        style={[styles.row, dark ? styles.rowDark : styles.rowLight, doc && styles.rowFilled]}
        onPress={pick}
        activeOpacity={0.8}
      >
        <Text style={styles.icon}>{doc ? (isPdf ? '📄' : '🖼️') : '📎'}</Text>
        <View style={styles.textCol}>
          <Text style={[styles.rowText, dark && styles.rowTextDark]} numberOfLines={1}>
            {doc ? doc.name : 'Tap to upload'}
          </Text>
          {hint && !doc ? <Text style={[styles.rowHint, dark && styles.rowHintDark]}>{hint}</Text> : null}
        </View>
        {doc && (
          <TouchableOpacity onPress={remove} hitSlop={8} style={styles.removeBtn}>
            <Text style={styles.removeText}>✕</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: SPACING.sm },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  labelDark: { color: COLORS.white },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    gap: 10,
  },
  rowLight: { borderColor: 'rgba(139, 107, 71, 0.35)', backgroundColor: 'transparent' },
  rowDark: { borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.08)' },
  rowFilled: { borderStyle: 'solid' },
  icon: { fontSize: 20 },
  textCol: { flex: 1 },
  rowText: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  rowTextDark: { color: COLORS.white },
  rowHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  rowHintDark: { color: ON_DARK_SURFACE.muted, marginTop: 2 },
  removeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
});
