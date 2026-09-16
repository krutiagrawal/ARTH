// Shared nursery-profile enum options/labels, mirroring apps/mobile/src/constants/nursery.ts so
// the same value <-> label mapping never drifts between mobile signup, web settings, and the
// public nursery-detail page. `approxPlantCount` and `responsiblePersonRole` are stored on the
// backend as free-text *labels* (not keys) — see NurseryRegisterScreen.tsx's submit payload — so
// their option lists below are label-only, unlike the key/label pairs used for enum fields.

export const NURSERY_TYPE_OPTIONS = [
  { value: 'retail', label: 'Retail nursery' },
  { value: 'wholesale', label: 'Wholesale nursery' },
  { value: 'native_plant', label: 'Native plant nursery' },
  { value: 'government', label: 'Government nursery' },
  { value: 'ngo_community', label: 'NGO / community nursery' },
  { value: 'landscaping', label: 'Landscaping nursery' },
  { value: 'other', label: 'Other' },
]

export const NURSERY_TYPE_LABELS = Object.fromEntries(NURSERY_TYPE_OPTIONS.map((o) => [o.value, o.label]))

export const PLANT_CATEGORY_OPTIONS = [
  { value: 'native', label: 'Native species' },
  { value: 'fruit', label: 'Fruit trees' },
  { value: 'ornamental', label: 'Ornamental plants' },
  { value: 'medicinal', label: 'Medicinal plants' },
  { value: 'large_trees', label: 'Large trees / saplings' },
]

export const PLANT_CATEGORY_LABELS = Object.fromEntries(PLANT_CATEGORY_OPTIONS.map((o) => [o.value, o.label]))

// approxPlantCount is stored as this exact label string (not a key).
export const PLANT_COUNT_LABELS = ['Under 50', '50 – 200', '200 – 500', '500+']

// responsiblePersonRole is stored as a free-text label; these three are quick presets, anything
// else (including "Other") falls back to a free-text field.
export const RESPONSIBLE_ROLE_PRESETS = ['Owner', 'Manager', 'Staff']
