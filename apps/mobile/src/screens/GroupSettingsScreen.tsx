import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { BorderCard } from '../components/common/BorderCard';
import { FormField } from '../components/common/FormField';
import { CityPickerField } from '../components/common/CityPickerField';
import { OutlineChip } from '../components/common/OutlineChip';
import { PhotoPickerField, type PickedPhoto } from '../components/common/PhotoPickerField';
import { View } from 'react-native';
import { GroupScreen } from '../components/groups/GroupScreen';
import { SectionTitle } from '../components/groups/GroupBits';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmDialogContext';
import { ApiError } from '../api/client';
import { GROUP_TYPES, type GroupType } from '../api/plantingGroups';
import { useDeleteGroup, useGroup, useRemoveGroupMember, useUpdateGroup, useUploadGroupLogo } from '../hooks/useGroupQueries';

/** Group profile: admins edit the details and logo; anyone can leave; the founder can delete the group. */
export function GroupSettingsScreen({ navigation, route }: any) {
  const groupId: string = route.params.groupId;
  const { user } = useAuth();
  const confirm = useConfirm();
  const group = useGroup(groupId);
  const update = useUpdateGroup(groupId);
  const uploadLogo = useUploadGroupLogo(groupId);
  const remove = useRemoveGroupMember(groupId);
  const del = useDeleteGroup();
  const g = group.data;
  const isAdmin = g?.viewer.role === 'admin';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [groupType, setGroupType] = useState<GroupType>('other');
  const [logo, setLogo] = useState<PickedPhoto | null>(null);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    if (!g) return;
    setName(g.name);
    setDescription(g.description);
    setCity(g.city ?? 'Pune');
    setGroupType(g.groupType);
  }, [g?.id, g?.name, g?.description, g?.city, g?.groupType]);

  const fail = (e: unknown) => confirm('Could not do that', e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');

  const save = async () => {
    setSaved('');
    try {
      await update.mutateAsync({ name: name.trim(), description: description.trim(), groupType, city });
      if (logo) {
        await uploadLogo.mutateAsync(logo);
        setLogo(null);
      }
      setSaved('Saved.');
    } catch (e) {
      fail(e);
    }
  };

  const leave = () =>
    confirm('Leave this group?', 'You can ask to join again later.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await remove.mutateAsync(user!.id);
            navigation.navigate('Groups');
          } catch (e) {
            fail(e);
          }
        },
      },
    ]);

  const deleteGroup = () =>
    confirm('Delete this group?', 'Members, requests and the challenge history are removed for everyone. Trees stay with whoever planted them.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync(groupId);
            navigation.navigate('Groups');
          } catch (e) {
            fail(e);
          }
        },
      },
    ]);

  return (
    <GroupScreen title="Group settings" subtitle={g ? `@${g.handle}` : undefined} onBack={() => navigation.goBack()} refetch={[group.refetch]}>
      {isAdmin ? (
        <>
          <PhotoPickerField photo={logo} onChange={setLogo} mode="gallery" label="Group logo" existingUri={g?.logoUrl} aspect={[1, 1]} />
          <View style={{ height: 8 }} />
          <FormField label="Group name" required value={name} onChangeText={setName} maxLength={60} />
          <FormField label="About the group" required value={description} onChangeText={setDescription} multiline maxLength={500} />
          <CityPickerField required value={city} onChange={setCity} />
          <SectionTitle>Type</SectionTitle>
          <View style={styles.chips}>
            {GROUP_TYPES.map((t) => (
              <OutlineChip key={t.key} label={`${t.emoji} ${t.label}`} active={groupType === t.key} onPress={() => setGroupType(t.key)} />
            ))}
          </View>
          <AnimatedButton
            label={update.isPending || uploadLogo.isPending ? 'Saving…' : 'Save changes'}
            onPress={save}
            disabled={name.trim().length < 2 || description.trim().length < 1 || update.isPending}
            variant="primary"
            fullWidth
            style={{ marginTop: 16 }}
          />
          {saved ? <Text style={styles.saved}>{saved}</Text> : null}
        </>
      ) : (
        <BorderCard>
          <Text style={styles.muted}>Only group admins can change the group's details.</Text>
        </BorderCard>
      )}

      <SectionTitle>Membership</SectionTitle>
      <AnimatedButton label="Leave group" size="sm" variant="secondary" fullWidth onPress={leave} />
      {g?.viewer.isCreator && <AnimatedButton label="Delete group" size="sm" variant="danger" fullWidth onPress={deleteGroup} style={{ marginTop: 10 }} />}
    </GroupScreen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  saved: { color: COLORS.sageDark, fontSize: 13, textAlign: 'center', marginTop: 10 },
  muted: { color: COLORS.textMuted, fontSize: 13 },
});
