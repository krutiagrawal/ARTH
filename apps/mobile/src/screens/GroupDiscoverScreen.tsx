import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { FormField } from '../components/common/FormField';
import { GroupScreen } from '../components/groups/GroupScreen';
import { GroupRow } from '../components/groups/GroupBits';
import { useGroupSearch } from '../hooks/useGroupQueries';

/** Search for a group by name or handle, then open it to ask to join. */
export function GroupDiscoverScreen({ navigation }: any) {
  const [q, setQ] = useState('');
  const results = useGroupSearch(q);
  const text = q.trim();

  return (
    <GroupScreen title="Find groups" subtitle="Search by name or handle" onBack={() => navigation.goBack()}>
      <FormField label="Search" value={q} onChangeText={setQ} placeholder="At least 2 letters" autoCapitalize="none" maxLength={60} />

      {text.length < 2 ? (
        <EmptyState icon="🔍" title="Look for a group" body="Type the group's name or its handle." />
      ) : results.isLoading ? (
        <Text style={styles.muted}>Searching…</Text>
      ) : (results.data ?? []).length === 0 ? (
        <EmptyState icon="🌱" title="No groups found" body={`Nothing matches “${text}”.`} />
      ) : (
        <View style={{ marginTop: 8 }}>
          <BorderCard noPadding>
            {(results.data ?? []).map((g, i) => (
              <View key={g.id} style={i > 0 ? styles.divider : undefined}>
                <GroupRow group={g} onPress={() => navigation.navigate('GroupDetail', { groupId: g.id })} />
              </View>
            ))}
          </BorderCard>
        </View>
      )}
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  muted: { color: COLORS.textMuted, textAlign: 'center', marginTop: 24 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.warmBrown },
});
