import React, { useState } from 'react';
import { View, Image, Linking, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, TextInput } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS, GRADIENTS, ON_DARK_SURFACE } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { BorderCard } from '../components/common/BorderCard';
import { StatDisplay } from '../components/common/StatDisplay';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { Sheet } from '../components/common/Sheet';
import { useAdminNgo, useAdminNgoSummary, useSetAdminNgoStatus } from '../hooks/useApiQueries';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { ApiError, resolveMediaUrl } from '../api/client';
import type { ApiAdminNgo, ApiAdminNgoDocument, NgoApprovalStatus } from '../api/admin';
import { useTimeTheme, isNightlikePeriod } from '../hooks/useTimeTheme';

const ORG_TYPE_LABELS: Record<string, string> = {
  trust: 'Trust',
  society: 'Society',
  section8_company: 'Section 8 company',
  registered_nonprofit: 'Registered non-profit',
  other: 'Other',
};

const WORK_AREA_LABELS: Record<string, string> = {
  tree_plantation: 'Tree plantation',
  forest_restoration: 'Forest restoration',
  urban_greening: 'Urban greening',
  biodiversity: 'Biodiversity',
  water_conservation: 'Water conservation',
  waste_management: 'Waste management',
  environmental_education: 'Environmental education',
  rural_community_development: 'Rural/community development',
  other: 'Other',
};

const ARTH_USAGE_LABELS: Record<string, string> = {
  organise_plantation_drives: 'Organise plantation drives',
  recruit_volunteers: 'Recruit volunteers',
  source_saplings: 'Source saplings',
  track_planted_trees: 'Track planted trees',
  manage_corporate_school_programs: 'Manage corporate/school programs',
  receive_donations: 'Receive donations',
  showcase_projects: 'Showcase projects',
  other: 'Other',
};

const PARTICIPANT_TYPE_LABELS: Record<string, string> = {
  individuals: 'Individuals',
  schools: 'Schools',
  colleges: 'Colleges',
  corporates: 'Corporates',
  government: 'Government',
  communities: 'Communities',
  volunteers: 'Volunteers',
  other_ngos: 'Other NGOs',
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  registration_certificate: 'Registration certificate',
  twelve_a_certificate: '12A/12AB certificate',
  eighty_g_certificate: '80G certificate',
  fcra_certificate: 'FCRA certificate',
  csr1_certificate: 'CSR-1 certificate',
  authorization_proof: 'Authorisation proof',
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function ChipRow({ values, labels }: { values?: string[] | null; labels: Record<string, string> }) {
  if (!values || values.length === 0) return null;
  return (
    <View style={styles.chipRow}>
      {values.map((v) => (
        <View key={v} style={styles.chip}>
          <Text style={styles.chipText}>{labels[v] || v}</Text>
        </View>
      ))}
    </View>
  );
}

function LinkListRow({ label, links }: { label: string; links?: string[] | null }) {
  if (!links || links.length === 0) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      {links.map((link, i) => (
        <TouchableOpacity key={`${link}-${i}`} onPress={() => Linking.openURL(link)}>
          <Text style={[styles.infoValue, styles.link]} numberOfLines={1}>
            {link}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function statusColor(status: string) {
  switch (status) {
    case 'approved':
      return COLORS.sageLight;
    case 'pending':
      return COLORS.amberLight;
    case 'rejected':
    case 'suspended':
      return COLORS.dangerLight;
    default:
      return ON_DARK_SURFACE.primary;
  }
}

export function AdminNgoApprovalDetailScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const initialNgo: ApiAdminNgo = route.params.ngo;
  const [ngo, setNgo] = useState<ApiAdminNgo>(initialNgo);
  const detailQuery = useAdminNgo(initialNgo.id);
  const ngoDetail = detailQuery.data;
  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useAdminNgoSummary(ngo.id);
  const setStatusMutation = useSetAdminNgoStatus();

  const [reasonSheet, setReasonSheet] = useState<'rejected' | 'suspended' | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { period } = useTimeTheme();
  const isNightMode = isNightlikePeriod(period);
  const { refreshing, onRefresh } = usePullToRefresh(async () => {
    await Promise.all([detailQuery.refetch(), refetchSummary()]);
  });

  // Merge: the full detail fetch is the source of truth once it lands, but the list-row object
  // passed via route params keeps the header/status usable while that request is in flight.
  const d: ApiAdminNgo & Partial<Record<string, any>> = { ...ngo, ...(ngoDetail ?? {}) };
  const documents: ApiAdminNgoDocument[] = d.documents ?? [];
  const pastWorkPhotos = documents.filter((doc) => doc.docType === 'past_work_photo');
  const certificates = documents.filter((doc) => doc.docType !== 'past_work_photo');

  const applyStatus = async (status: NgoApprovalStatus, rejectionReason?: string) => {
    setError(null);
    try {
      const updated = await setStatusMutation.mutateAsync({ id: ngo.id, status, rejectionReason });
      setNgo(updated);
      setReasonSheet(null);
      setReason('');
      if (status === 'approved') navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update this NGO. Please try again.');
    }
  };

  const openReasonSheet = (status: 'rejected' | 'suspended') => {
    setError(null);
    setReason('');
    setReasonSheet(status);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={GRADIENTS.nightSky as any} style={StyleSheet.absoluteFill} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <View style={styles.backBlur}>
            <Text style={styles.backIcon}>←</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{ngo.orgName}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.sage} colors={[COLORS.sage]} />}
      >
        <BorderCard style={styles.card}>
          <View style={[styles.statusChip, { borderColor: statusColor(ngo.status), alignSelf: 'flex-start' }]}>
            <Text style={[styles.statusChipText, { color: statusColor(ngo.status) }]}>{ngo.status}</Text>
          </View>
          <Text style={styles.description}>{d.description}</Text>

          <InfoRow label="Owner" value={d.owner ? `${d.owner.name} · ${d.owner.email}` : null} />
          <InfoRow label="Applied" value={new Date(ngo.createdAt).toLocaleDateString()} />
          <InfoRow label="Reason on file" value={d.rejectionReason} />

          {detailQuery.isLoading && !ngoDetail && <Text style={styles.loadingText}>Loading full application…</Text>}
        </BorderCard>

        {documents.length > 0 && (
          <BorderCard style={styles.card}>
            <SectionLabel>Documents</SectionLabel>
            {pastWorkPhotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
                {pastWorkPhotos.map((doc) => (
                  <Image key={doc.id} source={{ uri: resolveMediaUrl(doc.fileUrl) }} style={styles.pastWorkPhoto} resizeMode="cover" />
                ))}
              </ScrollView>
            )}
            {certificates.map((doc) => (
              <TouchableOpacity key={doc.id} onPress={() => Linking.openURL(resolveMediaUrl(doc.fileUrl) ?? doc.fileUrl)} style={styles.docRow}>
                <Text style={styles.docIcon}>📄</Text>
                <Text style={[styles.infoValue, styles.link]}>{DOCUMENT_TYPE_LABELS[doc.docType] || doc.docType} · View</Text>
              </TouchableOpacity>
            ))}
          </BorderCard>
        )}

        <BorderCard style={styles.card}>
          <SectionLabel>Organisation</SectionLabel>
          <InfoRow label="Type" value={d.orgType ? ORG_TYPE_LABELS[d.orgType] || d.orgType : null} />
          <InfoRow label="Year established" value={d.foundedYear} />
          <InfoRow label="Website" value={d.website} />
          <InfoRow label="Official email" value={d.officialEmail} />
          <InfoRow label="Official phone" value={d.contactPhone ? `+91 ${d.contactPhone}` : null} />
          {d.socialMediaLinks?.length > 0 && <LinkListRow label="Social media" links={d.socialMediaLinks} />}
        </BorderCard>

        {(d.line1 || d.city || d.operatingCities?.length > 0 || d.operatingStates?.length > 0) && (
          <BorderCard style={styles.card}>
            <SectionLabel>Address</SectionLabel>
            <InfoRow label="Registered address" value={d.line1} />
            <InfoRow label="City" value={d.city} />
            <InfoRow label="Operating cities" value={d.operatingCities?.length ? d.operatingCities.join(', ') : null} />
            <InfoRow label="Operating states" value={d.operatingStates?.length ? d.operatingStates.join(', ') : null} />
          </BorderCard>
        )}

        {(d.registrationNumber || d.panNumber || d.ngoDarpanId || d.twelveARegistrationNumber || d.eightyGRegistrationNumber || d.fcraRegistrationNumber || d.csr1RegistrationNumber) && (
          <BorderCard style={styles.card}>
            <SectionLabel>Registration & legal</SectionLabel>
            <InfoRow label="Registration number" value={d.registrationNumber} />
            <InfoRow label="Registration authority" value={d.registrationAuthority} />
            <InfoRow label="PAN" value={d.panNumber} />
            <InfoRow label="NGO Darpan ID" value={d.ngoDarpanId} />
            <InfoRow label="12A/12AB number" value={d.twelveARegistrationNumber} />
            <InfoRow label="80G number" value={d.eightyGRegistrationNumber} />
            <InfoRow label="FCRA number" value={d.fcraRegistrationNumber} />
            <InfoRow label="CSR-1 number" value={d.csr1RegistrationNumber} />
          </BorderCard>
        )}

        {(d.primaryContactName || d.officeBearers?.length > 0) && (
          <BorderCard style={styles.card}>
            <SectionLabel>People</SectionLabel>
            <InfoRow label="Primary contact" value={d.primaryContactName} />
            <InfoRow label="Designation" value={d.primaryContactDesignation} />
            <InfoRow label="Phone" value={d.primaryContactPhone ? `+91 ${d.primaryContactPhone}` : null} />
            <InfoRow label="Email" value={d.primaryContactEmail} />
            {d.officeBearers?.map((bearer: any, i: number) => (
              <InfoRow
                key={i}
                label={`Office bearer ${i + 1}`}
                value={[bearer.name, bearer.designation, bearer.phone ? `+91 ${bearer.phone}` : null].filter(Boolean).join(' · ')}
              />
            ))}
          </BorderCard>
        )}

        <BorderCard style={styles.card}>
          <SectionLabel>What they do</SectionLabel>
          <ChipRow values={d.primaryWorkAreas} labels={WORK_AREA_LABELS} />
          <InfoRow label="Drives conducted (historical)" value={d.drivesConductedHistorical} />
          <InfoRow label="Trees planted (historical)" value={d.treesPlantedHistorical} />
          <InfoRow label="Active volunteers" value={d.volunteerCountEstimate} />
          <InfoRow label="Major projects" value={d.majorProjectsDescription} />
          <InfoRow label="Environmental work since" value={d.environmentalWorkSinceYear} />
        </BorderCard>

        {d.conductsPlantationDrives != null && (
          <BorderCard style={styles.card}>
            <SectionLabel>Plantation practices</SectionLabel>
            <InfoRow label="Conducts plantation drives" value={d.conductsPlantationDrives ? 'Yes' : 'No'} />
            <InfoRow label="Typical saplings per drive" value={d.typicalSaplingsPerDrive} />
            <InfoRow label="Typical locations" value={d.typicalDriveLocations} />
            <InfoRow label="Species commonly planted" value={d.speciesCommonlyPlanted} />
            <InfoRow label="Sapling source" value={d.saplingSourceDescription} />
            <InfoRow label="Monitors survival post-planting" value={d.monitorsSurvivalPostPlanting == null ? null : d.monitorsSurvivalPostPlanting ? 'Yes' : 'No'} />
            <InfoRow label="Does post-plantation maintenance" value={d.doesPostPlantationMaintenance == null ? null : d.doesPostPlantationMaintenance ? 'Yes' : 'No'} />
            <InfoRow label="Verification method" value={d.plantationVerificationMethod} />
            <LinkListRow label="Previous project links" links={d.previousProjectLinks} />
          </BorderCard>
        )}

        {(d.driveReportLinks?.length > 0 ||
          d.mediaCoverageLinks?.length > 0 ||
          d.projectPageLinks?.length > 0 ||
          d.annualReportLinks?.length > 0 ||
          d.impactReportLinks?.length > 0 ||
          d.socialMediaPostLinks?.length > 0) && (
          <BorderCard style={styles.card}>
            <SectionLabel>Proof of previous work</SectionLabel>
            <LinkListRow label="Drive reports" links={d.driveReportLinks} />
            <LinkListRow label="Media coverage" links={d.mediaCoverageLinks} />
            <LinkListRow label="Project pages" links={d.projectPageLinks} />
            <LinkListRow label="Annual reports" links={d.annualReportLinks} />
            <LinkListRow label="Impact reports" links={d.impactReportLinks} />
            <LinkListRow label="Social media posts" links={d.socialMediaPostLinks} />
          </BorderCard>
        )}

        {(d.arthUsageGoals?.length > 0 || d.participantTypes?.length > 0 || d.expectedDrivesPerYear) && (
          <BorderCard style={styles.card}>
            <SectionLabel>ARTH goals</SectionLabel>
            <ChipRow values={d.arthUsageGoals} labels={ARTH_USAGE_LABELS} />
            <InfoRow label="Expected drives/year via ARTH" value={d.expectedDrivesPerYear} />
            <ChipRow values={d.participantTypes} labels={PARTICIPANT_TYPE_LABELS} />
          </BorderCard>
        )}

        <BorderCard style={styles.card}>
          <Text style={styles.cardTitle}>Activity</Text>
          {summaryLoading || !summary ? (
            <Text style={styles.loadingText}>Loading…</Text>
          ) : (
            <View style={styles.statsGrid}>
              <StatDisplay value={String(summary.drivesCount)} label="Drives" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} />
              <StatDisplay value={String(summary.campaignsCount)} label="Campaigns" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} />
              <StatDisplay value={String(summary.treesCount)} label="Trees listed" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} />
              <StatDisplay value={`₹${(summary.totalRaisedCents / 100).toLocaleString()}`} label="Raised" color={ON_DARK_SURFACE.primary} labelColor={ON_DARK_SURFACE.secondary} />
            </View>
          )}
        </BorderCard>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          {ngo.status !== 'approved' && (
            <AnimatedButton
              label={setStatusMutation.isPending ? 'Working…' : 'Approve'}
              onPress={() => applyStatus('approved')}
              disabled={setStatusMutation.isPending}
              fullWidth
              style={styles.actionButton}
            />
          )}
          {ngo.status !== 'rejected' && (
            <AnimatedButton
              label="Reject"
              onPress={() => openReasonSheet('rejected')}
              variant="danger"
              disabled={setStatusMutation.isPending}
              fullWidth
              style={styles.actionButton}
            />
          )}
          {ngo.status !== 'suspended' && ngo.status !== 'pending' && (
            <AnimatedButton
              label="Suspend"
              onPress={() => openReasonSheet('suspended')}
              variant="secondary"
              disabled={setStatusMutation.isPending}
              fullWidth
              style={styles.actionButton}
            />
          )}
        </View>
      </ScrollView>

      <Sheet visible={reasonSheet !== null} onClose={() => setReasonSheet(null)} title={reasonSheet === 'rejected' ? 'Reject NGO' : 'Suspend NGO'}>
        <Text style={[styles.sheetLabel, isNightMode && styles.sheetLabelNight]}>Reason (optional)</Text>
        <TextInput
          style={[styles.sheetInput, isNightMode && styles.sheetInputNight]}
          value={reason}
          onChangeText={setReason}
          placeholder="eg - Let them know why…"
          placeholderTextColor={isNightMode ? ON_DARK_SURFACE.muted : COLORS.textLight}
          multiline
        />
        <AnimatedButton
          label={setStatusMutation.isPending ? 'Working…' : `Confirm ${reasonSheet === 'rejected' ? 'reject' : 'suspend'}`}
          onPress={() => reasonSheet && applyStatus(reasonSheet, reason.trim() || undefined)}
          variant="danger"
          disabled={setStatusMutation.isPending}
          fullWidth
          style={styles.sheetButton}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 12 },
  backButton: { width: 40, height: 40 },
  backBlur: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  backIcon: { fontSize: 26, color: COLORS.white, fontWeight: '700' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: ON_DARK_SURFACE.primary, textAlign: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  card: { marginBottom: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: ON_DARK_SURFACE.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  statusChip: { borderWidth: 1, borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 3, marginBottom: 10 },
  statusChipText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  description: { fontSize: 14, color: ON_DARK_SURFACE.secondary, lineHeight: 20 },
  infoRow: { marginTop: 12 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: ON_DARK_SURFACE.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, color: ON_DARK_SURFACE.primary, marginTop: 2 },
  link: { color: COLORS.mint, textDecorationLine: 'underline' },
  loadingText: { fontSize: 12, color: ON_DARK_SURFACE.muted, marginTop: 12, fontStyle: 'italic' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.sageLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  photoStrip: { marginBottom: 10 },
  pastWorkPhoto: { width: 120, height: 120, borderRadius: RADIUS.md, marginRight: 8 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  docIcon: { fontSize: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.full, backgroundColor: 'rgba(255,255,255,0.1)' },
  chipText: { fontSize: 12, fontWeight: '600', color: ON_DARK_SURFACE.primary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  error: { fontSize: 13, color: COLORS.dangerLight, marginBottom: 12 },
  actions: { gap: 10, marginTop: 4 },
  actionButton: {},
  sheetLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  sheetInput: { backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: RADIUS.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: COLORS.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  sheetButton: { marginTop: 16 },
  sheetLabelNight: { color: ON_DARK_SURFACE.secondary },
  sheetInputNight: { backgroundColor: 'rgba(255,255,255,0.08)', color: ON_DARK_SURFACE.primary },
});
