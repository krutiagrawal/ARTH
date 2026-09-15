import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from './AppText';
import { FormFieldShell, FORM_FIELD_VALUE_STYLE } from './FormField';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { searchAddress, type ApiAddressSuggestion } from '../../api/geocode';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;

interface AddressSearchFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Fired when the user taps a suggestion — use this to also capture lat/lng/city rather than
   * just the free-text label. */
  onSelectSuggestion?: (suggestion: ApiAddressSuggestion) => void;
  placeholder?: string;
  multiline?: boolean;
  dark?: boolean;
}

/**
 * A `FormField`-styled address input with Nominatim (OpenStreetMap) search-as-you-type
 * suggestions, so typing a real address doesn't require typing every line correctly by hand.
 * Search runs through our own backend (`/api/geocode/search`), which holds the required
 * Nominatim User-Agent header and request throttling — this component never calls Nominatim
 * directly.
 */
export function AddressSearchField({
  label,
  value,
  onChangeText,
  onSelectSuggestion,
  placeholder,
  multiline,
  dark,
}: AddressSearchFieldProps) {
  const [suggestions, setSuggestions] = useState<ApiAddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const query = value.trim();
    if (!focused || query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const results = await searchAddress(query);
        if (requestIdRef.current === id) setSuggestions(results);
      } catch {
        if (requestIdRef.current === id) setSuggestions([]);
      } finally {
        if (requestIdRef.current === id) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, focused]);

  const handleSelect = (suggestion: ApiAddressSuggestion) => {
    requestIdRef.current += 1; // invalidate any in-flight search so its response can't reopen the list
    setSuggestions([]);
    onChangeText(suggestion.label);
    onSelectSuggestion?.(suggestion);
  };

  return (
    <View style={styles.wrap}>
      <FormFieldShell
        label={label}
        dark={dark}
        rightAccessory={loading ? <ActivityIndicator size="small" color={dark ? COLORS.white : COLORS.sage} /> : undefined}
      >
        <TextInput
          style={[FORM_FIELD_VALUE_STYLE, dark && styles.inputDark, multiline && styles.multiline]}
          placeholderTextColor={dark ? ON_DARK_SURFACE.muted : COLORS.textLight}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          // A tap on a suggestion fires after this blur — delay hiding the list long enough for
          // that press to land, or the list would vanish out from under the tap first.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
      </FormFieldShell>

      {focused && suggestions.length > 0 && (
        <View style={[styles.dropdown, dark && styles.dropdownDark]}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={`${suggestion.lat},${suggestion.lng}`}
              style={[styles.suggestionRow, index > 0 && styles.suggestionDivider]}
              activeOpacity={0.7}
              onPress={() => handleSelect(suggestion)}
            >
              <Text style={[styles.suggestionText, dark && styles.suggestionTextDark]} numberOfLines={2}>
                📍 {suggestion.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 20 },
  inputDark: { color: ON_DARK_SURFACE.primary },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    // Opaque, unlike FormField's own transparent box — this floats over whatever's below it on
    // the page (other fields, text), so it needs a real fill or that content shows through.
    backgroundColor: COLORS.beigeLight,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    overflow: 'hidden',
    zIndex: 30,
  },
  dropdownDark: { backgroundColor: COLORS.nightSky, borderColor: 'rgba(255,255,255,0.25)' },
  suggestionRow: { paddingHorizontal: 14, paddingVertical: 10 },
  suggestionDivider: { borderTopWidth: 1, borderTopColor: 'rgba(139, 107, 71, 0.15)' },
  suggestionText: { fontSize: 13, color: COLORS.textPrimary },
  suggestionTextDark: { color: ON_DARK_SURFACE.primary },
});
