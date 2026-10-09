// Field config for the seven catalog models exposed at services/api's
// /api/admin/catalog/:model (see services/api/src/services/adminCatalog.service.ts).
// Mirrors the shape of ADMIN_CONTENT_MODELS in adminContent.js, extended with
// 'select' and 'checkbox' field types since these models have real enums/booleans.
export const ADMIN_CATALOG_MODELS = {
  species: {
    label: 'Tree species',
    hasKey: true,
    deactivatable: true,
    fields: [
      { name: 'commonName', type: 'text', required: true },
      { name: 'emoji', type: 'text', required: true },
      { name: 'co2KgPerYear', type: 'number', required: false },
      { name: 'sortOrder', type: 'number', required: false },
      { name: 'description', type: 'textarea', required: false },
    ],
  },
  achievements: {
    label: 'Achievements',
    hasKey: true,
    deactivatable: false,
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'icon', type: 'text', required: true },
      { name: 'rarity', type: 'select', required: true, options: ['common', 'rare', 'epic', 'legendary'] },
      {
        name: 'criteriaType',
        type: 'select',
        required: true,
        options: ['trees_planted', 'streak_days', 'co2_absorbed', 'species_diversity', 'friends_count', 'forest_level', 'seasonal_diversity'],
      },
      { name: 'criteriaTarget', type: 'number', required: false },
      { name: 'sortOrder', type: 'number', required: false },
      { name: 'description', type: 'textarea', required: true },
    ],
  },
  challenges: {
    label: 'Challenges',
    hasKey: false,
    deactivatable: true,
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'icon', type: 'text', required: true },
      { name: 'xpReward', type: 'number', required: true },
      { name: 'goalTotal', type: 'number', required: true },
      { name: 'goalType', type: 'select', required: true, options: ['trees_planted_count', 'cities_count', 'streak_days', 'rare_species_count'] },
      { name: 'startsAt', type: 'date', required: true },
      { name: 'endsAt', type: 'date', required: true },
      { name: 'description', type: 'textarea', required: true },
    ],
  },
  missions: {
    label: 'Daily missions',
    hasKey: true,
    deactivatable: true,
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'icon', type: 'text', required: true },
      { name: 'xpReward', type: 'number', required: true },
      { name: 'type', type: 'select', required: true, options: ['plant', 'share', 'learn', 'community'] },
      { name: 'description', type: 'textarea', required: true },
    ],
  },
  themes: {
    label: 'Forest themes',
    hasKey: true,
    deactivatable: true,
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'previewEmoji', type: 'text', required: true },
      { name: 'isDefaultUnlocked', type: 'checkbox', required: false },
      { name: 'sortOrder', type: 'number', required: false },
      { name: 'unlockCriteria', type: 'textarea', required: false },
    ],
  },
  lessons: {
    label: 'Daily lessons',
    hasKey: true,
    deactivatable: true,
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'emoji', type: 'text', required: true },
      { name: 'tag', type: 'select', required: true, options: ['Waste', 'Water', 'Energy', 'Food', 'Air', 'Climate', 'Community', 'Lifestyle', 'Nature', 'Travel'] },
      { name: 'summary', type: 'textarea', required: true },
      { name: 'readMinutes', type: 'number', required: false },
      { name: 'takeaway', type: 'textarea', required: false },
      // JSON, optional: {"url": "https://...", "alt": "...", "caption": "...", "credit": "Photographer / CC BY-SA 4.0 / Wikimedia Commons"}
      { name: 'heroImage', type: 'json', required: false },
      // JSON: [{"heading": "...", "body": "...", "image": {same shape as heroImage, optional}}, ...] (2-12 sections).
      // body is light markdown: blank line between paragraphs, "- " bullets, "> " pull quotes, **bold**.
      { name: 'sections', type: 'json', required: true },
      // JSON: exactly 5 of {"q": "...", "options": [4 strings], "answer": 0-3, "explanation": "..."}
      { name: 'quiz', type: 'json', required: true },
      { name: 'sourceNote', type: 'text', required: false },
      { name: 'publishOn', type: 'date', required: false },
      { name: 'sortOrder', type: 'number', required: false },
    ],
  },
  decorations: {
    label: 'Decorations',
    hasKey: true,
    deactivatable: false,
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'zone', type: 'select', required: true, options: ['canopy', 'understory', 'forest_floor', 'water', 'meadow', 'sky', 'birds', 'animals', 'fruits'] },
      { name: 'colorway', type: 'text', required: true },
      { name: 'variant', type: 'text', required: true },
      { name: 'sortOrder', type: 'number', required: false },
    ],
  },
}

export function coerceCatalogValue(field, raw) {
  if (field.type === 'checkbox') return Boolean(raw)
  if (raw === undefined || raw === null || raw === '') return field.required ? raw : null
  if (field.type === 'json') {
    if (typeof raw !== 'string') return raw
    try {
      return JSON.parse(raw)
    } catch {
      throw new Error(`${field.name} is not valid JSON`)
    }
  }
  if (field.type === 'number') return Number(raw)
  if (field.type === 'date') return new Date(raw).toISOString()
  return raw
}
