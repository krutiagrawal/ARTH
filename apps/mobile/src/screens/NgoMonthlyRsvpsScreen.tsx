import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { useNgoMonthlyRsvps } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';
import { usePullToRefresh } from '../hooks/usePullToRefresh';

function FadeInRow({ delay, children, style }: { delay: number; children: React.ReactNode; style?: any }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={[animStyle, style]}>{children}</Animated.View>;
}

export function NgoMonthlyRsvpsScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const month: string = route.params.month;
  const monthLabel: string = route.params.monthLabel ?? month;
  const { data: rsvps = [], isLoading, refetch } = useNgoMonthlyRsvps(month);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RSVPs · {monthLabel}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <Text style={styles.hint}>People who RSVP&apos;d to your drives in {monthLabel}.</Text>
        {isLoading && <ActivityIndicator color={COLORS.sage} style={styles.loader} />}
        {!isLoading && rsvps.length === 0 && (
          <EmptyState icon="🤝" title="No RSVPs this month" body={`Nobody RSVP'd to your drives in ${monthLabel}.`} />
        )}
        {rsvps.map((r, i) => (
          <FadeInRow key={r.id} delay={i * 60}>
            <BorderCard style={styles.card}>
              <View style={styles.cardRow}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('UserPublicProfile', { userId: r.userId })}
                >
                  <Text style={styles.cardTitle}>{r.userName}</Text>
                  <Text style={styles.cardMeta}>@{r.userHandle}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ alignItems: 'flex-end' }}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('DriveDetail', { driveId: r.driveId })}
                >
                  <Text style={styles.driveTitle} numberOfLines={1}>{r.driveTitle}</Text>
                  <Text style={styles.dateText}>{new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                </TouchableOpacity>
              </View>
            </BorderCard>
          </FadeInRow>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.textPrimary, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 20 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 14 },
  loader: { marginTop: 20 },
  card: { marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  driveTitle: { fontSize: 13, fontWeight: '700', color: COLORS.forest, maxWidth: 160 },
  dateText: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
});
