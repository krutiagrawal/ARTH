import React from 'react';
import { View, StyleSheet, TextInputProps, ViewStyle, StyleProp } from 'react-native';
import { Text, TextInput } from './AppText';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';

/**
 * A single labelled form field: one white rounded box holding a small sentence-case
 * label with the input directly beneath it. Replaces the uppercase-label +
 * separate-input pair that was duplicated byte-for-byte across seven NGO screens,
 * and is self-contained enough that forms no longer need an outer card wrapper.
 */
interface FormFieldProps extends Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'keyboardType' | 'autoCapitalize' | 'editable' | 'multiline' | 'secureTextEntry'
> {
  label: string;
  /** Rendered at the right edge of the box — e.g. a dropdown chevron. */
  rightAccessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /**
   * Set true when this field is rendered inside a dark surface — e.g. a `Sheet` currently in its
   * night-mode chrome. FormField has no way to know its own surroundings (most screens place it
   * on a fixed light cream background regardless of time of day, so it can't just check the
   * global time-of-day theme itself), so the caller must compute that and pass it down — see
   * Sheet.tsx's own `isNightMode` for the same check callers should reuse.
   */
  dark?: boolean;
}

export function FormField({ label, rightAccessory, style, multiline, dark, ...inputProps }: FormFieldProps) {
  return (
    <View style={[styles.box, dark && styles.boxDark, style]}>
      <View style={styles.textColumn}>
        <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>
        <TextInput
          style={[styles.input, dark && styles.inputDark, multiline && styles.multiline]}
          placeholderTextColor={dark ? ON_DARK_SURFACE.muted : COLORS.textLight}
          multiline={multiline}
          {...inputProps}
        />
      </View>
      {rightAccessory}
    </View>
  );
}

/**
 * Same box chrome as `FormField`, but the value area is caller-supplied — for
 * fields that open a picker instead of accepting typed input (dates, selects).
 */
export function FormFieldShell({
  label,
  children,
  rightAccessory,
  style,
  dark,
}: {
  label: string;
  children: React.ReactNode;
  rightAccessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}) {
  return (
    <View style={[styles.box, dark && styles.boxDark, style]}>
      <View style={styles.textColumn}>
        <Text style={[styles.label, dark && styles.labelDark]}>{label}</Text>
        {children}
      </View>
      {rightAccessory}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // Fully transparent: the field is an outline on the page, not a panel laid over it. Both a
    // white and an off-white fill still read as a lighter rectangle punched into the cream.
    //
    // With no fill the border has to carry the whole affordance, so it's firmer than it was — and
    // the drop shadow is gone deliberately. A shadow cast by a transparent box has nothing to sit
    // under: it renders as a detached halo on iOS, and Android's `elevation` paints its own opaque
    // rectangle behind the view, which would put the light fill straight back.
    backgroundColor: 'transparent',
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
  },
  boxDark: { borderColor: 'rgba(255,255,255,0.25)' },
  textColumn: { flex: 1 },
  label: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  labelDark: { color: ON_DARK_SURFACE.secondary },
  input: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  inputDark: { color: ON_DARK_SURFACE.primary },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
});

export const FORM_FIELD_VALUE_STYLE = styles.input;
