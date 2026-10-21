import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { RequiredMark } from '../common/RequiredMark';
import { Sheet } from '../common/Sheet';
import { FormField } from '../common/FormField';
import { PhoneField } from '../common/PhoneField';
import { AnimatedButton } from '../common/AnimatedButton';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { isValidPhone } from '../../utils/validation';
import { useKeyboardHeight } from '../../hooks/useKeyboardHeight';
import type { ApiDrive, DriveRsvpInput } from '../../api/drives';

interface Props {
  visible: boolean;
  drive: ApiDrive;
  /** Pre-filled from the volunteer's profile. */
  defaultPhone?: string | null;
  submitting: boolean;
  error?: string;
  onClose: () => void;
  onSubmit: (input: DriveRsvpInput) => void;
}

const OWN_WAY = 'own';
// Letters (any script), spaces and the few punctuation marks real names use.
const NAME_REGEX = /^[\p{L}][\p{L} .'-]*$/u;

/** Specific reason a phone value is wrong, or null when it's fine. */
function phoneProblem(value: string): string | null {
  if (!value) return 'Enter a mobile number';
  if (value.length < 10) return `Enter all 10 digits (${value.length}/10)`;
  if (!isValidPhone(value)) return 'Mobile numbers start with 6, 7, 8 or 9';
  return null;
}

function nameProblem(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter your emergency contact’s name';
  if (v.length < 2) return 'Name is too short';
  if (!NAME_REGEX.test(v)) return 'Use letters only – no numbers or symbols';
  return null;
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });

/**
 * The RSVP isn't created by tapping "I'm in" – it's created when this form is submitted, so the
 * NGO always has a reachable phone, an emergency contact and (when it runs the transport) knows
 * where each volunteer boards.
 */
export function DriveRsvpSheet({ visible, drive, defaultPhone, submitting, error, onClose, onSubmit }: Props) {
  const keyboardHeight = useKeyboardHeight();
  const hasTransport = drive.transportMode === 'ngo_provided' && drive.pickupPoints.length > 0;

  const [phone, setPhone] = useState('');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [boarding, setBoarding] = useState<string | null>(null); // pickup point id | OWN_WAY
  const [note, setNote] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [tried, setTried] = useState(false);
  // Fields the user has left at least once – their errors show without waiting for a submit tap.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));
  const show = (k: string) => tried || !!touched[k];

  useEffect(() => {
    if (!visible) return;
    setPhone(defaultPhone ?? '');
    setEcName('');
    setEcPhone('');
    setBoarding(null);
    setNote('');
    setAgreed(false);
    setTried(false);
    setTouched({});
  }, [visible, defaultPhone]);

  const phoneError = show('phone') ? phoneProblem(phone) : null;
  const ecNameError = show('ecName') ? nameProblem(ecName) : null;
  // The emergency contact must be someone else – it's who the NGO calls if the volunteer can't be reached.
  const ecPhoneError = show('ecPhone') ? phoneProblem(ecPhone) ?? (ecPhone === phone ? 'Use a different number from your own' : null) : null;
  const boardingError = tried && hasTransport && !boarding ? 'Choose where you will board, or that you will come yourself' : null;
  const agreedError = tried && !agreed;

  const handleSubmit = () => {
    setTried(true);
    if (phoneProblem(phone) || nameProblem(ecName) || phoneProblem(ecPhone) || ecPhone === phone || (hasTransport && !boarding) || !agreed) return;
    onSubmit({
      phone,
      emergencyContactName: ecName.trim(),
      emergencyContactPhone: ecPhone,
      pickupPointId: hasTransport && boarding && boarding !== OWN_WAY ? boarding : null,
      note: note.trim() || undefined,
      confirmed: true,
    });
  };

  const options = hasTransport
    ? [
        ...drive.pickupPoints.map((p, i) => ({
          id: p.id,
          title: `Stop ${i + 1} · ${formatTime(p.arrivalBy)}`,
          sub: p.address,
        })),
        { id: OWN_WAY, title: 'I’ll come by myself', sub: 'Make your own way to the drive location' },
      ]
    : [];

  return (
    <Sheet visible={visible} onClose={onClose} title="Confirm your RSVP" scrollable>
      <View style={{ paddingBottom: keyboardHeight }}>
        <Text style={styles.intro}>
          {drive.ngoName} will use these details to reach you about “{drive.title}”.
        </Text>

        <PhoneField required label="Your phone number" value={phone} onChangeText={setPhone} onBlur={() => touch('phone')} error={phoneError} />

        {hasTransport && (
          <>
            <Text style={styles.sectionLabel}>How will you get there?</Text>
            {options.map((o) => {
              const selected = boarding === o.id;
              return (
                <TouchableOpacity
                  key={o.id}
                  activeOpacity={0.8}
                  onPress={() => setBoarding(o.id)}
                  style={[styles.option, selected && styles.optionSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{o.title}</Text>
                    <Text style={styles.optionSub} numberOfLines={2}>{o.sub}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {boardingError ? <Text style={styles.error}>{boardingError}</Text> : null}
          </>
        )}

        <Text style={styles.sectionLabel}>Emergency contact</Text>
        <FormField required label="Name" value={ecName} onChangeText={setEcName} onBlur={() => touch('ecName')} placeholder="Who should we call?" maxLength={100} />
        {ecNameError ? <Text style={styles.error}>{ecNameError}</Text> : null}
        <PhoneField required label="Phone number" value={ecPhone} onChangeText={setEcPhone} onBlur={() => touch('ecPhone')} error={ecPhoneError} />

        <FormField
          label="Note for the organiser (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. bringing my own gloves"
          maxLength={300}
          multiline
          style={styles.noteField}
        />

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setAgreed((v) => !v)}
          style={styles.agreeRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: agreed }}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked, agreedError && styles.checkboxError]}>
            {agreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.agreeText}>I’ll attend and follow the organiser’s instructions.<RequiredMark /></Text>
        </TouchableOpacity>
        {agreedError ? <Text style={styles.error}>Please confirm to continue</Text> : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <AnimatedButton
          label={submitting ? 'Please wait…' : 'Confirm RSVP'}
          onPress={handleSubmit}
          disabled={submitting}
          size="lg"
          fullWidth
          style={styles.submit}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginTop: 14, marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
  },
  optionSelected: { borderWidth: 2.5 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: COLORS.warmBrown },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.warmBrown },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  optionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  noteField: { marginTop: 12 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.sand, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  checkboxError: { borderColor: COLORS.coral },
  checkmark: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  agreeText: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  error: { fontSize: 12, color: COLORS.coral, marginTop: 4 },
  submit: { marginTop: 16 },
});
