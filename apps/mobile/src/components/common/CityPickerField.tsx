import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from './AppText';
import { FormFieldShell } from './FormField';
import { Sheet } from './Sheet';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { useCities } from '../../hooks/useApiQueries';

/**
 * City picker — the product only launches in Pune right now, so every city
 * is listed (not hidden) but only Pune is tappable, same idea as CitySelect
 * on web. `variant="dark"` matches the translucent-white input chrome used
 * on the night-gradient register screens (Nursery/Corporate), where the
 * default FormFieldShell box would be unreadable.
 */
export function CityPickerField({
  label = 'City',
  value,
  onChange,
  variant = 'light',
}: {
  label?: string;
  value: string;
  onChange: (city: string) => void;
  variant?: 'light' | 'dark';
}) {
  const [open, setOpen] = useState(false);
  const { data: cities = [] } = useCities();
  const isDark = variant === 'dark';

  return (
    <>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setOpen(true)}>
        {variant === 'dark' ? (
          <View style={styles.darkTrigger}>
            <Text style={[styles.darkTriggerText, !value && styles.darkTriggerPlaceholder]}>
              {value || `${label} (optional)`}
            </Text>
          </View>
        ) : (
          <FormFieldShell label={label}>
            <Text style={styles.valueText}>{value || 'Select city'}</Text>
          </FormFieldShell>
        )}
      </TouchableOpacity>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Select city"
        variant="slideUp"
        scrollable
        surface={isDark ? 'dark' : 'auto'}
      >
        <ScrollView>
          {cities.map((c) => {
            const selected = c.name === value;
            return (
              <TouchableOpacity
                key={c.id}
                activeOpacity={c.isLaunched ? 0.7 : 1}
                disabled={!c.isLaunched}
                onPress={() => {
                  onChange(c.name);
                  setOpen(false);
                }}
                style={[styles.row, isDark && styles.rowNight, !c.isLaunched && styles.rowDisabled]}
              >
                <Text
                  style={[
                    styles.rowText,
                    isDark && styles.rowTextNight,
                    selected && (isDark ? styles.rowTextSelectedNight : styles.rowTextSelected),
                    !c.isLaunched && styles.rowTextDisabled,
                  ]}
                >
                  {c.name}
                </Text>
                {!c.isLaunched && (
                  <View style={[styles.badge, isDark && styles.badgeNight]}>
                    <Text style={[styles.badgeText, isDark && styles.badgeTextNight]}>Coming soon</Text>
                  </View>
                )}
                {selected && c.isLaunched && (
                  <Text style={isDark ? styles.checkNight : styles.check}>✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  valueText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary, paddingVertical: 4 },
  darkTrigger: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    marginBottom: SPACING.sm,
  },
  darkTriggerText: { fontSize: 15, color: COLORS.white },
  darkTriggerPlaceholder: { color: ON_DARK_SURFACE.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 107, 71, 0.12)',
  },
  rowDisabled: { opacity: 0.45 },
  rowNight: { borderBottomColor: 'rgba(255,255,255,0.12)' },
  rowText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  rowTextNight: { color: ON_DARK_SURFACE.primary },
  rowTextSelected: { color: COLORS.forest },
  rowTextSelectedNight: { color: COLORS.mint },
  rowTextDisabled: { fontWeight: '500' },
  badge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    backgroundColor: COLORS.beige,
  },
  badgeNight: { backgroundColor: 'rgba(255,255,255,0.12)' },
  badgeText: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted },
  badgeTextNight: { color: ON_DARK_SURFACE.muted },
  check: { fontSize: 16, fontWeight: '700', color: COLORS.forest },
  checkNight: { fontSize: 16, fontWeight: '700', color: COLORS.mint },
});
