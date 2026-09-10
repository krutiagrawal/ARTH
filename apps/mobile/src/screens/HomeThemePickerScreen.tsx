import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, Modal } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS, SPACING } from '../constants/theme';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { BorderCard } from '../components/common/BorderCard';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { ForestHeroCanvas } from '../components/common/ForestHeroCanvas';
import { HomeScreen } from './HomeScreen';
import { useTimeTheme, getThemeForHour, PERIOD_HOUR, type TimePeriod } from '../hooks/useTimeTheme';
import { useUpdateSettings } from '../hooks/useApiQueries';

/** Swallows any navigation attempted from inside the full-homepage preview (tapping a mission,
 * a tree, the grow CTA, etc.) — the preview is a look-only sandbox, not a real live Home. */
const NOOP_NAVIGATION = { navigate: () => {}, goBack: () => {}, replace: () => {}, push: () => {} };

const { width: SW } = Dimensions.get('window');
const PREVIEW_HEIGHT = 220;

const PERIOD_ORDER: TimePeriod[] = ['dawn', 'morning', 'afternoon', 'goldenHour', 'sunset', 'blueHour', 'night', 'lateNight'];

/**
 * Lets the user either keep the homepage's illustrated theme auto-changing with real time of
 * day (default), or pin it to one specific period so it always looks the same — with a live
 * preview of the hero illustration before committing. The greeting text keeps changing with real
 * time of day either way; only the visual look gets pinned (see `useTimeTheme`'s `pinnedPeriod`
 * param, which this screen's preview also uses directly).
 */
export function HomeThemePickerScreen({ navigation, route }: any) {
  const initial: TimePeriod | null = route?.params?.current ?? null;
  const [selected, setSelected] = useState<TimePeriod | null>(initial);
  const [previewOpen, setPreviewOpen] = useState(false);
  const updateSettingsMutation = useUpdateSettings();

  // Same hook every homepage card uses — passing `selected` previews exactly what pinning that
  // period would look like (greeting/emoji still live), and passing `null` previews "Auto".
  const previewTheme = useTimeTheme(selected);

  const confirm = () => {
    updateSettingsMutation.mutate({ pinnedTimeTheme: selected });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title="Homepage Theme" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.previewWrap}>
          {previewTheme.heroImage ? (
            <Image source={previewTheme.heroImage} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <ForestHeroCanvas theme={previewTheme} width={SW - SPACING.md * 2} height={PREVIEW_HEIGHT} treeCount={8} />
          )}
          <View style={styles.previewTextWrap}>
            <Text style={[styles.previewGreeting, { color: previewTheme.textOnSky }]}>
              {previewTheme.greeting} {previewTheme.emoji}
            </Text>
            <Text style={[styles.previewSubtitle, { color: previewTheme.textOnSky }]}>Your Forest</Text>
          </View>
        </View>
        <Text style={styles.caption}>
          {selected
            ? `This look stays as "${getThemeForHour(PERIOD_HOUR[selected]).label}" all day if you pick it — your greeting above still changes throughout the day either way.`
            : 'The homepage keeps changing its look with real time of day — the default.'}
        </Text>

        <Text style={styles.sectionTitle}>Choose a look</Text>
        <BorderCard noPadding style={styles.groupedList}>
          <TouchableOpacity style={styles.optionRow} onPress={() => setSelected(null)}>
            <Text style={styles.optionEmoji}>🔄</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.optionLabel}>Auto</Text>
              <Text style={styles.optionSublabel}>Changes with time of day</Text>
            </View>
            {selected === null && <Text style={styles.optionCheck}>✓</Text>}
          </TouchableOpacity>
          {PERIOD_ORDER.map((period) => {
            const periodTheme = getThemeForHour(PERIOD_HOUR[period]);
            return (
              <React.Fragment key={period}>
                <View style={styles.rowDivider} />
                <TouchableOpacity style={styles.optionRow} onPress={() => setSelected(period)}>
                  <Text style={styles.optionEmoji}>{periodTheme.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>{periodTheme.label}</Text>
                    <Text style={styles.optionSublabel}>Always looks like this</Text>
                  </View>
                  <View style={[styles.swatch, { backgroundColor: periodTheme.skyColors[0] }]} />
                  {selected === period && <Text style={styles.optionCheck}>✓</Text>}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </BorderCard>

        <View style={styles.actionRow}>
          <AnimatedButton
            label="Preview"
            onPress={() => setPreviewOpen(true)}
            variant="secondary"
            size="lg"
            style={styles.actionButton}
          />
          <AnimatedButton
            label="Apply"
            onPress={confirm}
            variant="primary"
            size="lg"
            style={styles.actionButton}
          />
        </View>
      </ScrollView>

      <Modal visible={previewOpen} animationType="slide" onRequestClose={() => setPreviewOpen(false)}>
        <HomeScreen
          navigation={NOOP_NAVIGATION}
          onNavigateTab={() => {}}
          previewPeriod={selected}
          onClosePreview={() => setPreviewOpen(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SPACING.md, paddingBottom: 40, gap: 16 },
  previewWrap: {
    height: PREVIEW_HEIGHT,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.mintLight,
  },
  previewTextWrap: { padding: 16 },
  previewGreeting: { fontSize: 22, fontWeight: '800' },
  previewSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  caption: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, marginTop: 4 },
  groupedList: { marginBottom: 4 },
  rowDivider: { height: 1, backgroundColor: 'rgba(160,114,74,0.25)', marginHorizontal: 14 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  optionEmoji: { fontSize: 22 },
  optionLabel: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  optionSublabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  optionCheck: { fontSize: 16, fontWeight: '700', color: COLORS.forest },
  swatch: { width: 18, height: 18, borderRadius: 9, marginRight: 4 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionButton: { flex: 1 },
});
