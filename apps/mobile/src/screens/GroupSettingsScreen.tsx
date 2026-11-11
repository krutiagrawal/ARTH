import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../components/common/AppText';
import { COLORS } from '../constants/colors';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { BorderCard } from '../components/common/BorderCard';
import { FormField } from '../components/common/FormField';
import { CityPickerField } from '../components/common/CityPickerField';
import { OutlineChip } from '../components/common/OutlineChip';
import { Toggle } from '../components/common/Toggle';
import { SettingsDivider, SettingsRow, SettingsSectionHeader } from '../components/common/SettingsRow';
import type { PickedPhoto } from '../components/common/PhotoPickerField';
import { GroupPhotoPicker } from '../components/groups/GroupPhotoPicker';
import { GroupScreen } from '../components/groups/GroupScreen';
import { SectionTitle } from '../components/groups/GroupBits';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmDialogContext';
import { ApiError } from '../api/client';
import { GROUP_TYPES, type GroupType } from '../api/plantingGroups';
import {
  useDeleteGroup,
  useGroup,
  useRemoveGroupMember,
  useSetMyShareActivity,
  useUpdateGroup,
  useUploadGroupLogo,
} from '../hooks/useGroupQueries';

/**
 * Group settings, laid out like the individual Settings page: the group's profile (admins edit),
 * the caller's own membership, everything else the group has, and leaving or deleting.
 */
export function GroupSettingsScreen({ navigation, route }: any) {
  const groupId: string = route.params.groupId;
  const { user } = useAuth();
  const confirm = useConfirm();
  const group = useGroup(groupId);
  const update = useUpdateGroup(groupId);
  const uploadLogo = useUploadGroupLogo(groupId);
  const remove = useRemoveGroupMember(groupId);
  const setShare = useSetMyShareActivity(groupId);
  const del = useDeleteGroup();
  const g = group.data;
  const isAdmin = g?.viewer.role === 'admin';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Pune');
  const [groupType, setGroupType] = useState<GroupType>('other');
  // The photo just picked, shown while it uploads; the stored logo takes over once it is saved.
  const [pickedLogo, setPickedLogo] = useState<PickedPhoto | null>(null);
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
      setSaved('Saved.');
    } catch (e) {
      fail(e);
    }
  };

  // The photo saves as soon as it is picked, so there is nothing extra to remember to press.
  const changeLogo = async (photo: PickedPhoto) => {
    setSaved('');
    setPickedLogo(photo);
    try {
      await uploadLogo.mutateAsync(photo);
    } catch (e) {
      fail(e);
    } finally {
      setPickedLogo(null);
    }
  };

  const toggleShare = async (next: boolean) => {
    try {
      await setShare.mutateAsync(next);
    } catch (e) {
      fail(e);
    }
  };

  const leave = () =>
    confirm('Leave this group?', 'Your work stops counting for the group. You can ask to join again later.', [
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

  const go = (route: string) => () => navigation.navigate(route, { groupId });

  return (
    <GroupScreen title="Group settings" subtitle={g ? `@${g.handle}` : undefined} onBack={() => navigation.goBack()} refetch={[group.refetch]}>
      {isAdmin ? (
        <>
          <GroupPhotoPicker photo={pickedLogo} existingUri={g?.logoUrl} groupType={groupType} onChange={changeLogo} uploading={uploadLogo.isPending} />
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
            label={update.isPending ? 'Saving…' : 'Save changes'}
            onPress={save}
            size="sm"
            disabled={name.trim().length < 2 || description.trim().length < 1 || update.isPending}
            variant="primary"
            fullWidth
            style={{ marginTop: 16 }}
          />
          {saved ? <Text style={styles.saved}>{saved}</Text> : null}
        </>
      ) : (
        <BorderCard>
          <Text style={styles.muted}>Only group admins can change the group's details, photo and forest theme.</Text>
        </BorderCard>
      )}

      <SettingsSectionHeader title="My membership" />
      <BorderCard noPadding>
        <SettingsRow
          variant="light"
          icon="🌿"
          label="Count my ARTH activity"
          sublabel="My trees, adoptions, donations and drives count for this group from the day I joined"
          accent={COLORS.sage}
          rightElement={<Toggle value={g?.viewer.shareActivity ?? true} onValueChange={toggleShare} offColor={COLORS.sand} onColor={COLORS.sage} />}
        />
        <SettingsDivider variant="light" />
        <SettingsRow variant="light" icon="🛡️" label="My role" sublabel={isAdmin ? 'Admin' : 'Member'} accent={COLORS.golden} />
      </BorderCard>

      <SettingsSectionHeader title="Everything the group has" />
      <BorderCard noPadding>
        <SettingsRow variant="light" icon="📣" label="Activity" accent={COLORS.sage} onPress={go('GroupActivity')} />
        <SettingsDivider variant="light" />
        <SettingsRow variant="light" icon="🏅" label="Achievements" accent={COLORS.golden} onPress={go('GroupAchievements')} />
        <SettingsDivider variant="light" />
        <SettingsRow variant="light" icon="🏆" label="Leaderboards" accent={COLORS.golden} onPress={go('GroupLeaderboard')} />
        <SettingsDivider variant="light" />
        <SettingsRow variant="light" icon="📊" label="Analytics" accent={COLORS.sage} onPress={go('GroupAnalytics')} />
        <SettingsDivider variant="light" />
        <SettingsRow variant="light" icon="🌳" label="Our trees" accent={COLORS.sage} onPress={go('GroupTrees')} />
        <SettingsDivider variant="light" />
        <SettingsRow variant="light" icon="💚" label="Donations & adopted trees" accent={COLORS.coral} onPress={go('GroupGiving')} />
        <SettingsDivider variant="light" />
        <SettingsRow variant="light" icon="🔔" label="Group notifications" accent={COLORS.sage} onPress={() => navigation.navigate('Notifications', { groupId })} />
        <SettingsDivider variant="light" />
        <SettingsRow variant="light" icon="🔀" label="Switch group" accent={COLORS.sage} onPress={() => navigation.navigate('Groups')} />
      </BorderCard>

      <SettingsSectionHeader title="Membership" />
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
