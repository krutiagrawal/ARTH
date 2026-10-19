import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { Text } from './AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';
import { FONTS, TEXT } from '../../constants/typography';
import { RADIUS } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import {
  useNgoProfile,
  useNurseryProfile,
  useResubmitNgoProfile,
  useResubmitNurseryProfile,
} from '../../hooks/useApiQueries';

type Status = 'pending' | 'approved' | 'rejected' | 'suspended';
type BlockedStatus = Exclude<Status, 'approved'>;

const SUPPORT_URL = 'mailto:support@plantapp.example?subject=ARTH%20account%20help';

const COPY: Record<BlockedStatus, { icon: string; title: string; body: (entity: string) => string }> = {
  pending: {
    icon: '🕓',
    title: 'Your application is under review',
    body: (entity) => `An admin is reviewing your ${entity}. Everything in the app unlocks as soon as it's approved.`,
  },
  rejected: {
    icon: '⚠️',
    title: 'Your application was not approved',
    body: (entity) => `Update your ${entity} details, then resubmit it for review.`,
  },
  suspended: {
    icon: '🚫',
    title: 'Your account is suspended',
    body: () => 'Everything is paused while your account is suspended. Contact support if you think this is a mistake.',
  },
};

interface ApprovalStatusScreenProps {
  status: BlockedStatus;
  entity: string;
  rejectionReason?: string | null;
  onEditProfile: () => void;
  onSettings: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  onResubmit: () => void;
  resubmitting: boolean;
}

function ApprovalStatusScreen(p: ApprovalStatusScreenProps) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const copy = COPY[p.status];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={[COLORS.forest, '#0f1f14']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{copy.icon}</Text>
        </View>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body(p.entity)}</Text>
        {p.status === 'rejected' && p.rejectionReason ? <Text style={styles.reason}>Reason: {p.rejectionReason}</Text> : null}

        {p.status === 'rejected' ? (
          <>
            <TouchableOpacity style={styles.primary} onPress={p.onEditProfile}>
              <Text style={styles.primaryText}>Edit profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={p.onResubmit} disabled={p.resubmitting}>
              {p.resubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.secondaryText}>Resubmit for review</Text>}
            </TouchableOpacity>
          </>
        ) : null}

        {p.status === 'suspended' ? (
          <TouchableOpacity style={styles.primary} onPress={() => Linking.openURL(SUPPORT_URL)}>
            <Text style={styles.primaryText}>Contact support</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={p.status === 'pending' ? styles.primary : styles.link} onPress={p.onRefresh} disabled={p.refreshing}>
            {p.refreshing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={p.status === 'pending' ? styles.primaryText : styles.linkText}>Check status</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.link} onPress={p.onSettings}>
          <Text style={styles.linkText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={() => logout()}>
          <Text style={styles.linkText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View style={[styles.container, styles.centered]}>
      <LinearGradient colors={[COLORS.forest, '#0f1f14']} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

interface GateProps {
  navigation: any;
  children: React.ReactNode;
}

interface GateQuery {
  data?: { status: Status; rejectionReason: string | null };
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => unknown;
}

interface GateConfig extends GateProps {
  entity: string;
  editRoute: string;
  settingsRoute: string;
  resubmit: () => void;
  resubmitting: boolean;
}

/** Shared flow: spinner → retry on failure → status screen unless approved. */
function renderGate(q: GateQuery, c: GateConfig) {
  if (q.isLoading) {
    return (
      <Centered>
        <ActivityIndicator color="#fff" />
      </Centered>
    );
  }
  if (!q.data) {
    return (
      <Centered>
        <Text style={styles.body}>Couldn&apos;t load your account status.</Text>
        <TouchableOpacity style={styles.primary} onPress={() => q.refetch()}>
          <Text style={styles.primaryText}>Retry</Text>
        </TouchableOpacity>
      </Centered>
    );
  }
  if (q.data.status === 'approved') return <>{c.children}</>;
  return (
    <ApprovalStatusScreen
      status={q.data.status}
      entity={c.entity}
      rejectionReason={q.data.rejectionReason}
      onEditProfile={() => c.navigation.navigate(c.editRoute)}
      onSettings={() => c.navigation.navigate(c.settingsRoute)}
      onRefresh={() => q.refetch()}
      refreshing={q.isFetching}
      onResubmit={c.resubmit}
      resubmitting={c.resubmitting}
    />
  );
}

/** Replaces the whole NGO app (tabs included) until an admin approves the account. */
export function NgoApprovalGate(props: GateProps) {
  const q = useNgoProfile();
  const resubmit = useResubmitNgoProfile();
  return renderGate(q, {
    ...props,
    entity: 'NGO application',
    editRoute: 'NgoProfile',
    settingsRoute: 'NgoSettings',
    resubmit: () => resubmit.mutate(),
    resubmitting: resubmit.isPending,
  });
}

/** Replaces the whole nursery app (tabs included) until an admin approves the account. */
export function NurseryApprovalGate(props: GateProps) {
  const q = useNurseryProfile();
  const resubmit = useResubmitNurseryProfile();
  return renderGate(q, {
    ...props,
    entity: 'nursery application',
    editRoute: 'EditNurseryProfile',
    settingsRoute: 'NurserySettings',
    resubmit: () => resubmit.mutate(),
    resubmitting: resubmit.isPending,
  });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  content: { alignItems: 'center', paddingHorizontal: 32, gap: 12 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  icon: { fontSize: 32 },
  title: { ...TEXT.heading, color: '#fff', textAlign: 'center' },
  body: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 21, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  reason: { fontFamily: FONTS.bodyMedium, fontSize: 14, lineHeight: 21, color: COLORS.dangerLight, textAlign: 'center' },
  primary: { marginTop: 16, alignSelf: 'stretch', alignItems: 'center', paddingVertical: 14, borderRadius: RADIUS.lg, backgroundColor: COLORS.sage },
  primaryText: { fontFamily: FONTS.bodyBold, fontSize: 15, color: '#fff' },
  secondary: { alignSelf: 'stretch', alignItems: 'center', paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  secondaryText: { fontFamily: FONTS.bodySemiBold, fontSize: 15, color: '#fff' },
  link: { paddingVertical: 10 },
  linkText: { fontFamily: FONTS.bodySemiBold, fontSize: 14, color: 'rgba(255,255,255,0.75)' },
});
