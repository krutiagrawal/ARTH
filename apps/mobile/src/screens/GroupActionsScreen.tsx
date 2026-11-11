import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { GroupScreen } from '../components/groups/GroupScreen';
import { useGroup } from '../hooks/useGroupQueries';

/**
 * Plant, adopt or donate on the group's behalf. Each opens the normal screen, told who it is for;
 * the server then checks again that the caller really is an admin of the group.
 */
export function GroupActionsScreen({ navigation, route }: any) {
  const groupId: string = route.params.groupId;
  const group = useGroup(groupId);
  const name = group.data?.name ?? route.params.groupName ?? 'the group';
  const isAdmin = group.data?.viewer.role === 'admin';
  const context = { plantingGroupId: groupId, plantingGroupName: name };

  const options = [
    { emoji: '🌱', title: 'Plant a tree', body: 'Take a live photo at the spot. It joins the group forest.', go: () => navigation.navigate('PlantTree', context) },
    { emoji: '🤝', title: 'Adopt a tree', body: 'Adopt an NGO-listed tree for the group.', go: () => navigation.navigate('AdoptTreeList', context) },
    { emoji: '💚', title: 'Donate to an NGO', body: 'The group gets the receipt.', go: () => navigation.navigate('Campaigns', context) },
  ];

  return (
    <GroupScreen title="For the group" subtitle={name} onBack={() => navigation.goBack()}>
      {!isAdmin && group.data ? (
        <BorderCard>
          <Text style={styles.title}>Only group admins can do this</Text>
          <Text style={styles.body}>Ask an admin to plant, adopt or donate for the group, or ask them to make you an admin.</Text>
        </BorderCard>
      ) : (
        options.map((o) => (
          <TouchableOpacity key={o.title} activeOpacity={0.8} onPress={o.go} style={styles.option}>
            <Text style={styles.emoji}>{o.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{o.title}</Text>
              <Text style={styles.body}>{o.body}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))
      )}
      <Text style={styles.note}>You also get personal credit when you plant. Members can still join NGO drives from their own accounts.</Text>
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    marginBottom: 10,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    backgroundColor: 'transparent',
  },
  emoji: { fontSize: 30 },
  title: { fontSize: 16, fontWeight: '800', color: COLORS.textPrimary },
  body: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  chevron: { fontSize: 26, color: COLORS.textMuted },
  note: { fontSize: 12, color: COLORS.textMuted, marginTop: 12, textAlign: 'center' },
});
