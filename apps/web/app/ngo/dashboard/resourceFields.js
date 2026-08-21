// Shared field configs for the Adoptable Trees / Campaigns create-edit
// drawers — same shape ResourceFormSheet expects
// (name/label/type/required/apiName/toApi/fromApi/section). Drives now use
// the bespoke DriveFormSheet instead (conditional sections + dynamic lists
// don't fit this flat field-config shape).

export const treeFields = [
  { name: 'nickname', label: 'Tree nickname', required: true, section: 'Identity' },
  { name: 'speciesName', label: 'Species', required: true, section: 'Identity' },
  { name: 'description', label: 'Description', type: 'textarea', required: true, section: 'Identity' },
  {
    name: 'instructions',
    label: 'Instructions for adopters',
    type: 'textarea',
    placeholder: 'What adopting this tree involves, visiting notes, etc.',
    section: 'Identity',
  },
  { name: 'locationLabel', label: 'Location', placeholder: 'Area / landmark', section: 'Location' },
  { name: 'city', label: 'City', required: true, section: 'Location' },
]

export const campaignFields = [
  { name: 'title', label: 'Title', required: true, section: 'Details' },
  { name: 'description', label: 'Description', type: 'textarea', required: true, section: 'Details' },
  {
    name: 'goalAmount',
    label: 'Goal amount',
    placeholder: '₹ amount (optional)',
    type: 'number',
    apiName: 'goalAmountCents',
    section: 'Details',
    toApi: (v) => Math.round(Number(v) * 100),
    fromApi: (v) => (v != null ? v / 100 : ''),
  },
]

export const staffFields = [
  { name: 'name', label: 'Name', required: true, section: 'Details' },
  { name: 'role', label: 'Role / title', required: true, section: 'Details' },
  { name: 'contactEmail', label: 'Email (optional)', section: 'Contact' },
  { name: 'contactPhone', label: 'Phone (optional)', section: 'Contact' },
]

export const updateFields = [
  { name: 'caption', label: 'Caption', type: 'textarea', section: 'Details' },
]
