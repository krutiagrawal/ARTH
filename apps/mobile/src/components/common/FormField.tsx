import React from 'react';
import { View, StyleSheet, TextInputProps, ViewStyle, StyleProp } from 'react-native';
import { Text, TextInput } from './AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';

/**
 * A single labelled form field: one white rounded box holding a small sentence-case
 * label with the input directly beneath it. Replaces the uppercase-label +
 * separate-input pair that was duplicated byte-for-byte across seven NGO screens,
 * and is self-contained enough that forms no longer need an outer card wrapper.
 */
interface FormFieldProps extends Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'placeholder' | 'keyboardType' | 'autoCapitalize' | 'editable' | 'multiline'
> {
  label: string;
  /** Rendered at the right edge of the box — e.g. a dropdown chevron. */
  rightAccessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function FormField({ label, rightAccessory, style, multiline, ...inputProps }: FormFieldProps) {
  return (
    <View style={[styles.box, style]}>
      <View style={styles.textColumn}>
        <Text style={styles.label}>{label}</Text>
        <TextInput
          style={[styles.input, multiline && styles.multiline]}
          placeholderTextColor={COLORS.textMuted}
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
}: {
  label: string;
  children: React.ReactNode;
  rightAccessory?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.box, style]}>
      <View style={styles.textColumn}>
        <Text style={styles.label}>{label}</Text>
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
  textColumn: { flex: 1 },
  label: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  input: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
});

export const FORM_FIELD_VALUE_STYLE = styles.input;
