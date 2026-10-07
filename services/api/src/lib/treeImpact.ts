/**
 * Estimated carbon and oxygen impact of a planted tree, from its species and age.
 *
 * Why this exists: the old figure was a flat "species annual rate / 12", credited in full on the
 * day of planting and never updated, with an invented 1 kg fallback for unknown species. A sapling
 * stores almost nothing in its first months and a mature tree stores far more per year, so that
 * number was both too high at planting and frozen forever after. This model grows with the tree.
 *
 * Method (standard forest-carbon accounting, all steps visible below):
 *   1. Height and trunk diameter are estimated from age with a saturating growth curve per species
 *      (see SPECIES_PARAMS). Height has a nursery-sapling starting point (H0) and approaches the
 *      species' typical mature height; diameter follows height.
 *   2. Above-ground biomass comes from the Chave et al. (2014) pantropical allometric equation:
 *        AGB[kg] = 0.0673 * (wood_density[g/cm3] * DBH[cm]^2 * height[m]) ^ 0.976
 *   3. Roots add 26% (IPCC root:shoot default for tropical forests).
 *   4. Dry biomass is 47% carbon (IPCC default).
 *   5. CO2 = carbon * 44/12 (molar masses of CO2 and C).
 *   6. Oxygen released = CO2 fixed * 32/44: photosynthesis releases one O2 molecule per CO2 fixed.
 *      This is the oxygen from the carbon the tree has locked into its own wood, not a
 *      "people supplied per day" claim.
 *
 * Limits, which the UI must not hide: this is an ESTIMATE from species and age alone, not a
 * measurement of the actual tree. Real growth depends on soil, water, climate and care. Palms,
 * bamboo and shrubs do not follow the tree equation well, so they are flagged low confidence, as
 * is any species not in the table below. The species parameters are typical published ranges
 * rounded to a single value and should be reviewed by a forestry/agronomy expert before the
 * numbers are used in external reporting.
 */

export type ImpactConfidence = 'medium' | 'low';

export interface SpeciesGrowthParams {
  /** 'tree' follows the allometric equation reasonably; the rest are approximations. */
  form: 'tree' | 'palm' | 'bamboo' | 'shrub';
  /** Typical mature height in cultivation, metres. */
  maxHeightM: number;
  /** Typical mature trunk diameter at breast height, cm. */
  maxDbhCm: number;
  /** Years for height to reach half of the way from sapling to mature (smaller = faster grower). */
  halfGrowthYears: number;
  /** Oven-dry wood density, g/cm3. */
  woodDensity: number;
}

const SAPLING_HEIGHT_M = 0.5;
const SAPLING_DBH_CM = 0.5;
const ROOT_TO_SHOOT = 0.26;
const CARBON_FRACTION = 0.47;
const CO2_PER_C = 44 / 12;
const O2_PER_CO2 = 32 / 44;
const DAYS_PER_YEAR = 365.25;

/** Used when a species isn't in the table (e.g. a nursery-added custom species). */
export const GENERIC_PARAMS: SpeciesGrowthParams = {
  form: 'tree',
  maxHeightM: 15,
  maxDbhCm: 40,
  halfGrowthYears: 12,
  woodDensity: 0.55,
};

// Keyed by TreeSpecies.key (see packages/db/prisma/seed.ts).
export const SPECIES_PARAMS: Record<string, SpeciesGrowthParams> = {
  mangrove: { form: 'tree', maxHeightM: 12, maxDbhCm: 25, halfGrowthYears: 12, woodDensity: 0.75 },
  teak: { form: 'tree', maxHeightM: 30, maxDbhCm: 60, halfGrowthYears: 12, woodDensity: 0.6 },
  bamboo: { form: 'bamboo', maxHeightM: 15, maxDbhCm: 8, halfGrowthYears: 3, woodDensity: 0.6 },
  khejri: { form: 'tree', maxHeightM: 10, maxDbhCm: 30, halfGrowthYears: 15, woodDensity: 0.8 },
  sandalwood: { form: 'tree', maxHeightM: 10, maxDbhCm: 25, halfGrowthYears: 15, woodDensity: 0.9 },
  pine: { form: 'tree', maxHeightM: 30, maxDbhCm: 60, halfGrowthYears: 15, woodDensity: 0.5 },
  blue_gum: { form: 'tree', maxHeightM: 35, maxDbhCm: 60, halfGrowthYears: 7, woodDensity: 0.65 },
  oak: { form: 'tree', maxHeightM: 25, maxDbhCm: 80, halfGrowthYears: 25, woodDensity: 0.65 },
  cherry_blossom: { form: 'tree', maxHeightM: 9, maxDbhCm: 30, halfGrowthYears: 10, woodDensity: 0.5 },
  maple: { form: 'tree', maxHeightM: 20, maxDbhCm: 50, halfGrowthYears: 15, woodDensity: 0.55 },
  palm: { form: 'palm', maxHeightM: 15, maxDbhCm: 25, halfGrowthYears: 10, woodDensity: 0.4 },
  willow: { form: 'tree', maxHeightM: 15, maxDbhCm: 50, halfGrowthYears: 8, woodDensity: 0.4 },
  orange_tree: { form: 'tree', maxHeightM: 6, maxDbhCm: 20, halfGrowthYears: 7, woodDensity: 0.65 },
  neem: { form: 'tree', maxHeightM: 18, maxDbhCm: 50, halfGrowthYears: 10, woodDensity: 0.68 },
  banyan: { form: 'tree', maxHeightM: 25, maxDbhCm: 100, halfGrowthYears: 20, woodDensity: 0.45 },
  peepal: { form: 'tree', maxHeightM: 25, maxDbhCm: 100, halfGrowthYears: 18, woodDensity: 0.45 },
  gulmohar: { form: 'tree', maxHeightM: 12, maxDbhCm: 50, halfGrowthYears: 8, woodDensity: 0.5 },
  amla: { form: 'tree', maxHeightM: 8, maxDbhCm: 25, halfGrowthYears: 8, woodDensity: 0.65 },
  ashoka: { form: 'tree', maxHeightM: 9, maxDbhCm: 25, halfGrowthYears: 10, woodDensity: 0.55 },
  jamun: { form: 'tree', maxHeightM: 25, maxDbhCm: 70, halfGrowthYears: 12, woodDensity: 0.65 },
  mango: { form: 'tree', maxHeightM: 20, maxDbhCm: 80, halfGrowthYears: 12, woodDensity: 0.55 },
  guava: { form: 'tree', maxHeightM: 6, maxDbhCm: 20, halfGrowthYears: 5, woodDensity: 0.65 },
  moringa: { form: 'tree', maxHeightM: 9, maxDbhCm: 25, halfGrowthYears: 4, woodDensity: 0.3 },
  karanj: { form: 'tree', maxHeightM: 18, maxDbhCm: 60, halfGrowthYears: 9, woodDensity: 0.65 },
  arjuna: { form: 'tree', maxHeightM: 25, maxDbhCm: 80, halfGrowthYears: 14, woodDensity: 0.72 },
  jacaranda: { form: 'tree', maxHeightM: 15, maxDbhCm: 50, halfGrowthYears: 9, woodDensity: 0.5 },
  champa: { form: 'shrub', maxHeightM: 6, maxDbhCm: 20, halfGrowthYears: 7, woodDensity: 0.4 },
  curry_leaf: { form: 'shrub', maxHeightM: 5, maxDbhCm: 12, halfGrowthYears: 5, woodDensity: 0.6 },
  coconut: { form: 'palm', maxHeightM: 22, maxDbhCm: 30, halfGrowthYears: 12, woodDensity: 0.4 },
  bougainvillea: { form: 'shrub', maxHeightM: 4, maxDbhCm: 6, halfGrowthYears: 4, woodDensity: 0.5 },
  silver_oak: { form: 'tree', maxHeightM: 30, maxDbhCm: 60, halfGrowthYears: 10, woodDensity: 0.55 },
  rain_tree: { form: 'tree', maxHeightM: 25, maxDbhCm: 100, halfGrowthYears: 12, woodDensity: 0.5 },
  kadamba: { form: 'tree', maxHeightM: 25, maxDbhCm: 60, halfGrowthYears: 8, woodDensity: 0.45 },
  subabul: { form: 'tree', maxHeightM: 15, maxDbhCm: 25, halfGrowthYears: 4, woodDensity: 0.5 },
};

/** Free-text species names (NGO PlantedTree.speciesName) -> table key, via the catalog's common names. */
export function normalizeSpeciesName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

const COMMON_NAME_TO_KEY: Record<string, string> = {
  mangrove: 'mangrove',
  teak: 'teak',
  bamboo: 'bamboo',
  khejri: 'khejri',
  sandalwood: 'sandalwood',
  pine: 'pine',
  'blue gum': 'blue_gum',
  oak: 'oak',
  'cherry blossom': 'cherry_blossom',
  maple: 'maple',
  palm: 'palm',
  willow: 'willow',
  'orange tree': 'orange_tree',
  neem: 'neem',
  banyan: 'banyan',
  peepal: 'peepal',
  gulmohar: 'gulmohar',
  amla: 'amla',
  'ashoka tree': 'ashoka',
  ashoka: 'ashoka',
  jamun: 'jamun',
  'mango tree': 'mango',
  mango: 'mango',
  guava: 'guava',
  'moringa (drumstick)': 'moringa',
  moringa: 'moringa',
  drumstick: 'moringa',
  'karanj (pongamia)': 'karanj',
  karanj: 'karanj',
  pongamia: 'karanj',
  arjuna: 'arjuna',
  jacaranda: 'jacaranda',
  'champa (plumeria)': 'champa',
  champa: 'champa',
  'curry leaf': 'curry_leaf',
  'coconut palm': 'coconut',
  coconut: 'coconut',
  bougainvillea: 'bougainvillea',
  'silver oak': 'silver_oak',
  'rain tree': 'rain_tree',
  kadamba: 'kadamba',
  subabul: 'subabul',
};

export function lookupSpeciesParams(ref: { key?: string | null; name?: string | null }): {
  params: SpeciesGrowthParams;
  known: boolean;
} {
  const byKey = ref.key ? SPECIES_PARAMS[ref.key] : undefined;
  if (byKey) return { params: byKey, known: true };
  const mappedKey = ref.name ? COMMON_NAME_TO_KEY[normalizeSpeciesName(ref.name)] : undefined;
  if (mappedKey) return { params: SPECIES_PARAMS[mappedKey], known: true };
  return { params: GENERIC_PARAMS, known: false };
}

export interface TreeImpactEstimate {
  ageYears: number;
  estimatedHeightM: number;
  estimatedDbhCm: number;
  /** Carbon dioxide locked into the tree so far, kg. */
  co2Kg: number;
  /** CO2 the tree is on course to add over the next 12 months, kg. */
  co2NextYearKg: number;
  /** Oxygen released by the photosynthesis behind co2Kg, kg. */
  oxygenKg: number;
  confidence: ImpactConfidence;
}

function growthAt(params: SpeciesGrowthParams, ageYears: number) {
  const k = Math.LN2 / params.halfGrowthYears;
  const progress = 1 - Math.exp(-k * ageYears); // 0 at planting, -> 1 at maturity
  const height = SAPLING_HEIGHT_M + (Math.max(params.maxHeightM, SAPLING_HEIGHT_M) - SAPLING_HEIGHT_M) * progress;
  // Diameter lags height: slender while young, thickening as the tree matures.
  const dbh = SAPLING_DBH_CM + (Math.max(params.maxDbhCm, SAPLING_DBH_CM) - SAPLING_DBH_CM) * Math.pow(progress, 2);
  return { height, dbh };
}

function co2StoredKg(params: SpeciesGrowthParams, ageYears: number): number {
  const { height, dbh } = growthAt(params, ageYears);
  const agb = 0.0673 * Math.pow(params.woodDensity * dbh * dbh * height, 0.976);
  const totalBiomass = agb * (1 + ROOT_TO_SHOOT);
  return totalBiomass * CARBON_FRACTION * CO2_PER_C;
}

export function estimateTreeImpact(
  ref: { key?: string | null; name?: string | null },
  plantedAt: Date,
  now: Date = new Date(),
): TreeImpactEstimate {
  const { params, known } = lookupSpeciesParams(ref);
  const ageYears = Math.max(0, (now.getTime() - plantedAt.getTime()) / (DAYS_PER_YEAR * 86_400_000));
  const { height, dbh } = growthAt(params, ageYears);
  const co2Kg = co2StoredKg(params, ageYears);
  return {
    ageYears,
    estimatedHeightM: height,
    estimatedDbhCm: dbh,
    co2Kg,
    co2NextYearKg: co2StoredKg(params, ageYears + 1) - co2Kg,
    oxygenKg: co2Kg * O2_PER_CO2,
    // Only a known species with a tree-form growth habit is "medium"; the rest are rougher guesses.
    confidence: known && params.form === 'tree' ? 'medium' : 'low',
  };
}

/** Trees that are dead or removed no longer hold their carbon productively, so they add nothing to impact totals. */
export function countsTowardImpact(healthStatus: string | null | undefined): boolean {
  return healthStatus !== 'dead' && healthStatus !== 'removed';
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Impact figures for one tree, estimated from its species and age (lib/treeImpact.ts). Trees that
 * didn't pass photo verification, or are dead/removed, contribute nothing.
 */
export function treeImpactFields(tree: { plantedAt: Date; healthStatus: string; aiVerificationStatus: string; species?: { key?: string | null; commonName?: string | null } | null }) {
  const counts = tree.aiVerificationStatus === 'verified' && countsTowardImpact(tree.healthStatus);
  const e = estimateTreeImpact({ key: tree.species?.key, name: tree.species?.commonName }, tree.plantedAt);
  return {
    co2Absorbed: counts ? round1(e.co2Kg) : 0,
    oxygenKg: counts ? round1(e.oxygenKg) : 0,
    co2NextYearKg: counts ? round1(e.co2NextYearKg) : 0,
    estimatedHeightM: round1(e.estimatedHeightM),
    estimatedDbhCm: round1(e.estimatedDbhCm),
    ageDays: Math.floor(e.ageYears * 365.25),
    impactConfidence: e.confidence,
  };
}
