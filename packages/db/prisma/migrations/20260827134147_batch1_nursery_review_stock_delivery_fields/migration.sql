-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'order_review';

-- AlterTable
ALTER TABLE "nursery_profiles" ADD COLUMN     "cover_photo_url" TEXT,
ADD COLUMN     "delivery_radius_km" INTEGER,
ADD COLUMN     "follow_policy" "FollowPolicy" NOT NULL DEFAULT 'open',
ADD COLUMN     "offers_delivery" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "order_reviews" ADD COLUMN     "nursery_responded_at" TIMESTAMP(3),
ADD COLUMN     "nursery_response" TEXT;

-- AlterTable
ALTER TABLE "sapling_stock" ADD COLUMN     "photo_url" TEXT;
