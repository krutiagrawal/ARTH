-- CreateEnum
CREATE TYPE "TreeObserverRole" AS ENUM ('owner', 'ngo', 'community');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'tree_observation_logged';
ALTER TYPE "NotificationType" ADD VALUE 'tree_health_check_reminder';
ALTER TYPE "NotificationType" ADD VALUE 'community_observation_nearby';
ALTER TYPE "NotificationType" ADD VALUE 'tree_marked_dead';

-- AlterTable
ALTER TABLE "adoptable_trees" ADD COLUMN     "planted_tree_id" TEXT;

-- AlterTable
ALTER TABLE "arth_sapling_units" ADD COLUMN     "planted_tree_id" TEXT;

-- AlterTable
-- public_id is intentionally nullable here — it is backfilled by
-- packages/db/prisma/scripts/backfillPublicIds.ts, then a follow-up migration
-- (20261005150100_tree_identity_backfill_constraints) adds NOT NULL + the unique index.
-- Postgres cannot add a UNIQUE NOT NULL column with per-row-unique values in a single step
-- against a table that already has rows.
ALTER TABLE "planted_trees" ADD COLUMN     "public_id" TEXT;

-- AlterTable
ALTER TABLE "trees" ADD COLUMN     "health_status" "TreeHealthStatus" NOT NULL DEFAULT 'not_checked',
ADD COLUMN     "public_id" TEXT;

-- CreateTable
CREATE TABLE "tree_observations" (
    "id" TEXT NOT NULL,
    "tree_id" TEXT,
    "planted_tree_id" TEXT,
    "observer_user_id" TEXT NOT NULL,
    "observer_role" "TreeObserverRole" NOT NULL,
    "status" "TreeHealthStatus" NOT NULL,
    "note" TEXT,
    "photo_url" TEXT,
    "gps_lat" DECIMAL(9,6),
    "gps_lng" DECIMAL(9,6),
    "gps_accuracy_m" DECIMAL(6,2),
    "distance_to_tree_m" DECIMAL(6,2),
    "confidence" DECIMAL(4,3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tree_observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tree_observations_tree_id_created_at_idx" ON "tree_observations"("tree_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tree_observations_planted_tree_id_created_at_idx" ON "tree_observations"("planted_tree_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tree_observations_observer_user_id_idx" ON "tree_observations"("observer_user_id");

-- CreateIndex
CREATE INDEX "adoptable_trees_planted_tree_id_idx" ON "adoptable_trees"("planted_tree_id");

-- CreateIndex
-- Safe to create immediately even pre-backfill: planted_tree_id is a brand-new nullable
-- column with no existing data, and Postgres unique indexes permit multiple NULLs.
CREATE UNIQUE INDEX "arth_sapling_units_planted_tree_id_key" ON "arth_sapling_units"("planted_tree_id");

-- CreateIndex
CREATE INDEX "arth_sapling_units_planted_tree_id_idx" ON "arth_sapling_units"("planted_tree_id");

-- AddForeignKey
ALTER TABLE "arth_sapling_units" ADD CONSTRAINT "arth_sapling_units_planted_tree_id_fkey" FOREIGN KEY ("planted_tree_id") REFERENCES "planted_trees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adoptable_trees" ADD CONSTRAINT "adoptable_trees_planted_tree_id_fkey" FOREIGN KEY ("planted_tree_id") REFERENCES "planted_trees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_observations" ADD CONSTRAINT "tree_observations_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_observations" ADD CONSTRAINT "tree_observations_planted_tree_id_fkey" FOREIGN KEY ("planted_tree_id") REFERENCES "planted_trees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tree_observations" ADD CONSTRAINT "tree_observations_observer_user_id_fkey" FOREIGN KEY ("observer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
