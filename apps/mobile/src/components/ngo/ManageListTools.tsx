import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { RADIUS } from '../../constants/theme';
import { ApiError } from '../../api/client';
import { useConfirm } from '../../context/ConfirmDialogContext';

export interface BulkAction {
  label: string;
  danger?: boolean;
  /** Runs for each selected id, one after another; throw to mark that item as failed. */
  run: (id: string) => Promise<unknown>;
  /** Confirmation wording, when the action can't be undone. */
  confirmText?: string;
}

/** Bottom bar shown in select mode: how many are ticked and what can be done to all of them. */
export function BulkActionBar({
  count,
  actions,
  busy,
  onAction,
  bottomOffset = 0,
}: {
  count: number;
  actions: BulkAction[];
  busy: boolean;
  onAction: (action: BulkAction) => void;
  bottomOffset?: number;
}) {
  if (count === 0) return null;
  return (
    <View style={[styles.bar, { paddingBottom: 12 + bottomOffset }]}>
      <Text style={styles.barLabel}>{count} selected</Text>
      <View style={styles.barActions}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.label}
            disabled={busy}
            onPress={() => onAction(a)}
            style={[styles.barButton, a.danger && styles.barButtonDanger, busy && { opacity: 0.5 }]}
          >
            <Text style={[styles.barButtonText, a.danger && styles.barButtonTextDanger]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/** Tick box drawn on a card in select mode. */
export function SelectBox({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.box, selected && styles.boxOn]} pointerEvents="none">
      {selected && <Text style={styles.boxTick}>✓</Text>}
    </View>
  );
}

/**
 * Selection state plus a runner that applies an action to every selected id sequentially and
 * reports "3 done, 1 failed: <reason>" – the existing single-item endpoints already enforce the
 * rules (e.g. a drive with volunteers can't be deleted), so failures are per item, not all-or-nothing.
 */
export function useBulkSelection() {
  const confirm = useConfirm();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      // Unticking the last one leaves select mode – there is no separate button for it.
      if (next.size === 0) setSelectMode(false);
      return next;
    });
  }, []);

  const toggleMode = useCallback(() => {
    setSelectMode((on) => !on);
    setSelected(new Set());
  }, []);

  /** Long-press on a card: enter select mode with that card ticked. */
  const beginSelect = useCallback((id: string) => {
    setSelectMode(true);
    setSelected((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const execute = useCallback(
    async (action: BulkAction) => {
      const ids = Array.from(selected);
      setBusy(true);
      let ok = 0;
      const failures: string[] = [];
      for (const id of ids) {
        try {
          await action.run(id);
          ok += 1;
        } catch (e) {
          failures.push(e instanceof ApiError ? e.message : 'Something went wrong.');
        }
      }
      setBusy(false);
      setSelected(new Set());
      const unique = Array.from(new Set(failures));
      confirm(
        failures.length === 0 ? `${action.label} complete` : `${action.label}: ${ok} done, ${failures.length} failed`,
        failures.length === 0 ? `${ok} item${ok === 1 ? '' : 's'} updated.` : unique.slice(0, 3).join('\n'),
      );
    },
    [selected, confirm],
  );

  const onAction = useCallback(
    (action: BulkAction) => {
      const n = selected.size;
      if (!action.confirmText) {
        void execute(action);
        return;
      }
      confirm(`${action.label} ${n} item${n === 1 ? '' : 's'}?`, action.confirmText, [
        { text: 'Cancel', style: 'cancel' },
        { text: action.label, style: action.danger ? 'destructive' : 'default', onPress: () => void execute(action) },
      ]);
    },
    [selected, confirm, execute],
  );

  return { selectMode, selected, busy, toggle, toggleMode, beginSelect, onAction };
}

/** Small amber pill flagging why a record needs attention. */
export function AttentionBadge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>⚠️ {text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 },
  headerText: { flex: 1 },
  summary: { fontSize: 12, color: COLORS.textSecondary },
  attention: { fontSize: 12, fontWeight: '700', color: COLORS.amber, marginTop: 2 },
  link: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.cream,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 107, 71, 0.2)',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  barLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  barActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  barButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.forest },
  barButtonDanger: { borderColor: COLORS.dangerDark },
  barButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.forest },
  barButtonTextDanger: { color: COLORS.dangerDark },
  box: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.sand,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  boxOn: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  boxTick: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(212, 160, 23, 0.18)', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },
});
