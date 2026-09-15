-- CreateEnum
CREATE TYPE "NurseryType" AS ENUM ('retail', 'wholesale', 'native_plant', 'government', 'ngo_community', 'landscaping', 'other');

-- AlterTable
ALTER TABLE "nursery_profiles" ADD COLUMN     "approx_plant_count" TEXT,
ADD COLUMN     "bulk_supply" BOOLEAN,
ADD COLUMN     "business_registration_number" TEXT,
ADD COLUMN     "government_nursery_id" TEXT,
ADD COLUMN     "gstin" TEXT,
ADD COLUMN     "ngo_registration_number" TEXT,
ADD COLUMN     "nursery_type" "NurseryType",
ADD COLUMN     "plant_categories" TEXT[],
ADD COLUMN     "responsible_person_name" TEXT,
ADD COLUMN     "responsible_person_phone" TEXT,
ADD COLUMN     "responsible_person_role" TEXT,
ADD COLUMN     "seasonal_availability" BOOLEAN,
ADD COLUMN     "trade_license_number" TEXT,
ADD COLUMN     "verification_photo_url" TEXT,
ADD COLUMN     "website_url" TEXT,
ADD COLUMN     "year_established" INTEGER;
