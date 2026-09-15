import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput } from './AppText';
import { FormFieldShell, FORM_FIELD_VALUE_STYLE } from './FormField';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { sanitizePhoneDigits } from '../../utils/validation';

interface PhoneFieldProps {
  label?: string;
  value: string;
  onChangeText: (digits: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  dark?: boolean;
  /** Shown below the field — format error, "already registered", etc. */
  error?: string | null;
}

/**
 * A `+91`-prefixed, digits-only phone input capped at 10 characters — the country code is a fixed
 * visual prefix, never part of the stored value, so every phone field in the app produces the
 * same bare-10-digit shape regardless of what the user tries to type.
 */
export function PhoneField({ label = 'Phone number', value, onChangeText, onBlur, placeholder = '98765 43210', dark, error }: PhoneFieldProps) {
  return (
    <View style={styles.wrap}>
      <FormFieldShell label={label} dark={dark}>
        <View style={styles.row}>
          <Text style={[styles.prefix, dark && styles.prefixDark]}>+91</Text>
          <View style={[styles.divider, dark && styles.dividerDark]} />
          <TextInput
            style={[FORM_FIELD_VALUE_STYLE, styles.input, dark && styles.inputDark]}
            placeholderTextColor={dark ? ON_DARK_SURFACE.muted : COLORS.textLight}
            value={value}
            onChangeText={(text) => onChangeText(sanitizePhoneDigits(text))}
            onBlur={onBlur}
            placeholder={placeholder}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
      </FormFieldShell>
      {error ? <Text style={[styles.errorText, dark && styles.errorTextDark]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  prefix: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  prefixDark: { color: COLORS.white },
  divider: { width: 1, height: 18, backgroundColor: 'rgba(139, 107, 71, 0.30)', marginHorizontal: 8 },
  dividerDark: { backgroundColor: 'rgba(255,255,255,0.3)' },
  input: { flex: 1, paddingVertical: 0 },
  inputDark: { color: ON_DARK_SURFACE.primary },
  errorText: { fontSize: 12, color: COLORS.dangerDark, marginTop: 4, marginBottom: 8 },
  errorTextDark: { color: COLORS.amberLight },
});
