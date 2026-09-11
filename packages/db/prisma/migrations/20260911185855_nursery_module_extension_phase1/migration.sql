-- CreateEnum
CREATE TYPE "SunlightNeeds" AS ENUM ('full_sun', 'partial_shade', 'shade');

-- CreateEnum
CREATE TYPE "WaterNeeds" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "OrderFulfillmentType" AS ENUM ('pickup', 'delivery');

-- CreateEnum
CREATE TYPE "ArthSaplingUnitStatus" AS ENUM ('issued', 'collected', 'planted', 'void');

-- CreateEnum
CREATE TYPE "BulkRequirementStatus" AS ENUM ('open', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "BulkRequirementResponseStatus" AS ENUM ('proposed', 'accepted', 'declined', 'fulfilled', 'withdrawn');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'order_ready_for_pickup';
ALTER TYPE "NotificationType" ADD VALUE 'order_picked_up';
ALTER TYPE "NotificationType" ADD VALUE 'order_plantation_verified';
ALTER TYPE "NotificationType" ADD VALUE 'order_fulfillment_today';
ALTER TYPE "NotificationType" ADD VALUE 'stock_low';
ALTER TYPE "NotificationType" ADD VALUE 'stock_out_of_stock';
ALTER TYPE "NotificationType" ADD VALUE 'bulk_requirement_nearby';
ALTER TYPE "NotificationType" ADD VALUE 'bulk_requirement_response_received';
ALTER TYPE "NotificationType" ADD VALUE 'bulk_requirement_response_accepted';
ALTER TYPE "NotificationType" ADD VALUE 'sapling_planted';
ALTER TYPE "NotificationType" ADD VALUE 'nursery_tree_milestone';
ALTER TYPE "NotificationType" ADD VALUE 'nursery_impact_milestone';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NurseryAchievementCriteriaType" ADD VALUE 'native_species_listed';
ALTER TYPE "NurseryAchievementCriteriaType" ADD VALUE 'saplings_supplied_via_arth';
ALTER TYPE "NurseryAchievementCriteriaType" ADD VALUE 'ngo_requirements_fulfilled';
ALTER TYPE "NurseryAchievementCriteriaType" ADD VALUE 'ngo_repeat_partners';
ALTER TYPE "NurseryAchievementCriteriaType" ADD VALUE 'fulfilment_rate_pct';
ALTER TYPE "NurseryAchievementCriteriaType" ADD VALUE 'cancellation_free_order_streak';
ALTER TYPE "NurseryAchievementCriteriaType" ADD VALUE 'monsoon_saplings_supplied';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "OrderStatus" ADD VALUE 'ready_for_pickup';
ALTER TYPE "OrderStatus" ADD VALUE 'picked_up';
ALTER TYPE "OrderStatus" ADD VALUE 'plantation_verified';

-- DropForeignKey
ALTER TABLE "orders" DROP CONSTRAINT "orders_address_id_fkey";

-- AlterTable
ALTER TABLE "nursery_profiles" ADD COLUMN     "delivery_fee_cents" INTEGER,
ADD COLUMN     "min_delivery_order_cents" INTEGER,
ADD COLUMN     "offers_pickup" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "operating_hours" JSONB,
ADD COLUMN     "pickup_instructions" TEXT,
ADD COLUMN     "pickup_windows" JSONB;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "fulfillment_type" "OrderFulfillmentType" NOT NULL DEFAULT 'delivery',
ADD COLUMN     "handoff_code" TEXT,
ADD COLUMN     "picked_up_at" TIMESTAMP(3),
ADD COLUMN     "pickup_window_label" TEXT,
ADD COLUMN     "plantation_verified_at" TIMESTAMP(3),
ADD COLUMN     "ready_for_pickup_at" TIMESTAMP(3),
ADD COLUMN     "scheduled_for" TIMESTAMP(3),
ALTER COLUMN "address_id" DROP NOT NULL;

-- Data migration: copy the old delivery-only OTP into the new shared handoff_code column
-- before application code cuts over to reading/writing handoff_code exclusively. delivery_otp
-- itself is left in place (unused) for a later cleanup migration once this has baked in.
UPDATE "orders" SET "handoff_code" = "delivery_otp" WHERE "delivery_otp" IS NOT NULL;

-- AlterTable
ALTER TABLE "sapling_stock" ADD COLUMN     "age_label" TEXT,
ADD COLUMN     "height_label" TEXT,
ADD COLUMN     "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "nursery_notes" TEXT,
ADD COLUMN     "pot_size" TEXT,
ADD COLUMN     "scientific_name_snapshot" TEXT,
ADD COLUMN     "species_id" TEXT,
ADD COLUMN     "suitable_environments" TEXT[];

-- AlterTable
ALTER TABLE "tree_species" ADD COLUMN     "added_by_role" "UserRole",
ADD COLUMN     "is_curated_botanical" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_native" BOOLEAN,
ADD COLUMN     "local_name" TEXT,
ADD COLUMN     "mature_height_label" TEXT,
ADD COLUMN     "planting_seasons" TEXT[],
ADD COLUMN     "scientific_name" TEXT,
ADD COLUMN     "soil_needs" TEXT,
ADD COLUMN     "sunlight_needs" "SunlightNeeds",
ADD COLUMN     "water_needs" "WaterNeeds";

-- AlterTable
ALTER TABLE "trees" ADD COLUMN     "nursery_id" TEXT;

-- CreateTable
CREATE TABLE "arth_sapling_units" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "reservation_id" TEXT,
    "bulk_requirement_response_id" TEXT,
    "nursery_id" TEXT NOT NULL,
    "species_id" TEXT,
    "species_name_snapshot" TEXT NOT NULL,
    "age_at_supply_label" TEXT,
    "supply_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ArthSaplingUnitStatus" NOT NULL DEFAULT 'issued',
    "collected_at" TIMESTAMP(3),
    "tree_id" TEXT,

    CONSTRAINT "arth_sapling_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_requirements" (
    "id" TEXT NOT NULL,
    "ngo_id" TEXT NOT NULL,
    "drive_id" TEXT,
    "species_id" TEXT,
    "species_note" TEXT,
    "native_preferred" BOOLEAN NOT NULL DEFAULT false,
    "quantity_needed" INTEGER NOT NULL,
    "quantity_fulfilled" INTEGER NOT NULL DEFAULT 0,
    "needed_by_date" TIMESTAMP(3),
    "city" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "notes" TEXT,
    "status" "BulkRequirementStatus" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bulk_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_requirement_responses" (
    "id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "nursery_id" TEXT NOT NULL,
    "quantity_offered" INTEGER NOT NULL,
    "price_cents" INTEGER,
    "can_deliver" BOOLEAN NOT NULL DEFAULT false,
    "can_pickup" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "status" "BulkRequirementResponseStatus" NOT NULL DEFAULT 'proposed',
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_requirement_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "arth_sapling_units_tree_id_key" ON "arth_sapling_units"("tree_id");

-- CreateIndex
CREATE INDEX "arth_sapling_units_nursery_id_idx" ON "arth_sapling_units"("nursery_id");

-- CreateIndex
CREATE INDEX "arth_sapling_units_order_item_id_idx" ON "arth_sapling_units"("order_item_id");

-- CreateIndex
CREATE INDEX "arth_sapling_units_reservation_id_idx" ON "arth_sapling_units"("reservation_id");

-- CreateIndex
CREATE INDEX "arth_sapling_units_bulk_requirement_response_id_idx" ON "arth_sapling_units"("bulk_requirement_response_id");

-- CreateIndex
CREATE INDEX "bulk_requirements_ngo_id_status_idx" ON "bulk_requirements"("ngo_id", "status");

-- CreateIndex
CREATE INDEX "bulk_requirements_status_city_idx" ON "bulk_requirements"("status", "city");

-- CreateIndex
CREATE INDEX "bulk_requirements_lat_lng_idx" ON "bulk_requirements"("lat", "lng");

-- CreateIndex
CREATE INDEX "bulk_requirement_responses_requirement_id_status_idx" ON "bulk_requirement_responses"("requirement_id", "status");

-- CreateIndex
CREATE INDEX "bulk_requirement_responses_nursery_id_status_idx" ON "bulk_requirement_responses"("nursery_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bulk_requirement_responses_requirement_id_nursery_id_key" ON "bulk_requirement_responses"("requirement_id", "nursery_id");

-- CreateIndex
CREATE INDEX "sapling_stock_species_id_idx" ON "sapling_stock"("species_id");

-- CreateIndex
CREATE INDEX "trees_nursery_id_idx" ON "trees"("nursery_id");

-- AddForeignKey
ALTER TABLE "trees" ADD CONSTRAINT "trees_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sapling_stock" ADD CONSTRAINT "sapling_stock_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "tree_species"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arth_sapling_units" ADD CONSTRAINT "arth_sapling_units_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arth_sapling_units" ADD CONSTRAINT "arth_sapling_units_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "sapling_reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arth_sapling_units" ADD CONSTRAINT "arth_sapling_units_bulk_requirement_response_id_fkey" FOREIGN KEY ("bulk_requirement_response_id") REFERENCES "bulk_requirement_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arth_sapling_units" ADD CONSTRAINT "arth_sapling_units_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arth_sapling_units" ADD CONSTRAINT "arth_sapling_units_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "tree_species"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arth_sapling_units" ADD CONSTRAINT "arth_sapling_units_tree_id_fkey" FOREIGN KEY ("tree_id") REFERENCES "trees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_requirements" ADD CONSTRAINT "bulk_requirements_ngo_id_fkey" FOREIGN KEY ("ngo_id") REFERENCES "ngo_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_requirements" ADD CONSTRAINT "bulk_requirements_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_requirements" ADD CONSTRAINT "bulk_requirements_species_id_fkey" FOREIGN KEY ("species_id") REFERENCES "tree_species"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_requirement_responses" ADD CONSTRAINT "bulk_requirement_responses_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "bulk_requirements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_requirement_responses" ADD CONSTRAINT "bulk_requirement_responses_nursery_id_fkey" FOREIGN KEY ("nursery_id") REFERENCES "nursery_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
