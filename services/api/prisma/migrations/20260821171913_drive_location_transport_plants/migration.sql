-- CreateEnum
CREATE TYPE "DriveTransportMode" AS ENUM ('self_arrange', 'ngo_provided');

-- AlterTable "drives": address/city/instructions text fields, transport mode,
-- lat/lng now optional (auto-geocoded server-side instead of NGO-entered).
ALTER TABLE "drives"
  ADD COLUMN "address" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "instructions" TEXT,
  ADD COLUMN "transport_mode" "DriveTransportMode" NOT NULL DEFAULT 'self_arrange',
  ALTER COLUMN "lat" DROP NOT NULL,
  ALTER COLUMN "lng" DROP NOT NULL,
  DROP COLUMN "location_label";

-- AlterTable "adoptable_trees": city/instructions text fields, lat/lng now optional.
ALTER TABLE "adoptable_trees"
  ADD COLUMN "city" TEXT,
  ADD COLUMN "instructions" TEXT,
  ALTER COLUMN "lat" DROP NOT NULL,
  ALTER COLUMN "lng" DROP NOT NULL;

-- CreateTable
CREATE TABLE "drive_pickup_points" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "arrival_by" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "drive_pickup_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_plants" (
    "id" TEXT NOT NULL,
    "drive_id" TEXT NOT NULL,
    "species_name" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "drive_plants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_plant_sponsorships" (
    "id" TEXT NOT NULL,
    "drive_plant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'inr',
    "stripe_payment_intent_id" TEXT NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drive_plant_sponsorships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "drive_pickup_points_drive_id_idx" ON "drive_pickup_points"("drive_id");

-- CreateIndex
CREATE INDEX "drive_plants_drive_id_idx" ON "drive_plants"("drive_id");

-- CreateIndex
CREATE UNIQUE INDEX "drive_plant_sponsorships_stripe_payment_intent_id_key" ON "drive_plant_sponsorships"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "drive_plant_sponsorships_drive_plant_id_idx" ON "drive_plant_sponsorships"("drive_plant_id");

-- CreateIndex
CREATE INDEX "drive_plant_sponsorships_user_id_idx" ON "drive_plant_sponsorships"("user_id");

-- AddForeignKey
ALTER TABLE "drive_pickup_points" ADD CONSTRAINT "drive_pickup_points_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_plants" ADD CONSTRAINT "drive_plants_drive_id_fkey" FOREIGN KEY ("drive_id") REFERENCES "drives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_plant_sponsorships" ADD CONSTRAINT "drive_plant_sponsorships_drive_plant_id_fkey" FOREIGN KEY ("drive_plant_id") REFERENCES "drive_plants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_plant_sponsorships" ADD CONSTRAINT "drive_plant_sponsorships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
