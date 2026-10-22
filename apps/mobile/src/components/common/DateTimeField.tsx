import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text } from './AppText';
import { FormFieldShell } from './FormField';
import { COLORS } from '../../constants/colors';

export function DateTimeField({ label, required, value, onChange }: { label: string; required?: boolean; value: Date; onChange: (d: Date) => void }) {
  // Android has no real combined "datetime" mode – the library fakes it by chaining a date
  // dialog into a time dialog internally, and unmounting the picker as soon as the first
  // (date) callback fires – which we used to do via `setShowPicker(false)` – tears down that
  // chain mid-flight and crashes with "Cannot read property 'dismiss' of undefined". Driving
  // the date→time sequence ourselves keeps the component mounted across both native dialogs.
  const [step, setStep] = useState<'date' | 'time' | null>(null);

  const handleChange = (event: any, selected?: Date) => {
    if (Platform.OS === 'ios') {
      if (selected) onChange(selected);
      return;
    }
    if (event.type !== 'set' || !selected) {
      setStep(null);
      return;
    }
    if (step === 'date') {
      const next = new Date(value);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      onChange(next);
      setStep('time');
    } else {
      const next = new Date(value);
      next.setHours(selected.getHours(), selected.getMinutes());
      onChange(next);
      setStep(null);
    }
  };

  return (
    <>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setStep('date')}>
        <FormFieldShell label={label} required={required}>
          <Text style={styles.inputText}>{value.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}</Text>
        </FormFieldShell>
      </TouchableOpacity>
      {step && (
        <DateTimePicker
          value={value}
          mode={Platform.OS === 'ios' ? 'datetime' : step}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  inputText: { fontSize: 15, color: COLORS.textPrimary, paddingVertical: 4 },
});
