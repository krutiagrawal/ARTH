import { RequiredMark } from '../common/RequiredMark';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  TextInputProps,
} from 'react-native';
import { Text, TextInput } from '../common/AppText';
import { Toggle } from '../common/Toggle';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateLayout = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

/**
 * Lets the wizard point one validation message at one field. A field opts in with `name`; when it
 * matches `errorKey` it shows `message` right under itself and asks the screen to scroll it into view.
 * `id` changes on every failed attempt so tapping Continue again re-scrolls to the same field.
 */
interface FormErrorState {
  errorKey: string | null;
  message: string | null;
  id: number;
  scrollToView: (view: View) => void;
}
const FormErrorContext = createContext<FormErrorState>({ errorKey: null, message: null, id: 0, scrollToView: () => {} });
export const FormErrorProvider = FormErrorContext.Provider;

function useFieldError(name: string | undefined, ref: React.RefObject<View | null>): string | null {
  const ctx = useContext(FormErrorContext);
  const active = !!name && ctx.errorKey === name;
  useEffect(() => {
    if (active && ref.current) ctx.scrollToView(ref.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ctx.id]);
  return active ? ctx.message : null;
}

/** Label above the input, with a quiet "Optional" tag so required fields stand out by contrast. */
export function NgoField({
  name,
  label,
  required,
  optional,
  hint,
  error,
  multiline,
  ...inputProps
}: {
  /** Key matched against the wizard's current validation error. */
  name?: string;
  label: string;
  /** Red asterisk after the label – set on every field the wizard's validation requires. */
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string | null;
} & Omit<TextInputProps, 'style' | 'placeholderTextColor'>) {
  const ref = useRef<View>(null);
  const fieldError = useFieldError(name, ref);
  const shownError = error ?? fieldError;
  return (
    <View ref={ref} style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          {label}
          {required ? <RequiredMark dark /> : null}
        </Text>
        {optional && <Text style={styles.optionalTag}>Optional</Text>}
      </View>
      <TextInput
        style={[styles.input, multiline && styles.multiline]}
        placeholderTextColor={ON_DARK_SURFACE.muted}
        multiline={multiline}
        {...inputProps}
      />
      {shownError ? <Text style={styles.error}>{shownError}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Labelled wrapper for components that bring their own input (pickers, chip lists) so spacing stays uniform. */
export function FieldGroup({ name, children }: { name?: string; children: React.ReactNode }) {
  const ref = useRef<View>(null);
  const error = useFieldError(name, ref);
  return (
    <View ref={ref} style={styles.field}>
      {children}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Collapsible row for optional fields. Set `forceOpen` to reveal it when a hidden field fails validation. */
export function Disclosure({
  title,
  subtitle,
  forceOpen,
  children,
}: {
  title: string;
  subtitle?: string;
  forceOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      animateLayout();
      setOpen(true);
    }
  }, [forceOpen]);

  const toggle = () => {
    animateLayout();
    setOpen((o) => !o);
  };

  return (
    <View style={styles.disclosure}>
      <TouchableOpacity style={styles.disclosureHeader} onPress={toggle} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.disclosureTitle}>{title}</Text>
          {subtitle ? <Text style={styles.disclosureSubtitle}>{subtitle}</Text> : null}
        </View>
        <Text style={styles.chevron}>{open ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>
      {open && <View style={styles.disclosureBody}>{children}</View>}
    </View>
  );
}

/** One registration (12A, 80G, ...): a card with a toggle that reveals its number and certificate fields. */
export function RegistrationCard({
  icon,
  title,
  description,
  value,
  onValueChange,
  children,
}: {
  icon: string;
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  const change = (v: boolean) => {
    animateLayout();
    onValueChange(v);
  };

  return (
    <View style={[styles.regCard, value && styles.regCardOn]}>
      <View style={styles.regHeader}>
        <Text style={styles.regIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.regTitle}>{title}</Text>
          {description ? <Text style={styles.regDescription}>{description}</Text> : null}
        </View>
        <Toggle value={value} onValueChange={change} offColor="rgba(255,255,255,0.25)" onColor={COLORS.mint} />
      </View>
      {value && children ? <View style={styles.regBody}>{children}</View> : null}
    </View>
  );
}

/** Thin animated bar plus a single "Step n of N · Title" line. */
export function StepProgress({ current, total, title }: { current: number; total: number; title: string }) {
  const progress = useRef(new Animated.Value((current + 1) / total)).current;

  useEffect(() => {
    Animated.timing(progress, { toValue: (current + 1) / total, duration: 300, useNativeDriver: false }).start();
  }, [current, total, progress]);

  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
      </View>
      <Text style={styles.progressLabel}>
        Step {current + 1} of {total} · {title}
      </Text>
    </View>
  );
}

/** Fades and slides its children in whenever `stepKey` changes. */
export function StepTransition({ stepKey, children }: { stepKey: string; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [stepKey, anim]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: SPACING.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.white },
  optionalTag: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.white,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 6, lineHeight: 17 },
  error: { fontSize: 12, color: COLORS.amberLight, marginTop: 6 },

  disclosure: {
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  disclosureHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.md },
  disclosureTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  disclosureSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  chevron: { fontSize: 18, color: 'rgba(255,255,255,0.75)', fontWeight: '700' },
  disclosureBody: { paddingHorizontal: SPACING.md, paddingTop: SPACING.xs },

  regCard: {
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: SPACING.md,
    marginBottom: SPACING.sm + 2,
  },
  regCardOn: { borderColor: COLORS.mint, backgroundColor: 'rgba(255,255,255,0.1)' },
  regHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  regIcon: { fontSize: 22 },
  regTitle: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  regDescription: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  regBody: { marginTop: SPACING.md },

  progressWrap: { marginBottom: SPACING.lg },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: COLORS.mint },
  progressLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.75)', marginTop: 8, letterSpacing: 0.3 },
});
