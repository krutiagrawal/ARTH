import React, { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text } from '../common/AppText';
import { COLORS } from '../../constants/colors';
import { STATUS_META, ACTIONABLE_STATUSES } from '../../constants/treeHealth';
import { useLogAdopterCheckIn } from '../../hooks/useApiQueries';
import { useHaptics } from '../../hooks/useHaptics';

/**
 * The adopter's "how's it doing?" check-in on the tree they adopted: pick a status, take a
 * live photo (required, so health never changes without evidence), done. Same flow as an
 * individual owner's check-in on their own tree.
 */
export function AdopterCheckIn({ adoptableTreeId }: { adoptableTreeId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const mutation = useLogAdopterCheckIn();
  const { medium, success } = useHaptics();

  const handleCheckIn = useCallback(
    async (status: (typeof ACTIONABLE_STATUSES)[number]) => {
      medium();
      setHint(null);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setHint('Camera access is needed to take the live photo for a check-in.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (result.canceled || !result.assets?.[0]) {
        setHint('No photo taken, so the status was not updated.');
        return;
      }
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop() || 'check-in.jpg';
      const extension = filename.split('.').pop()?.toLowerCase();
      const type = extension === 'png' ? 'image/png' : 'image/jpeg';

      try {
        await mutation.mutateAsync({ adoptableTreeId, status, photo: { uri, name: filename, type } });
        success();
        setExpanded(false);
      } catch {
        setHint('Could not save the check-in. Please try again.');
      }
    },
    [adoptableTreeId, mutation, medium, success],
  );

  if (!expanded) {
    return (
      <TouchableOpacity style={styles.openButton} onPress={() => setExpanded(true)} accessibilityRole="button">
        <Text style={styles.openButtonText}>📸  Check in on this tree</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <View style={styles.statusRow}>
        {ACTIONABLE_STATUSES.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.statusButton, { borderColor: STATUS_META[status].color }]}
            disabled={mutation.isPending}
            onPress={() => handleCheckIn(status)}
            accessibilityRole="button"
          >
            <Text style={styles.statusText}>
              {mutation.isPending ? '…' : `${STATUS_META[status].emoji} ${STATUS_META[status].label}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.hint, hint ? styles.hintWarn : null]}>{hint ?? '📸 A live photo is required to update the status.'}</Text>
      <TouchableOpacity onPress={() => setExpanded(false)} style={styles.cancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  openButton: { height: 40, borderRadius: 12, borderWidth: 2, borderColor: COLORS.warmBrown, alignItems: 'center', justifyContent: 'center' },
  openButtonText: { fontSize: 13, fontWeight: '800', color: COLORS.textPrimary },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusButton: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  statusText: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  hintWarn: { color: COLORS.dangerDark },
  cancel: { alignSelf: 'flex-start', marginTop: 6, paddingVertical: 4 },
  cancelText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
});
