// Declarative field configs for ResourceFormSheet — see app/ngo/dashboard/resourceFields.js for
// the shape (name/label/type/required/section). Delivery partners need two different shapes
// depending on create vs edit: creating one spins up a real login (handle/email/password), while
// editing only ever touches their name/phone — same split as the mobile app's
// NurseryDeliveryPartnersScreen, which keeps a separate edit form for the same reason (running
// the create form's phone/email "already taken" checks against a partner's own current values
// would always false-flag them).

export const deliveryPartnerCreateFields = [
  { name: 'name', label: 'Name', required: true, section: 'Details' },
  { name: 'handle', label: 'Handle', required: true, section: 'Details', placeholder: 'ravi_delivers' },
  { name: 'email', label: 'Email', type: 'email', required: true, section: 'Login' },
  { name: 'phone', label: 'Phone', type: 'phone', required: true, section: 'Login' },
  { name: 'password', label: 'Temporary password', type: 'password', required: true, section: 'Login', placeholder: 'At least 8 characters' },
]

export const deliveryPartnerEditFields = [
  { name: 'name', label: 'Name', required: true, section: 'Details' },
  { name: 'phone', label: 'Phone', type: 'phone', required: true, section: 'Details' },
]
