import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Text, TextInput } from './AppText';
import { FormFieldShell, FORM_FIELD_VALUE_STYLE } from './FormField';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { searchAddress, reverseGeocode, type ApiAddressSuggestion } from '../../api/geocode';
import { getCurrentPositionWithTimeout } from '../../utils/location';

const MIN_QUERY_LENGTH = 3;
const DEBOUNCE_MS = 350;

interface AddressSearchFieldProps {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  /** Fired when the user taps a suggestion – use this to also capture lat/lng/city rather than
   * just the free-text label. */
  onSelectSuggestion?: (suggestion: ApiAddressSuggestion) => void;
  placeholder?: string;
  /** Wraps the value across multiple lines instead of clipping/horizontally-scrolling a single
   * line – on, by default, since a resolved address is usually too long for one line. */
  multiline?: boolean;
  dark?: boolean;
  /** Renders suggestions in normal flow (pushing content down) instead of floating over it. Use
   * inside a ScrollView so the whole list can be scrolled into view - a floating dropdown extends
   * past its parent's bounds, where it can't be scrolled to or reliably tapped. */
  inline?: boolean;
  /** Bias suggestions toward this position (e.g. the user's GPS fix). */
  near?: { lat: number; lng: number };
  onFocus?: () => void;
  /** Shows a "Use my current location" action - for places Nominatim has no entry for. */
  allowCurrentLocation?: boolean;
  maxLength?: number;
}

/**
 * A `FormField`-styled address input with Nominatim (OpenStreetMap) search-as-you-type
 * suggestions, so typing a real address doesn't require typing every line correctly by hand.
 * Search runs through our own backend (`/api/geocode/search`), which holds the required
 * Nominatim User-Agent header and request throttling – this component never calls Nominatim
 * directly.
 */
export function AddressSearchField({
  label,
  required,
  value,
  onChangeText,
  onSelectSuggestion,
  placeholder,
  multiline = true,
  dark,
  inline,
  near,
  onFocus,
  allowCurrentLocation,
  maxLength,
}: AddressSearchFieldProps) {
  const [suggestions, setSuggestions] = useState<ApiAddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  // 'error' = the request failed (network/API); 'empty' = it worked but nothing matched.
  const [searchState, setSearchState] = useState<'idle' | 'error' | 'empty'>('idle');
  const [focused, setFocused] = useState(false);
  const requestIdRef = useRef(0);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  // Selecting a suggestion changes `value` programmatically – without this guard, the effect
  // below (which treats any `value` change while focused as a fresh search query) would
  // immediately re-search for the address text itself and reopen the dropdown right under it.
  const justSelectedRef = useRef(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const useCurrentLocation = async () => {
    setLocationError(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission is off. Enable it in settings, or type the address.');
        return;
      }
      const pos = await getCurrentPositionWithTimeout({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;

      let suggestion: ApiAddressSuggestion | null = await reverseGeocode(lat, lng).catch(() => null);
      if (!suggestion) {
        // Nominatim has no entry here - fall back to the device's own geocoder.
        const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }).catch(() => []);
        const parts = place
          ? [place.name, place.street, place.district, place.city, place.region, place.postalCode].filter(
              (v, i, arr): v is string => !!v && arr.indexOf(v) === i,
            )
          : [];
        suggestion = {
          label: parts.length ? parts.join(', ') : `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
          city: place?.city ?? place?.subregion ?? null,
        };
      }
      requestIdRef.current += 1;
      justSelectedRef.current = true;
      setSuggestions([]);
      onChangeText(suggestion.label);
      onSelectSuggestion?.(suggestion);
    } catch {
      setLocationError("Couldn't get your location. Try again or type the address.");
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    const query = value.trim();
    if (!focused || query.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setSearchState('idle');
      setLoading(false);
      return;
    }

    setLoading(true);
    const id = ++requestIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const results = await searchAddress(query, near);
        if (requestIdRef.current === id) {
          setSuggestions(results);
          setSearchState(results.length ? 'idle' : 'empty');
        }
      } catch (e) {
        console.warn('[AddressSearchField] search failed', e);
        if (requestIdRef.current === id) {
          setSuggestions([]);
          setSearchState('error');
        }
      } finally {
        if (requestIdRef.current === id) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, focused]);

  const handleSelect = (suggestion: ApiAddressSuggestion) => {
    requestIdRef.current += 1; // invalidate any in-flight search so its response can't reopen the list
    justSelectedRef.current = true;
    setSuggestions([]);
    onChangeText(suggestion.label);
    onSelectSuggestion?.(suggestion);
    // The TextInput is still focused at this point (the tap landed before the delayed blur
    // below runs) – on Android, a controlled TextInput that still holds native focus can ignore
    // a programmatic `value` update entirely, silently keeping whatever the user last typed on
    // screen. Blurring it releases native ownership of the text so the new `value` actually
    // renders.
    inputRef.current?.blur();
  };

  return (
    <View style={styles.wrap}>
      <FormFieldShell
        label={label}
        required={required}
        dark={dark}
        rightAccessory={loading ? <ActivityIndicator size="small" color={dark ? COLORS.white : COLORS.sage} /> : undefined}
      >
        <TextInput
          ref={inputRef}
          style={[FORM_FIELD_VALUE_STYLE, dark && styles.inputDark, multiline && styles.multiline]}
          placeholderTextColor={dark ? ON_DARK_SURFACE.muted : COLORS.textLight}
          value={value}
          // Typing is proof the field is active even if the platform never delivers onFocus
          // (seen with multiline inputs on some Android builds) - without this no search ever starts.
          onChangeText={(text) => {
            setFocused(true);
            onChangeText(text);
          }}
          placeholder={placeholder}
          multiline={multiline}
          maxLength={maxLength}
          onFocus={() => {
            setFocused(true);
            onFocus?.();
          }}
          // A tap on a suggestion fires after this blur – delay hiding the list long enough for
          // that press to land, or the list would vanish out from under the tap first.
          onBlur={() => setTimeout(() => setFocused(false), 150)}
        />
      </FormFieldShell>

      {allowCurrentLocation && (
        <TouchableOpacity style={styles.locationBtn} onPress={useCurrentLocation} disabled={locating} activeOpacity={0.7}>
          {locating ? (
            <ActivityIndicator size="small" color={dark ? COLORS.white : COLORS.sage} />
          ) : (
            <Text style={[styles.locationBtnText, dark && styles.locationBtnTextDark]}>📍 Use my current location</Text>
          )}
        </TouchableOpacity>
      )}
      {locationError ? <Text style={styles.locationError}>{locationError}</Text> : null}

      {focused && !loading && searchState === 'error' && (
        <Text style={styles.locationError}>Couldn't load suggestions - check your connection, or type the address.</Text>
      )}
      {focused && !loading && searchState === 'empty' && (
        <Text style={styles.locationError}>No matching places - try a nearby landmark or area name.</Text>
      )}

      {focused && suggestions.length > 0 && (
        <View style={[styles.dropdown, inline && styles.dropdownInline, dark && styles.dropdownDark]}>
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
  locationBtn: { alignSelf: 'flex-start', paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  locationBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  locationBtnTextDark: { color: COLORS.mint },
  locationError: { fontSize: 12, color: COLORS.amberLight, marginBottom: 4 },
  inputDark: { color: ON_DARK_SURFACE.primary },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    // Opaque, unlike FormField's own transparent box – this floats over whatever's below it on
    // the page (other fields, text), so it needs a real fill or that content shows through.
    backgroundColor: COLORS.beigeLight,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 107, 71, 0.30)',
    overflow: 'hidden',
    zIndex: 30,
  },
  dropdownInline: { position: 'relative', top: undefined },
  dropdownDark: { backgroundColor: COLORS.nightSky, borderColor: 'rgba(255,255,255,0.25)' },
  suggestionRow: { paddingHorizontal: 14, paddingVertical: 10 },
  suggestionDivider: { borderTopWidth: 1, borderTopColor: 'rgba(139, 107, 71, 0.15)' },
  suggestionText: { fontSize: 13, color: COLORS.textPrimary },
  suggestionTextDark: { color: ON_DARK_SURFACE.primary },
});
