-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.
ALTER TYPE "GameKey" ADD VALUE 'species_scramble';
ALTER TYPE "GameKey" ADD VALUE 'eco_connections';
ALTER TYPE "GameKey" ADD VALUE 'missing_letters';
ALTER TYPE "GameKey" ADD VALUE 'seed_memory';
ALTER TYPE "GameKey" ADD VALUE 'waste_sort';
ALTER TYPE "GameKey" ADD VALUE 'true_or_myth';
ALTER TYPE "GameKey" ADD VALUE 'shadow_tree';
ALTER TYPE "GameKey" ADD VALUE 'spot_difference';
ALTER TYPE "GameKey" ADD VALUE 'co2_duel';
ALTER TYPE "GameKey" ADD VALUE 'plant_grid';
