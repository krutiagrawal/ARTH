import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '../components/common/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/colors';
import { RADIUS } from '../constants/theme';
import { useNgoProfile, useUpdateNgoProfile, useCities } from '../hooks/useApiQueries';
import { AnimatedButton } from '../components/common/AnimatedButton';
import { FormField } from '../components/common/FormField';
import { PhoneField } from '../components/common/PhoneField';
import { CityPickerField } from '../components/common/CityPickerField';
import { AddressSearchField } from '../components/common/AddressSearchField';
import { SelectField } from '../components/common/SelectField';
import { ChipListField } from '../components/common/ChipListField';
import { MultiPickerField } from '../components/common/MultiPickerField';
import { OfficeBearerListField } from '../components/common/OfficeBearerListField';
import { Toggle } from '../components/common/Toggle';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { INDIAN_STATES_AND_UTS } from '../constants/indianStates';
import {
  ORG_TYPE_OPTIONS,
  WORK_AREA_OPTIONS,
  SAPLINGS_PER_DRIVE_OPTIONS,
  ARTH_USAGE_OPTIONS,
  PARTICIPANT_TYPE_OPTIONS,
} from '../constants/ngoOptions';
import { EMPTY_NGO_DETAILS, detailsFromProfile, detailsToInput, type NgoDetailsForm } from '../utils/ngoProfileForm';
import { NGO_PROFILE_SECTIONS, type NgoProfileSectionId } from '../constants/ngoProfileSections';
import { isValidPhone, isValidWebsite, isValidEmail, isValidPan, isValidYear } from '../utils/validation';
import type { Award } from '../api/ngo';
import { ApiError } from '../api/client';
import { useConfirm } from '../context/ConfirmDialogContext';

// Whole-form snapshot used to tell whether anything has been edited since the profile last loaded.
function buildSnapshot(v: {
  orgName: string; description: string; website: string; contactPhone: string; city: string;
  foundedYear: string; volunteerCountEstimate: string; awards: Award[]; details: NgoDetailsForm;
}) {
  return JSON.stringify(v);
}

/**
 * One section of the NGO profile on its own screen (opened from the rows on NgoSettingsScreen).
 * Each section loads the current profile fresh, edits its own fields, and saves with its own bar -
 * the same PATCH the old single long form used, so a section can't clobber another's newer data.
 */
export function NgoProfileSectionScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const section: NgoProfileSectionId = route?.params?.section ?? 'basic';
  const meta = NGO_PROFILE_SECTIONS[section];
  const { data: profile } = useNgoProfile();
  const updateMutation = useUpdateNgoProfile();
  const confirm = useConfirm();

  const [orgName, setOrgName] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [websiteTouched, setWebsiteTouched] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  const [contactPhoneTouched, setContactPhoneTouched] = useState(false);
  const [city, setCity] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [volunteerCountEstimate, setVolunteerCountEstimate] = useState('');
  const [awards, setAwards] = useState<Award[]>([]);
  const [details, setDetails] = useState<NgoDetailsForm>(EMPTY_NGO_DETAILS);
  const setDetail = <K extends keyof NgoDetailsForm>(key: K) => (value: NgoDetailsForm[K]) =>
    setDetails((prev) => ({ ...prev, [key]: value }));
  const { data: cityList = [] } = useCities();
  const cityNames = cityList.map((c) => c.name);
  // Legal/KYC details an admin verified are read-only once approved (the API enforces it too).
  const legalLocked = profile?.status === 'approved' || profile?.status === 'suspended';
  const linkProps = { keyboardType: 'url' as const, validate: isValidWebsite, validationHint: "Doesn't look like a valid link" };
  const [error, setError] = useState<string | null>(null);

  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);
  const currentSnapshot = useMemo(
    () => buildSnapshot({ orgName, description, website, contactPhone, city, foundedYear, volunteerCountEstimate, awards, details }),
    [orgName, description, website, contactPhone, city, foundedYear, volunteerCountEstimate, awards, details],
  );
  const dirty = initialSnapshot !== null && currentSnapshot !== initialSnapshot;

  useEffect(() => {
    if (!profile) return;
    const next = {
      orgName: profile.orgName,
      description: profile.description,
      website: profile.website ?? '',
      contactPhone: profile.contactPhone ?? '',
      city: profile.city || 'Pune',
      foundedYear: profile.foundedYear ? String(profile.foundedYear) : '',
      volunteerCountEstimate: profile.volunteerCountEstimate ? String(profile.volunteerCountEstimate) : '',
      awards: profile.awards ?? [],
      details: detailsFromProfile(profile),
    };
    setOrgName(next.orgName);
    setDescription(next.description);
    setWebsite(next.website);
    setContactPhone(next.contactPhone);
    setCity(next.city);
    setFoundedYear(next.foundedYear);
    setVolunteerCountEstimate(next.volunteerCountEstimate);
    setAwards(next.awards);
    setDetails(next.details);
    setInitialSnapshot(buildSnapshot(next));
  }, [profile]);

  const addAward = () => setAwards((prev) => [...prev, { title: '', year: undefined, issuer: '' }]);
  const removeAward = (index: number) => setAwards((prev) => prev.filter((_, i) => i !== index));
  const updateAward = (index: number, patch: Partial<Award>) =>
    setAwards((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const handleSave = async () => {
    setError(null);
    if (website.trim() && !isValidWebsite(website)) {
      setWebsiteTouched(true);
      return setError('Enter a valid website URL');
    }
    if (contactPhone && !isValidPhone(contactPhone)) {
      setContactPhoneTouched(true);
      return setError('Enter a valid 10-digit mobile number');
    }
    const d = details;
    if (d.officialEmail.trim() && !isValidEmail(d.officialEmail)) return setError('Enter a valid official email');
    if (d.primaryContactEmail.trim() && !isValidEmail(d.primaryContactEmail)) return setError('Enter a valid email for the primary contact');
    if (d.primaryContactPhone && !isValidPhone(d.primaryContactPhone)) return setError('Enter a valid 10-digit phone for the primary contact');
    if (!legalLocked && d.panNumber.trim() && !isValidPan(d.panNumber.trim().toUpperCase())) return setError('Enter a valid PAN (e.g. ABCDE1234F)');
    if (d.environmentalWorkSinceYear && !isValidYear(d.environmentalWorkSinceYear)) return setError('Enter a valid year for "Doing environmental work since"');
    try {
      await updateMutation.mutateAsync({
        ...detailsToInput(d, !legalLocked),
        orgName: orgName.trim(),
        description: description.trim(),
        website: website.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        city: city.trim() || undefined,
        foundedYear: foundedYear ? Number(foundedYear) : undefined,
        volunteerCountEstimate: volunteerCountEstimate ? Number(volunteerCountEstimate) : undefined,
        awards: awards.filter((a) => a.title.trim()),
      });
      confirm('Saved', `${meta.title} updated.`);
      navigation?.goBack?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your profile. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="dark" />
      <LinearGradient colors={[COLORS.cream, COLORS.beigeLight]} style={StyleSheet.absoluteFill} />

      <ScreenHeader title={meta.title} subtitle={meta.subtitle} onBack={() => navigation?.goBack?.()} />

      {!profile ? (
        <ActivityIndicator color={COLORS.sage} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {section === 'basic' && (
            <View>
            <FormField maxLength={120} label="Organization Name" value={orgName} onChangeText={setOrgName} placeholder="eg - Your organization" />
            <FormField maxLength={2000} label="Description" value={description} onChangeText={setDescription} multiline placeholder="eg - We plant. We protect. We inspire." />
            <FormField maxLength={300}
              label="Website"
              value={website}
              onChangeText={setWebsite}
              onBlur={() => setWebsiteTouched(true)}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="eg - https://"
            />
            {websiteTouched && website.trim() && !isValidWebsite(website) && (
              <Text style={styles.fieldError}>Enter a valid website URL</Text>
            )}
            <PhoneField
              label="Contact Phone"
              value={contactPhone}
              onChangeText={setContactPhone}
              onBlur={() => setContactPhoneTouched(true)}
              error={contactPhoneTouched && contactPhone && !isValidPhone(contactPhone) ? 'Enter a valid 10-digit mobile number' : null}
            />
            <CityPickerField value={city} onChange={setCity} />
            <View style={styles.row2}>
            <FormField
              style={styles.flex1}
              label="Founded Year"
              value={foundedYear}
              onChangeText={(v: string) => setFoundedYear(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="eg - 2018"
            />
            <FormField
              style={styles.flex1}
              label="Volunteers (approx.)"
              value={volunteerCountEstimate}
              onChangeText={(v: string) => setVolunteerCountEstimate(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="eg - 120"
            />
            </View>
            </View>
          )}

          {section === 'awards' && (
            <View>
            <View style={styles.subCard}>
              {awards.map((award, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.listItemHeader}>
                    <Text style={styles.listItemTitle}>Award {i + 1}</Text>
                    <TouchableOpacity onPress={() => removeAward(i)}>
                      <Text style={styles.removeText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <FormField maxLength={200} label="Title" value={award.title} onChangeText={(v: string) => updateAward(i, { title: v })} placeholder="eg - Award title" />
                  <FormField
                    label="Year"
                    value={award.year ? String(award.year) : ''}
                    onChangeText={(v: string) => updateAward(i, { year: v ? Number(v.replace(/[^0-9]/g, '')) : undefined })}
                    keyboardType="number-pad"
                    placeholder="eg - Year"
                  />
                  <FormField maxLength={200} label="Issued by" value={award.issuer ?? ''} onChangeText={(v: string) => updateAward(i, { issuer: v })} placeholder="eg - Issuing body" />
                </View>
              ))}
              <TouchableOpacity style={styles.addButton} onPress={addAward}>
                <Text style={styles.addButtonText}>+ Add award</Text>
              </TouchableOpacity>
            </View>

            </View>
          )}

          {section === 'organisation' && (
            <View>
            {legalLocked ? (
              <FormField label="Organisation type" value={ORG_TYPE_OPTIONS.find((o) => o.value === details.orgType)?.label ?? ''} editable={false} style={styles.lockedField} />
            ) : (
              <SelectField layout="list" label="Organisation type" options={ORG_TYPE_OPTIONS} value={details.orgType} onChange={setDetail('orgType')} />
            )}
            <AddressSearchField
              allowCurrentLocation
              maxLength={300}
              label="Full registered address"
              value={details.line1}
              onChangeText={setDetail('line1')}
              placeholder="Street / area / landmark"
              multiline
              onSelectSuggestion={(sg) => setDetail('line1')(sg.label)}
            />
            <ChipListField label="Cities you operate in" maxItemLength={60} placeholder="Search or add a city" suggestions={cityNames} values={details.operatingCities} onChange={setDetail('operatingCities')} />
            <MultiPickerField label="States you operate in" placeholder="Select states / UTs" sheetTitle="States and Union Territories" options={INDIAN_STATES_AND_UTS} values={details.operatingStates} onChange={setDetail('operatingStates')} />
            <FormField maxLength={254} label="Official email" value={details.officialEmail} onChangeText={setDetail('officialEmail')} autoCapitalize="none" keyboardType="email-address" placeholder="eg - contact@yourngo.org" />
            <ChipListField label="Social media links" placeholder="Paste a link" values={details.socialMediaLinks} onChange={setDetail('socialMediaLinks')} {...linkProps} />
            </View>
          )}

          {section === 'legal' && (
            <View>
            {legalLocked && (
              <Text style={styles.lockNote}>These were verified when your account was approved, so they can't be edited here. Contact support if something needs to change.</Text>
            )}
            <FormField maxLength={10} label="PAN of organisation" value={details.panNumber} onChangeText={(t: string) => setDetail('panNumber')(t.toUpperCase())} autoCapitalize="characters" editable={!legalLocked} style={legalLocked ? styles.lockedField : undefined} placeholder="ABCDE1234F" />
            <FormField maxLength={80} label="Registration number" value={details.registrationNumber} onChangeText={setDetail('registrationNumber')} editable={!legalLocked} style={legalLocked ? styles.lockedField : undefined} />
            <FormField maxLength={120} label="Registration authority" value={details.registrationAuthority} onChangeText={setDetail('registrationAuthority')} editable={!legalLocked} style={legalLocked ? styles.lockedField : undefined} />
            <FormField maxLength={40} label="NGO Darpan ID" value={details.ngoDarpanId} onChangeText={setDetail('ngoDarpanId')} autoCapitalize="characters" editable={!legalLocked} style={legalLocked ? styles.lockedField : undefined} />
            <FormField maxLength={60} label="12A / 12AB registration number" value={details.twelveARegistrationNumber} onChangeText={setDetail('twelveARegistrationNumber')} editable={!legalLocked} style={legalLocked ? styles.lockedField : undefined} />
            <FormField maxLength={60} label="80G registration number" value={details.eightyGRegistrationNumber} onChangeText={setDetail('eightyGRegistrationNumber')} editable={!legalLocked} style={legalLocked ? styles.lockedField : undefined} />
            <FormField maxLength={60} label="FCRA registration number" value={details.fcraRegistrationNumber} onChangeText={setDetail('fcraRegistrationNumber')} editable={!legalLocked} style={legalLocked ? styles.lockedField : undefined} />
            <FormField maxLength={60} label="CSR-1 registration number" value={details.csr1RegistrationNumber} onChangeText={setDetail('csr1RegistrationNumber')} editable={!legalLocked} style={legalLocked ? styles.lockedField : undefined} />
            </View>
          )}

          {section === 'people' && (
            <View>
            <FormField maxLength={60} label="Primary contact's full name" value={details.primaryContactName} onChangeText={setDetail('primaryContactName')} />
            <FormField maxLength={80} label="Designation" value={details.primaryContactDesignation} onChangeText={setDetail('primaryContactDesignation')} />
            <PhoneField label="Primary contact's phone" value={details.primaryContactPhone} onChangeText={setDetail('primaryContactPhone')} />
            <FormField maxLength={254} label="Primary contact's email" value={details.primaryContactEmail} onChangeText={setDetail('primaryContactEmail')} autoCapitalize="none" keyboardType="email-address" />
            {legalLocked ? (
              details.officeBearers.length > 0 && (
                <View style={styles.subCard}>
                  <Text style={styles.listItemTitle}>Office bearers</Text>
                  {details.officeBearers.map((b, i) => (
                    <Text key={i} style={styles.lockNote}>
                      {b.name}
                      {b.designation ? ' · ' + b.designation : ''}
                    </Text>
                  ))}
                </View>
              )
            ) : (
              <OfficeBearerListField bearers={details.officeBearers} onChange={setDetail('officeBearers')} />
            )}
            </View>
          )}

          {section === 'work' && (
            <View>
            <SelectField multi layout="list" hint="Select all that apply" label="Primary areas of work" options={WORK_AREA_OPTIONS} value={details.primaryWorkAreas} onChange={setDetail('primaryWorkAreas')} />
            <View style={styles.row2}>
            <FormField style={styles.flex1} maxLength={7} label="Drives conducted" value={details.drivesConductedHistorical} onChangeText={(v: string) => setDetail('drivesConductedHistorical')(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="Approx." />
            <FormField style={styles.flex1} maxLength={9} label="Trees planted" value={details.treesPlantedHistorical} onChangeText={(v: string) => setDetail('treesPlantedHistorical')(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="Approx." />
            </View>
            <FormField maxLength={2000} label="Major projects / campaigns" value={details.majorProjectsDescription} onChangeText={setDetail('majorProjectsDescription')} multiline />
            <FormField maxLength={4} label="Doing environmental work since" value={details.environmentalWorkSinceYear} onChangeText={(v: string) => setDetail('environmentalWorkSinceYear')(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" placeholder="Year" />
            </View>
          )}

          {section === 'plantation' && (
            <View>
            <View style={styles.policyCard}>
              <View style={styles.policyText}>
                <Text style={styles.policyTitle}>We conduct plantation drives</Text>
              </View>
              <Toggle value={details.conductsPlantationDrives} onValueChange={setDetail('conductsPlantationDrives')} />
            </View>
            <SelectField layout="grid" label="Typical saplings per drive" options={SAPLINGS_PER_DRIVE_OPTIONS} value={details.typicalSaplingsPerDrive} onChange={setDetail('typicalSaplingsPerDrive')} />
            <FormField maxLength={300} label="Typical drive locations" value={details.typicalDriveLocations} onChangeText={setDetail('typicalDriveLocations')} />
            <FormField maxLength={300} label="Species commonly planted" value={details.speciesCommonlyPlanted} onChangeText={setDetail('speciesCommonlyPlanted')} />
            <FormField maxLength={500} label="How do you verify trees were planted?" value={details.plantationVerificationMethod} onChangeText={setDetail('plantationVerificationMethod')} multiline />
            <FormField maxLength={500} label="Where do you source saplings?" value={details.saplingSourceDescription} onChangeText={setDetail('saplingSourceDescription')} multiline />
            <View style={styles.policyCard}>
              <View style={styles.policyText}>
                <Text style={styles.policyTitle}>We monitor survival post-planting</Text>
              </View>
              <Toggle value={details.monitorsSurvivalPostPlanting} onValueChange={setDetail('monitorsSurvivalPostPlanting')} />
            </View>
            <View style={styles.policyCard}>
              <View style={styles.policyText}>
                <Text style={styles.policyTitle}>We do post-plantation maintenance</Text>
              </View>
              <Toggle value={details.doesPostPlantationMaintenance} onValueChange={setDetail('doesPostPlantationMaintenance')} />
            </View>
            </View>
          )}

          {section === 'links' && (
            <View>
            <ChipListField label="Previous projects" placeholder="Paste a link" values={details.previousProjectLinks} onChange={setDetail('previousProjectLinks')} {...linkProps} />
            <ChipListField label="Plantation drive reports" placeholder="Paste a link" values={details.driveReportLinks} onChange={setDetail('driveReportLinks')} {...linkProps} />
            <ChipListField label="Newspaper / media coverage" placeholder="Paste a link" values={details.mediaCoverageLinks} onChange={setDetail('mediaCoverageLinks')} {...linkProps} />
            <ChipListField label="Website / project pages" placeholder="Paste a link" values={details.projectPageLinks} onChange={setDetail('projectPageLinks')} {...linkProps} />
            <ChipListField label="Annual reports" placeholder="Paste a link" values={details.annualReportLinks} onChange={setDetail('annualReportLinks')} {...linkProps} />
            <ChipListField label="Impact reports" placeholder="Paste a link" values={details.impactReportLinks} onChange={setDetail('impactReportLinks')} {...linkProps} />
            <ChipListField label="Social media posts" placeholder="Paste a link" values={details.socialMediaPostLinks} onChange={setDetail('socialMediaPostLinks')} {...linkProps} />
            </View>
          )}

          {section === 'arth' && (
            <View>
            <SelectField multi layout="list" hint="Select all that apply" label="What would you like to use ARTH for?" options={ARTH_USAGE_OPTIONS} value={details.arthUsageGoals} onChange={setDetail('arthUsageGoals')} />
            <SelectField multi layout="grid" hint="Select all that apply" label="Who typically participates in your drives?" options={PARTICIPANT_TYPE_OPTIONS} value={details.participantTypes} onChange={setDetail('participantTypes')} />
            <FormField maxLength={5} label="Expected drives per year via ARTH" value={details.expectedDrivesPerYear} onChangeText={(v: string) => setDetail('expectedDrivesPerYear')(v.replace(/[^0-9]/g, ''))} keyboardType="number-pad" />
            </View>
          )}
        </ScrollView>
      )}

      {profile && (
        <View style={[styles.saveBar, { paddingBottom: insets.bottom + 12 }]}>
          {error ? <Text style={styles.saveBarError}>{error}</Text> : null}
          <View style={styles.saveBarRow}>
            <View style={styles.saveBarStatus}>
              <View style={[styles.saveDot, { backgroundColor: dirty ? COLORS.golden : COLORS.sage }]} />
              <Text style={styles.saveBarText}>{dirty ? 'Unsaved changes' : 'No changes yet'}</Text>
            </View>
            <AnimatedButton
              label={updateMutation.isPending ? 'Saving…' : 'Save'}
              onPress={handleSave}
              disabled={updateMutation.isPending || !dirty}
              gradientColors={[COLORS.forest, COLORS.forestDeep]}
              style={styles.saveBarButton}
            />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
  lockedField: { opacity: 0.6 },
  row2: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  lockNote: { fontSize: 12, lineHeight: 17, color: COLORS.textMuted, marginBottom: 8 },
  fieldError: { fontSize: 12, color: COLORS.coral, marginTop: -4, marginBottom: 8 },
  policyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.warmBrown,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 12,
  },
  policyText: { flex: 1 },
  policyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  subCard: { borderRadius: RADIUS.md, paddingHorizontal: 0, paddingVertical: 4, marginTop: 4, gap: 8 },
  listItem: { borderTopWidth: 1, borderTopColor: COLORS.sand, paddingTop: 8, marginTop: 4 },
  listItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listItemTitle: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  removeText: { fontSize: 12, color: COLORS.coral, fontWeight: '600' },
  addButton: { alignSelf: 'flex-start', marginTop: 4 },
  addButtonText: { fontSize: 13, color: COLORS.sage, fontWeight: '700' },
  saveBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.cream,
    borderTopWidth: 1,
    borderTopColor: COLORS.sand,
  },
  saveBarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  saveBarStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  saveDot: { width: 8, height: 8, borderRadius: 4 },
  saveBarText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  saveBarButton: { minWidth: 120 },
  saveBarError: { fontSize: 12, color: COLORS.danger, marginBottom: 8 },
});
