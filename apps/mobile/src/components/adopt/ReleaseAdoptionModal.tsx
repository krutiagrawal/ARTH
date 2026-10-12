import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, ScrollView, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { Text, TextInput } from '../common/AppText';
import { COLORS } from '../../constants/colors';

const REASONS = [
  { label: 'Moved away', emoji: '🧳', hint: "I'm no longer near the tree" },
  { label: "Can't care for it", emoji: '🌿', hint: "I don't have the time or means right now" },
  { label: 'Adopted by mistake', emoji: '🙈', hint: 'I tapped adopt by accident' },
  { label: 'Other', emoji: '✏️', hint: 'Something else' },
] as const;
type Reason = (typeof REASONS)[number]['label'];

/** Single-select reasons as a vertical list; one outline slides to the chosen row. */
function ReasonList({ value, onChange }: { value: Reason | null; onChange: (r: Reason | null) => void }) {
  const layouts = useRef<Record<string, { y: number; height: number }>>({});
  const y = useSharedValue(0);
  const h = useSharedValue(0);
  const opacity = useSharedValue(0);
  const placed = useRef<Reason | null>(null);

  useEffect(() => {
    if (!value) {
      opacity.value = withTiming(0, { duration: 160 });
      placed.current = null;
      return;
    }
    const l = layouts.current[value];
    if (!l) return;
    h.value = l.height;
    if (placed.current === null) {
      // First selection: appear in place, then glide for later changes.
      y.value = l.y;
      opacity.value = withTiming(1, { duration: 160 });
    } else {
      y.value = withTiming(l.y, { duration: 240, easing: Easing.out(Easing.cubic) });
    }
    placed.current = value;
  }, [value]);

  const indicator = useAnimatedStyle(() => ({ opacity: opacity.value, height: h.value, transform: [{ translateY: y.value }] }));
  const onRowLayout = (label: string) => (e: LayoutChangeEvent) => {
    layouts.current[label] = { y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height };
  };

  return (
    <View>
      <Animated.View pointerEvents="none" style={[styles.reasonIndicator, indicator]} />
      {REASONS.map((r) => {
        const active = value === r.label;
        return (
          <TouchableOpacity
            key={r.label}
            style={styles.reasonRow}
            activeOpacity={0.7}
            onLayout={onRowLayout(r.label)}
            onPress={() => onChange(active ? null : r.label)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
          >
            <Text style={styles.reasonEmoji}>{r.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.reasonLabel}>{r.label}</Text>
              <Text style={styles.reasonHint}>{r.hint}</Text>
            </View>
            <View style={[styles.radio, active && styles.radioOn]}>{active ? <View style={styles.radioDot} /> : null}</View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Past this many days a release also asks the adopter to type the tree's nickname. */
const TYPED_CONFIRM_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

interface Props {
  visible: boolean;
  nickname: string;
  /** ISO date the user adopted the tree; drives the stronger confirmation for long-held trees. */
  adoptedAt?: string;
  busy?: boolean;
  onCancel: () => void;
  /** Called with the optional reason (chip + note) the NGO will be shown. */
  onConfirm: (reason?: string) => void;
}

/**
 * Releasing a tree is not a simple yes/no: it spells out what the adopter gives up, lets them say
 * why (the NGO is told), and for a tree they've had a while asks them to type its name first.
 */
export function ReleaseAdoptionModal({ visible, nickname, adoptedAt, busy, onCancel, onConfirm }: Props) {
  const [reason, setReason] = useState<Reason | null>(null);
  const [note, setNote] = useState('');
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (visible) {
      setReason(null);
      setNote('');
      setTyped('');
    }
  }, [visible]);

  const heldDays = adoptedAt ? Math.floor((Date.now() - new Date(adoptedAt).getTime()) / DAY_MS) : 0;
  const needsTyped = heldDays >= TYPED_CONFIRM_AFTER_DAYS;
  const typedOk = !needsTyped || typed.trim().toLowerCase() === nickname.trim().toLowerCase();

  const submit = () => {
    const parts = [reason, note.trim()].filter(Boolean);
    onConfirm(parts.length ? parts.join(': ') : undefined);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>Release {nickname}?</Text>
            <Text style={styles.lead}>
              {nickname} goes back to the NGO and anyone can adopt it. You can adopt it again only if no one else does first.
            </Text>

            <View style={styles.list}>
              <Text style={styles.bullet}>• You stop being its adopter and won't get its updates.</Text>
              <Text style={styles.bullet}>• Your check-ins and photos for this tree are hidden from the next adopter.</Text>
              <Text style={styles.bullet}>• Community updates still waiting for your decision are declined.</Text>
              <Text style={styles.bullet}>• The NGO is told you released it.</Text>
            </View>

            <Text style={styles.label}>Why are you releasing it? (optional)</Text>
            <ReasonList value={reason} onChange={setReason} />
            {reason ? (
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={reason === 'Other' ? 'Tell the NGO what happened' : 'Add a note for the NGO (optional)'}
                placeholderTextColor={COLORS.textLight}
                maxLength={200}
                multiline
                style={[styles.input, styles.noteInput]}
              />
            ) : null}

            {needsTyped && (
              <>
                <Text style={styles.label}>
                  You've cared for it for {heldDays} days. Type "{nickname}" to confirm.
                </Text>
                <TextInput
                  value={typed}
                  onChangeText={setTyped}
                  placeholder={nickname}
                  placeholderTextColor={COLORS.textLight}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                />
              </>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel} disabled={busy} accessibilityRole="button">
              <Text style={styles.cancelText}>Keep tree</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.release, (!typedOk || busy) && styles.disabled]}
              onPress={submit}
              disabled={!typedOk || busy}
              accessibilityRole="button"
            >
              <Text style={styles.releaseText}>{busy ? 'Releasing…' : 'Release'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  sheet: { maxHeight: '88%', backgroundColor: COLORS.cream, borderRadius: 22, padding: 20, borderWidth: 1.5, borderColor: COLORS.warmBrown },
  title: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  lead: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, lineHeight: 19 },
  list: { marginTop: 12, gap: 4 },
  bullet: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 19 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, marginTop: 16, marginBottom: 6 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 6 },
  reasonIndicator: { position: 'absolute', left: 0, right: 0, top: 0, borderWidth: 1.5, borderColor: COLORS.warmBrown, borderRadius: 14 },
  reasonEmoji: { fontSize: 22 },
  reasonLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  reasonHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderWidth: 2 },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.warmBrown },
  noteInput: { minHeight: 64, textAlignVertical: 'top' },
  input: {
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  button: { flex: 1, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancel: { borderWidth: 2, borderColor: COLORS.warmBrown },
  cancelText: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  release: { borderWidth: 2, borderColor: COLORS.dangerDark },
  releaseText: { fontSize: 14, fontWeight: '800', color: COLORS.dangerDark },
  disabled: { opacity: 0.4 },
});
