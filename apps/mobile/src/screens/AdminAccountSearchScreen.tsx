import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import Animated from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, GRADIENTS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { GlassCard } from '../components/common/GlassCard';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Sheet } from '../components/common/Sheet';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useAdminAccounts, useBlockAdminAccount, useUnblockAdminAccount } from '../hooks/useApiQueries';
import { useSlideUp } from '../hooks/useAnimations';
import { ApiError } from '../api/client';
import type { AdminAccountType, ApiAdminAccount } from '../api/admin';

const TYPE_FILTERS: { key: AdminAccountType | ''; label: string }[] = [
  { key: '', label: 'All' },
  { key: 'user', label: 'Users' },
  { key: 'ngo', label: 'NGOs' },
  { key: 'nursery', label: 'Nurseries' },
  { key: 'corporate', label: 'Corporates' },
];

function orgNameFor(account: ApiAdminAccount) {
  return account.ngoProfile?.orgName ?? account.nurseryProfile?.nurseryName ?? account.corporateProfile?.companyName ?? null;
}

function FadeInRow({ delay, children }: { delay: number; children: React.ReactNode }) {
  const animStyle = useSlideUp(delay, 18);
  return <Animated.View style={animStyle}>{children}</Animated.View>;
}

export function AdminAccountSearchScreen() {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const [type, setType] = useState<AdminAccountType | ''>('');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selected, setSelected] = useState<ApiAdminAccount | null>(null);
  const [reasonSheet, setReasonSheet] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useAdminAccounts({ q: debouncedQuery || undefined, type: type || undefined, take: 30 });
  const accounts = data?.accounts ?? [];

  const blockMutation = useBlockAdminAccount();
  const unblockMutation = useUnblockAdminAccount();
  const working = blockMutation.isPending || unblockMutation.isPending;

  const block = async () => {
    if (!selected) return;
    setError(null);
    try {
      const updated = await blockMutation.mutateAsync({ userId: selected.id, reason: reason.trim() || undefined });
      setSelected(updated);
      setReasonSheet(false);
      setReason('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not block this account.');
    }
  };

  const unblock = async () => {
    if (!selected) return;
    setError(null);
    try {
      const updated = await unblockMutation.mutateAsync(selected.id);
      setSelected(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not unblock this account.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENTS.nightSky as any} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Accounts</Text>
      </View>

      <View style={styles.filterBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, handle, email, org…"
          placeholderTextColor={ON_DARK_SURFACE.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TYPE_FILTERS.map((f) => (
            <TouchableOpacity key={f.key} style={[styles.chip, type === f.key && styles.chipActive]} onPress={() => setType(f.key)}>
              <Text style={[styles.chipText, type === f.key && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.mint} style={styles.loader} />}
        {!isLoading && accounts.length === 0 && (
          <EmptyState icon="🔎" title="No matching accounts" body="Try a different search or filter." tint="dark" />
        )}
        {accounts.map((account, i) => {
          const orgName = orgNameFor(account);
          return (
            <FadeInRow key={account.id} delay={i * 40}>
              <TouchableOpacity activeOpacity={0.85} onPress={() => { setSelected(account); setError(null); }}>
                <GlassCard variant="dark" style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{orgName || account.name}</Text>
                    {account.isBlocked ? (
                      <View style={[styles.statusChip, { borderColor: COLORS.dangerLight }]}>
                        <Text style={[styles.statusChipText, { color: COLORS.dangerLight }]}>Blocked</Text>
                      </View>
                    ) : (
                      <View style={[styles.statusChip, { borderColor: COLORS.sageLight }]}>
                        <Text style={[styles.statusChipText, { color: COLORS.sageLight }]}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardMeta} numberOfLines={1}>@{account.handle} · {account.email}</Text>
                  <Text style={styles.cardBody}>{account.role}</Text>
                </GlassCard>
              </TouchableOpacity>
            </FadeInRow>
          );
        })}
      </ScrollView>

      <Sheet visible={Boolean(selected)} onClose={() => setSelected(null)} title={selected ? orgNameFor(selected) || selected.name : ''}>
        {selected && (
          <View>
            <Text style={styles.sheetMeta}>@{selected.handle} · {selected.email}</Text>
            <Text style={styles.sheetMeta}>{selected.role} · Joined {new Date(selected.createdAt).toLocaleDateString()}</Text>
            {selected.isBlocked && selected.blockedReason && (
              <Text style={styles.sheetReason}>Block reason: &ldquo;{selected.blockedReason}&rdquo;</Text>
            )}
            {error && <Text style={styles.error}>{error}</Text>}

            {selected.isBlocked ? (
              <AnimatedButton
                label={working ? 'Working…' : 'Unblock'}
                onPress={unblock}
                disabled={working}
                fullWidth
                style={styles.sheetButton}
              />
            ) : (
              <AnimatedButton
                label="Block"
                onPress={() => setReasonSheet(true)}
                variant="danger"
                disabled={working}
                fullWidth
                style={styles.sheetButton}
              />
            )}
          </View>
        )}
      </Sheet>

      <Sheet visible={reasonSheet} onClose={() => setReasonSheet(false)} title="Block this account?">
        <Text style={styles.sheetLabel}>They lose access on web and mobile immediately.</Text>
        <Text style={[styles.sheetLabel, { marginTop: 12 }]}>Reason (optional)</Text>
        <TextInput
          style={styles.sheetInput}
          value={reason}
          onChangeText={setReason}
          placeholder="Kept on file, not shown to the account…"
          placeholderTextColor={ON_DARK_SURFACE.muted}
          multiline
        />
        <AnimatedButton
          label={blockMutation.isPending ? 'Working…' : 'Confirm block'}
          onPress={block}
          variant="danger"
          disabled={blockMutation.isPending}
          fullWidth
          style={styles.sheetButton}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  filterBar: { paddingHorizontal: 20, marginBottom: 8, gap: 10 },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: ON_DARK_SURFACE.primary },
  chipRow: { gap: 8, paddingRight: 20 },
  chip: { borderRadius: RADIUS.full, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: 'rgba(200,230,192,0.18)', borderColor: COLORS.mint },
  chipText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  chipTextActive: { color: COLORS.mint, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  statusChip: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardMeta: { fontSize: 12, color: ON_DARK_SURFACE.secondary, marginTop: 6 },
  cardBody: { fontSize: 13, color: ON_DARK_SURFACE.secondary, marginTop: 4, textTransform: 'capitalize' },
  sheetMeta: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  sheetReason: { fontSize: 13, color: COLORS.dangerDark, marginTop: 8, fontStyle: 'italic' },
  error: { fontSize: 13, color: COLORS.danger, marginTop: 10 },
  sheetLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetInput: { backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, minHeight: 80, textAlignVertical: 'top', marginTop: 6 },
  sheetButton: { marginTop: 16 },
});
