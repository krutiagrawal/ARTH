import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../common/AppText';
import { Sheet } from '../common/Sheet';
import { COLORS, ON_DARK_SURFACE } from '../../constants/colors';
import { RADIUS, SPACING } from '../../constants/theme';
import { REPORT_REASONS, type ReportReason, type ReportTargetType } from '../../api/social';
import { useReportContent } from '../../hooks/useSocialQueries';
import { useTimeTheme, isNightlikePeriod } from '../../hooks/useTimeTheme';
import { useConfirm } from '../../context/ConfirmDialogContext';

interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string | null;
  /** Shown in the sheet title, e.g. "Report this post". */
  targetLabel?: string;
}

/**
 * Reason picker for reporting content.
 *
 * Always reports success back to the user, including when the API says "already reported" — a
 * second report from the same person is a deliberate no-op server-side, and telling them it
 * failed would just invite them to try again.
 */
export function ReportSheet({ visible, onClose, targetType, targetId, targetLabel = 'this post' }: ReportSheetProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const report = useReportContent();
  const confirm = useConfirm();
  const { period } = useTimeTheme();
  const isNightMode = isNightlikePeriod(period);

  const reset = () => {
    setReason(null);
    setDetails('');
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = () => {
    if (!reason || !targetId) return;
    report.mutate(
      { targetType, targetId, reason, details: details.trim() || undefined },
      {
        onSuccess: () => {
          close();
          confirm(
            'Thanks for telling us',
            'Our team will review this. If several people report the same thing, it is hidden straight away.',
          );
        },
        onError: (error: any) => {
          confirm('Could not send report', error?.message ?? 'Please try again.');
        },
      },
    );
  };

  return (
    <Sheet visible={visible} onClose={close} title={`Report ${targetLabel}`} variant="slideUp" scrollable>
      <Text style={[styles.intro, isNightMode && styles.introNight]}>What is wrong with it? This is anonymous.</Text>

      <View style={styles.list}>
        {REPORT_REASONS.map((option) => {
          const selected = reason === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              style={[styles.option, selected && styles.optionSelected]}
              activeOpacity={0.8}
              onPress={() => setReason(option.key)}
            >
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected && <View style={styles.radioDot} />}
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionLabel, isNightMode && styles.optionLabelNight, selected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                <Text style={[styles.optionHint, isNightMode && styles.optionHintNight]}>{option.hint}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {reason === 'other' && (
        <TextInput
          style={[styles.details, isNightMode && styles.detailsNight]}
          placeholder="Tell us a bit more"
          placeholderTextColor={isNightMode ? ON_DARK_SURFACE.muted : COLORS.textLight}
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={1000}
        />
      )}

      <TouchableOpacity
        style={[styles.submit, (!reason || report.isPending) && styles.submitDisabled]}
        disabled={!reason || report.isPending}
        onPress={submit}
        activeOpacity={0.85}
      >
        {report.isPending ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.submitText}>Submit report</Text>
        )}
      </TouchableOpacity>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: COLORS.textMuted, marginBottom: SPACING.md },
  list: { gap: 6 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: { backgroundColor: COLORS.mintLight, borderColor: COLORS.sage },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.textLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.forest },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.forest },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  optionLabelSelected: { color: COLORS.forest },
  optionHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },
  details: {
    marginTop: SPACING.md,
    minHeight: 84,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(139,107,71,0.3)',
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  submit: {
    marginTop: SPACING.lg,
    paddingVertical: 15,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.danger,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.45 },
  submitText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  introNight: { color: ON_DARK_SURFACE.secondary },
  optionLabelNight: { color: ON_DARK_SURFACE.primary },
  optionHintNight: { color: ON_DARK_SURFACE.secondary },
  detailsNight: { color: ON_DARK_SURFACE.primary, borderColor: 'rgba(255,255,255,0.2)' },
});
