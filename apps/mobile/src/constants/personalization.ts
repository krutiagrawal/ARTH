/** Answer choices for the "personalize your experience" questions — shared by the signup step and
 * by Edit Profile / the profile About card, so a value always reads the same everywhere. */
export interface PersonalizeOption {
  value: string;
  label: string;
  icon: string;
}

export const SPACE_OPTIONS: PersonalizeOption[] = [
  { value: 'balcony', label: 'Balcony', icon: '🪴' },
  { value: 'terrace', label: 'Terrace', icon: '🏠' },
  { value: 'garden', label: 'Garden', icon: '🌳' },
  { value: 'farmland', label: 'Farmland', icon: '🌾' },
  { value: 'city_outskirts', label: 'In and around the city', icon: '🏙️' },
  { value: 'open_land', label: 'Open land or hillsides', icon: '⛰️' },
  { value: 'none', label: "I don't have space yet", icon: '🤷' },
];

export const SUNLIGHT_OPTIONS: PersonalizeOption[] = [
  { value: 'full_sun', label: 'Full sun most of the day', icon: '☀️' },
  { value: 'partial_shade', label: 'Partial shade', icon: '⛅' },
  { value: 'shade', label: 'Mostly shaded', icon: '🌥️' },
];

export const EXPERIENCE_OPTIONS: PersonalizeOption[] = [
  { value: 'beginner', label: "I'm just starting out", icon: '🌱' },
  { value: 'intermediate', label: "I've grown a few plants", icon: '🌿' },
  { value: 'experienced', label: 'I know my way around a garden', icon: '🌳' },
];

export const MOTIVATION_OPTIONS: PersonalizeOption[] = [
  { value: 'home_gardening', label: 'Growing things at home', icon: '🏡' },
  { value: 'environmental_cause', label: 'The environmental cause', icon: '🌍' },
  { value: 'school_or_csr_project', label: 'A school or CSR project', icon: '🏫' },
  { value: 'hobby', label: "It's just a hobby", icon: '🎨' },
  { value: 'other', label: 'Something else', icon: '✨' },
];

export const SPECIES_OPTIONS: PersonalizeOption[] = [
  { value: 'fruit', label: 'Fruit trees', icon: '🍎' },
  { value: 'flowering', label: 'Flowering trees', icon: '🌸' },
  { value: 'shade', label: 'Shade trees', icon: '🌳' },
  { value: 'medicinal', label: 'Medicinal plants', icon: '🌿' },
  { value: 'native', label: 'Native species', icon: '🍃' },
];

/** Short labels for compact profile chips (the long form above is for the questions themselves). */
export const EXPERIENCE_TAG: Record<string, { icon: string; label: string }> = {
  beginner: { icon: '🌱', label: 'Beginner' },
  intermediate: { icon: '🌿', label: 'Intermediate' },
  experienced: { icon: '🌳', label: 'Experienced' },
};
