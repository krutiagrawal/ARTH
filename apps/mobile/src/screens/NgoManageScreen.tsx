import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { FONTS } from '../constants/typography';
import { RADIUS } from '../constants/theme';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { LeafBranch } from '../components/common/LeafBranch';
import { NgoDrivesScreen } from './NgoDrivesScreen';
import { NgoCampaignsScreen } from './NgoCampaignsScreen';
import { NgoTreesScreen } from './NgoTreesScreen';

type Segment = 'drives' | 'campaigns' | 'trees';

const SEGMENTS: { key: Segment; label: string; createRoute: string; newLabel: string }[] = [
  { key: 'drives', label: 'Drives', createRoute: 'NgoCreateDrive', newLabel: '+ New Drive' },
  { key: 'campaigns', label: 'Campaigns', createRoute: 'NgoCreateCampaign', newLabel: '+ New Campaign' },
  { key: 'trees', label: 'Trees', createRoute: 'NgoCreateAdoptableTree', newLabel: '+ New Tree' },
];

export function NgoManageScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<Segment>('drives');
  const active = SEGMENTS.find((s) => s.key === segment)!;

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <LeafBranch size={160} style={styles.leaf} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>
          <Text style={styles.headerTitleAccent}>Manage </Text>
          {active.label}
        </Text>
        <Text style={styles.headerSubtitle}>Organize and track your green initiatives</Text>
      </View>

      <AnimatedButton
        label={active.newLabel}
        onPress={() => navigation.navigate(active.createRoute)}
        size="sm"
        gradientColors={[COLORS.forest, COLORS.forestDeep]}
        style={styles.newButton}
      />

      <View style={styles.segmentRow}>
        {SEGMENTS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.segment, segment === s.key && styles.segmentActive]}
            onPress={() => setSegment(s.key)}
          >
            <Text style={[styles.segmentText, segment === s.key && styles.segmentTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.body}>
        {segment === 'drives' && <NgoDrivesScreen navigation={navigation} />}
        {segment === 'campaigns' && <NgoCampaignsScreen navigation={navigation} />}
        {segment === 'trees' && <NgoTreesScreen navigation={navigation} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  leaf: { top: 28, right: -20 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerTitle: { fontFamily: FONTS.displayBold, fontSize: 28, lineHeight: 37, color: COLORS.textPrimary },
  // The nested span needs the family repeated: the global font patch treats every <Text> on its
  // own, so a child that only sets a color would otherwise drop back to the body face mid-word.
  headerTitleAccent: { fontFamily: FONTS.displayBold, color: COLORS.forest },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  newButton: { alignSelf: 'flex-start', marginHorizontal: 20, marginBottom: 14 },
  segmentRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 4 },
  segment: { flex: 1, borderRadius: RADIUS.full, paddingVertical: 9, alignItems: 'center', backgroundColor: COLORS.beigeLight, borderWidth: 1.5, borderColor: COLORS.sand },
  segmentActive: { backgroundColor: COLORS.forest, borderColor: COLORS.forest },
  segmentText: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },
  segmentTextActive: { color: COLORS.white },
  body: { flex: 1 },
});
