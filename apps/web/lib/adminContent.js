// Whitelisted content models editable from /admin/content. Each entry maps a
// URL-safe key to its Prisma delegate name, id shape (manual string ids need
// one typed on create; autoincrement ids are never sent), and form fields.
// Field `type` drives both the admin form input and light server-side coercion.
export const ADMIN_CONTENT_MODELS = {
  forests: {
    delegate: 'forest',
    label: 'Forests',
    idKind: 'string',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'location', type: 'text', required: true },
      { name: 'trees', type: 'number', required: true },
      { name: 'volunteers', type: 'number', required: true },
      { name: 'species', type: 'number', required: true },
      { name: 'established', type: 'text', required: true },
      { name: 'imageUrl', type: 'text', required: true },
      { name: 'story', type: 'textarea', required: true },
    ],
  },
  blogs: {
    delegate: 'blog',
    label: 'Journal',
    idKind: 'string',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'category', type: 'text', required: true },
      { name: 'author', type: 'text', required: true },
      { name: 'date', type: 'text', required: true },
      { name: 'minutes', type: 'number', required: true },
      { name: 'imageUrl', type: 'text', required: true },
      { name: 'excerpt', type: 'textarea', required: true },
    ],
  },
  competitions: {
    delegate: 'competition',
    label: 'Competitions',
    idKind: 'string',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'tagline', type: 'text', required: true },
      { name: 'deadline', type: 'date', required: true },
      { name: 'entries', type: 'number', required: true },
      { name: 'imageUrl', type: 'text', required: true },
    ],
  },
  partners: {
    delegate: 'partner',
    label: 'Partners',
    idKind: 'autoincrement',
    fields: [
      { name: 'group', type: 'text', required: true },
      { name: 'name', type: 'text', required: true },
      { name: 'logoUrl', type: 'text', required: false },
    ],
  },
  ecosystemEntries: {
    delegate: 'ecosystemEntry',
    label: 'Ecosystem entries',
    idKind: 'string',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'description', type: 'text', required: true },
      { name: 'long', type: 'textarea', required: true },
    ],
  },
  stats: {
    delegate: 'stat',
    label: 'Stats',
    idKind: 'autoincrement',
    fields: [
      { name: 'label', type: 'text', required: true },
      { name: 'value', type: 'number', required: true },
      { name: 'suffix', type: 'text', required: false },
    ],
  },
  timelineEntries: {
    delegate: 'timelineEntry',
    label: 'Timeline',
    idKind: 'autoincrement',
    fields: [
      { name: 'year', type: 'text', required: true },
      { name: 'title', type: 'text', required: true },
      { name: 'text', type: 'textarea', required: true },
    ],
  },
  mapPoints: {
    delegate: 'mapPoint',
    label: 'Map points',
    idKind: 'autoincrement',
    fields: [
      { name: 'x', type: 'number', required: true },
      { name: 'y', type: 'number', required: true },
      { name: 'label', type: 'text', required: true },
    ],
  },
}

export function coerceFieldValue(field, raw) {
  if (raw === undefined || raw === null || raw === '') return field.required ? raw : null
  if (field.type === 'number') return Number(raw)
  if (field.type === 'date') return new Date(raw)
  return raw
}
