import type { AdminCatalogModel } from '../api/admin';

// Mirrors apps/web/lib/adminCatalogModels.js — field config for the six
// catalog models exposed at /api/admin/catalog/:model.
export interface CatalogField {
  name: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

export interface CatalogModelConfig {
  label: string;
  hasKey: boolean;
  deactivatable: boolean;
  fields: CatalogField[];
}

export const ADMIN_CATALOG_MODELS: Record<AdminCatalogModel, CatalogModelConfig> = {
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
};

export function coerceCatalogValue(field: CatalogField, raw: unknown) {
  if (field.type === 'checkbox') return Boolean(raw);
  if (raw === undefined || raw === null || raw === '') return field.required ? raw : null;
  if (field.type === 'number') return Number(raw);
  if (field.type === 'date') return new Date(String(raw)).toISOString();
  return raw;
}
