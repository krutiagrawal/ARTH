import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { CityPickerField } from '../components/common/CityPickerField';
import type { PickedPhoto } from '../components/common/PhotoPickerField';
import { GroupPhotoPicker } from '../components/groups/GroupPhotoPicker';
import { useConfirm } from '../context/ConfirmDialogContext';
import { useQueryClient } from '@tanstack/react-query';
import { OutlineChip } from '../components/common/OutlineChip';
import { GroupScreen } from '../components/groups/GroupScreen';
import { SectionTitle } from '../components/groups/GroupBits';
import { GROUP_TYPES, uploadGroupLogo, type GroupType } from '../api/plantingGroups';
import { ApiError } from '../api/client';
import { useCreateGroup } from '../hooks/useGroupQueries';

const toHandle = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);

/** Any signed-in person can found a group. They become its first admin and invite others from there. */
export function CreateGroupScreen({ navigation }: any) {
  const create = useCreateGroup();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [logo, setLogo] = useState<PickedPhoto | null>(null);
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [handleTouched, setHandleTouched] = useState(false);
  const [groupType, setGroupType] = useState<GroupType>('family');
  const [description, setDescription] = useState('');
  // Only launched cities can be picked; Pune is the only one for now, so it is the default.
  const [city, setCity] = useState('Pune');
  const [error, setError] = useState('');

  const onName = (v: string) => {
    setName(v);
    // Suggest a handle from the name until the person edits it themselves.
    if (!handleTouched) setHandle(toHandle(v));
  };

  const valid = name.trim().length >= 2 && /^[a-z0-9_]{3,30}$/.test(handle) && description.trim().length >= 1 && city.length > 0;

  const submit = async () => {
    setError('');
    try {
      const group = await create.mutateAsync({
        name: name.trim(),
        handle,
        groupType,
        description: description.trim(),
        city,
      });
      // The group exists now; add its photo. A failed upload must not undo the group, so it only warns.
      if (logo) {
        try {
          await uploadGroupLogo(group.id, logo);
          await queryClient.invalidateQueries({ queryKey: ['groups'] });
        } catch {
          confirm('Group created', 'The group photo could not be uploaded. You can add it from Group settings.');
        }
      }
      navigation.replace('GroupMain', { groupId: group.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the group. Please try again.');
    }
  };

  return (
    <GroupScreen title="Create a group" subtitle="You will be its first admin" onBack={() => navigation.goBack()}>
      <GroupPhotoPicker photo={logo} groupType={groupType} onChange={setLogo} />
      <FormField label="Group name" required value={name} onChangeText={onName} placeholder="e.g. Green Family Pune" maxLength={60} />
      <FormField
        label="Handle"
        required
        value={handle}
        onChangeText={(v) => {
          setHandleTouched(true);
          setHandle(v.toLowerCase().replace(/[^a-z0-9_]/g, ''));
        }}
        placeholder="green_family_pune"
        autoCapitalize="none"
        maxLength={30}
      />
      <Text style={styles.hint}>Lowercase letters, numbers and underscores. It can't be changed later.</Text>

      <SectionTitle>Type</SectionTitle>
      <View style={styles.chips}>
        {GROUP_TYPES.map((t) => (
          <OutlineChip key={t.key} label={`${t.emoji} ${t.label}`} active={groupType === t.key} onPress={() => setGroupType(t.key)} />
        ))}
      </View>

      <View style={{ height: 8 }} />
      <FormField
        label="About the group"
        required
        value={description}
        onChangeText={setDescription}
        placeholder="What will you plant, and where?"
        multiline
        maxLength={500}
      />
      <CityPickerField required value={city} onChange={setCity} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <AnimatedButton
        label={create.isPending ? 'Creating…' : 'Create group'}
        onPress={submit}
        disabled={!valid || create.isPending}
        variant="primary"
        size="lg"
        fullWidth
        style={{ marginTop: 16 }}
      />
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: -4, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 12 },
});
