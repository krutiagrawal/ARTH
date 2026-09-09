import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, GRADIENTS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Sheet } from '../components/common/Sheet';
import { useBottomNavClearance } from '../components/navigation/BottomNav';
import { useAdminCatalog, useCreateAdminCatalogItem, useUpdateAdminCatalogItem } from '../hooks/useApiQueries';
import { ADMIN_CATALOG_MODELS, coerceCatalogValue } from '../constants/adminCatalogModels';
import type { AdminCatalogModel } from '../api/admin';
import { ApiError } from '../api/client';

const MODEL_KEYS = Object.keys(ADMIN_CATALOG_MODELS) as AdminCatalogModel[];

export function AdminCatalogScreen() {
  const insets = useSafeAreaInsets();
  const bottomClearance = useBottomNavClearance();
  const [modelKey, setModelKey] = useState<AdminCatalogModel>(MODEL_KEYS[0]);
  const config = ADMIN_CATALOG_MODELS[modelKey];

  const { data: items, isLoading } = useAdminCatalog(modelKey);
  const createMutation = useCreateAdminCatalogItem(modelKey);
  const updateMutation = useUpdateAdminCatalogItem(modelKey);

  const [editing, setEditing] = useState<any | null>(null); // null = create sheet closed; {} = creating; {...item} = editing
  const [form, setForm] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing({});
    setForm(config.hasKey ? { key: '' } : {});
    setError(null);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    const initial: Record<string, any> = config.hasKey ? { key: item.key } : {};
    for (const f of config.fields) initial[f.name] = item[f.name] ?? (f.type === 'checkbox' ? false : '');
    setForm(initial);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    try {
      const body: Record<string, unknown> = config.hasKey ? { key: form.key } : {};
      for (const f of config.fields) body[f.name] = coerceCatalogValue(f, form[f.name]);

      if (editing?.id) {
        await updateMutation.mutateAsync({ id: editing.id, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      setEditing(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    }
  };

  const toggleActive = async (item: any) => {
    try {
      await updateMutation.mutateAsync({ id: item.id, body: { isActive: !item.isActive } });
    } catch {
      // Row stays as-is on failure; nothing else to reconcile here.
    }
  };

  const primaryField = config.fields[0].name;
  const working = createMutation.isPending || updateMutation.isPending;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENTS.nightSky as any} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Catalog</Text>
          <AnimatedButton label="New" onPress={openCreate} size="sm" />
        </View>
      </View>

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {MODEL_KEYS.map((key) => (
            <TouchableOpacity key={key} style={[styles.chip, modelKey === key && styles.chipActive]} onPress={() => setModelKey(key)}>
              <Text style={[styles.chipText, modelKey === key && styles.chipTextActive]}>{ADMIN_CATALOG_MODELS[key].label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]} showsVerticalScrollIndicator={false}>
        {isLoading && <ActivityIndicator color={COLORS.mint} style={styles.loader} />}
        {!isLoading && (!items || items.length === 0) && (
          <EmptyState icon="📚" title="Nothing here yet" body={`Create your first ${config.label.toLowerCase()}.`} tint="dark" />
        )}
        {(items ?? []).map((item: any) => (
          <BorderCard key={item.id} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle} numberOfLines={1}>{String(item[primaryField])}</Text>
                {config.hasKey && <Text style={styles.cardMeta}>{item.key}</Text>}
              </View>
              {config.deactivatable && (
                <View style={[styles.statusChip, { borderColor: item.isActive ? COLORS.sageLight : COLORS.dangerLight }]}>
                  <Text style={[styles.statusChipText, { color: item.isActive ? COLORS.sageLight : COLORS.dangerLight }]}>
                    {item.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.actionsRow}>
              <AnimatedButton label="Edit" onPress={() => openEdit(item)} variant="secondary" size="sm" style={styles.actionButton} />
              {config.deactivatable && (
                <AnimatedButton
                  label={item.isActive ? 'Deactivate' : 'Activate'}
                  onPress={() => toggleActive(item)}
                  variant={item.isActive ? 'danger' : 'primary'}
                  size="sm"
                  style={styles.actionButton}
                />
              )}
            </View>
          </BorderCard>
        ))}
      </ScrollView>

      <Sheet visible={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${config.label.replace(/s$/, '')}` : `New ${config.label.replace(/s$/, '')}`}>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
          {config.hasKey && (
            <View style={styles.field}>
              <Text style={styles.sheetLabel}>key *</Text>
              <TextInput
                style={styles.sheetInput}
                value={form.key ?? ''}
                onChangeText={(v: string) => setForm((s) => ({ ...s, key: v }))}
                editable={!editing?.id}
                autoCapitalize="none"
              />
            </View>
          )}
          {config.fields.map((f) => (
            <View key={f.name} style={styles.field}>
              <Text style={styles.sheetLabel}>{f.name}{f.required ? ' *' : ''}</Text>
              {f.type === 'checkbox' ? (
                <TouchableOpacity
                  style={[styles.checkboxRow]}
                  onPress={() => setForm((s) => ({ ...s, [f.name]: !s[f.name] }))}
                >
                  <View style={[styles.checkbox, form[f.name] && styles.checkboxChecked]} />
                  <Text style={styles.sheetLabel}>{form[f.name] ? 'Yes' : 'No'}</Text>
                </TouchableOpacity>
              ) : f.type === 'select' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {(f.options ?? []).map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.chip, form[f.name] === opt && styles.chipActive]}
                      onPress={() => setForm((s) => ({ ...s, [f.name]: opt }))}
                    >
                      <Text style={[styles.chipText, form[f.name] === opt && styles.chipTextActive]}>{opt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <TextInput
                  style={[styles.sheetInput, f.type === 'textarea' && styles.sheetTextarea]}
                  value={form[f.name] != null ? String(form[f.name]) : ''}
                  onChangeText={(v: string) => setForm((s) => ({ ...s, [f.name]: v }))}
                  keyboardType={f.type === 'number' ? 'numeric' : 'default'}
                  multiline={f.type === 'textarea'}
                  placeholder={f.type === 'date' ? 'YYYY-MM-DD' : undefined}
                  placeholderTextColor={ON_DARK_SURFACE.muted}
                />
              )}
            </View>
          ))}
          {error && <Text style={styles.error}>{error}</Text>}
          <AnimatedButton
            label={working ? 'Saving…' : editing?.id ? 'Save changes' : 'Create'}
            onPress={submit}
            disabled={working}
            fullWidth
            style={styles.sheetButton}
          />
        </ScrollView>
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  filterBar: { paddingHorizontal: 20, marginBottom: 8 },
  chipRow: { gap: 8, paddingRight: 20 },
  chip: { borderRadius: RADIUS.full, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: 'rgba(200,230,192,0.18)', borderColor: COLORS.mint },
  chipText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  chipTextActive: { color: COLORS.mint, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  card: { marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: ON_DARK_SURFACE.primary },
  cardMeta: { fontSize: 11, color: ON_DARK_SURFACE.secondary, marginTop: 2 },
  statusChip: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionButton: { flex: 1 },
  field: { marginBottom: 14 },
  sheetLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  sheetInput: { backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: COLORS.textPrimary },
  sheetTextarea: { minHeight: 70, textAlignVertical: 'top' },
  sheetButton: { marginTop: 8, marginBottom: 8 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: COLORS.textMuted },
  checkboxChecked: { backgroundColor: COLORS.sage, borderColor: COLORS.sage },
  error: { fontSize: 13, color: COLORS.danger, marginBottom: 10 },
});
