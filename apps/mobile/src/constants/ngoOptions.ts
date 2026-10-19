import type { SelectOption } from '../components/common/SelectField';

// Choice lists shared by the NGO registration wizard and the NGO profile edit screen. Keep in sync with
// the NGO_* constants in services/api/src/schemas/auth.schema.ts.

export const ORG_TYPE_OPTIONS: SelectOption[] = [
  { value: 'trust', label: 'Trust' },
  { value: 'society', label: 'Society' },
  { value: 'section8_company', label: 'Section 8 company' },
  { value: 'registered_nonprofit', label: 'Registered non-profit' },
  { value: 'other', label: 'Other' },
];

export const WORK_AREA_OPTIONS: SelectOption[] = [
  { value: 'tree_plantation', label: 'Tree plantation', icon: '🌳' },
  { value: 'forest_restoration', label: 'Forest restoration', icon: '🌲' },
  { value: 'urban_greening', label: 'Urban greening', icon: '🏙️' },
  { value: 'biodiversity', label: 'Biodiversity', icon: '🦋' },
  { value: 'water_conservation', label: 'Water conservation', icon: '💧' },
  { value: 'waste_management', label: 'Waste management', icon: '♻️' },
  { value: 'environmental_education', label: 'Environmental education', icon: '📚' },
  { value: 'rural_community_development', label: 'Rural/community development', icon: '🤝' },
  { value: 'other', label: 'Other', icon: '➕' },
];

export const SAPLINGS_PER_DRIVE_OPTIONS: SelectOption[] = [
  { value: 'under_50', label: 'Under 50' },
  { value: '50_200', label: '50 – 200' },
  { value: '200_500', label: '200 – 500' },
  { value: '500_plus', label: '500+' },
];

export const ARTH_USAGE_OPTIONS: SelectOption[] = [
  { value: 'organise_plantation_drives', label: 'Organise plantation drives', icon: '🌱' },
  { value: 'recruit_volunteers', label: 'Recruit volunteers', icon: '🙋' },
  { value: 'source_saplings', label: 'Source saplings', icon: '🪴' },
  { value: 'track_planted_trees', label: 'Track planted trees', icon: '📍' },
  { value: 'manage_corporate_school_programs', label: 'Manage corporate/school programs', icon: '🏫' },
  { value: 'receive_donations', label: 'Receive donations', icon: '💚' },
  { value: 'showcase_projects', label: 'Showcase projects', icon: '📣' },
  { value: 'other', label: 'Other', icon: '➕' },
];

export const PARTICIPANT_TYPE_OPTIONS: SelectOption[] = [
  { value: 'individuals', label: 'Individuals' },
  { value: 'schools', label: 'Schools' },
  { value: 'colleges', label: 'Colleges' },
  { value: 'corporates', label: 'Corporates' },
  { value: 'government', label: 'Government' },
  { value: 'communities', label: 'Communities' },
  { value: 'volunteers', label: 'Volunteers' },
  { value: 'other_ngos', label: 'Other NGOs' },
];
