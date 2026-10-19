export type NgoProfileSectionId =
  | 'basic'
  | 'organisation'
  | 'people'
  | 'legal'
  | 'awards'
  | 'work'
  | 'plantation'
  | 'links'
  | 'arth';

export interface NgoProfileSectionMeta {
  emoji: string;
  title: string;
  subtitle: string;
}

// The NGO profile is split into these screens (NgoProfileSectionScreen), listed as rows on NgoSettingsScreen.
export const NGO_PROFILE_SECTIONS: Record<NgoProfileSectionId, NgoProfileSectionMeta> = {
  basic: { emoji: '🏢', title: 'Basic details', subtitle: 'Name, about and contact' },
  organisation: { emoji: '📍', title: 'Organisation & address', subtitle: 'Type, address, where you operate' },
  people: { emoji: '👥', title: 'People', subtitle: 'Primary contact and office bearers' },
  legal: { emoji: '📄', title: 'Registration & legal', subtitle: 'PAN and registration numbers' },
  awards: { emoji: '🏆', title: 'Awards & recognition', subtitle: 'Honours your organisation has received' },
  work: { emoji: '🌍', title: 'What you do', subtitle: 'Areas of work and track record' },
  plantation: { emoji: '🌱', title: 'Plantation work', subtitle: 'How you run your drives' },
  links: { emoji: '🔗', title: 'Supporting links', subtitle: 'Reports, media and project pages' },
  arth: { emoji: '🎯', title: 'Using ARTH', subtitle: 'Goals and who takes part' },
};
