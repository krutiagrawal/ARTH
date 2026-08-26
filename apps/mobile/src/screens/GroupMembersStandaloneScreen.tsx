import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { GroupMembersScreen } from './GroupMembersScreen';

/**
 * Pushed-from-Profile wrapper around GroupMembersScreen, which is otherwise only ever embedded
 * (header-less) inside GroupManageScreen's Members/Challenges segmented tab.
 */
export function GroupMembersStandaloneScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />
      <ScreenHeader title="Members" subtitle="Everyone in your group" onBack={() => navigation?.goBack?.()} />
      <GroupMembersScreen navigation={navigation} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
